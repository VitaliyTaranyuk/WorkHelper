#!/usr/bin/env bash
# Одностраничник Voice на https://<host>/voice/ (config as code, тот же контракт,
# что у apply-nginx-cache.sh и apply-nginx-ws.sh): эталон — infra/nginx-vds.conf
# из репозитория, ручные правки прод-nginx не используются.
#
# Зачем отдельный корень /var/www/voice-landing, а не подкаталог веб-корня:
# выкладка фронтенда делает `rm -rf "$root"/*` (см. deploy.yml), и страница,
# лежащая внутри /var/www/workhelper, исчезла бы при первом же деплое.
#
# Две операции, обе идемпотентные:
#  1) файлы страницы из репозитория → /var/www/voice-landing;
#  2) блоки `location = /voice` (редирект без слеша) и `location /voice/`
#     (alias на этот корень) — перед КАЖДОЙ `location /work-task/`: в файле
#     бывает несколько server-блоков, и вставка только в первый оставила бы
#     рабочий :443 без страницы (та же грабля, что в apply-nginx-cache.sh).
#
# Свойства: бэкап → правка → nginx -t → reload → post-check по живому адресу →
# автооткат при любом провале. Аудит-след в /var/log/workhelper-nginx-voice.log.
set -u

MARKER='location /voice/'
AUDIT_LOG="/var/log/workhelper-nginx-voice.log"
REPO_DIR="${REPO_DIR:-/opt/workhelper}"
PUBLIC_HOST="${PUBLIC_HOST:-wowoffcata.hlab.kz}"
SRC_DIR="$REPO_DIR/infra/voice-landing"
WEB_DIR="/var/www/voice-landing"

log() { echo "[apply-nginx-voice-landing] $*"; }
fetch() { curl -sS --max-time 10 --resolve "$PUBLIC_HOST:443:127.0.0.1" -k "https://$PUBLIC_HOST$1"; }
fetch_head() { curl -sSI --max-time 10 --resolve "$PUBLIC_HOST:443:127.0.0.1" -k "https://$PUBLIC_HOST$1"; }
audit() {
  echo "$(date -Is) commit=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo '?') $*" \
    >> "$AUDIT_LOG" 2>/dev/null || true
}

# --- 1. Файлы страницы ------------------------------------------------------
if [ ! -f "$SRC_DIR/index.html" ]; then
  log "ERROR: нет $SRC_DIR/index.html — на сервере старый коммит?"
  exit 1
fi

mkdir -p "$WEB_DIR" || { log "ERROR: не создан $WEB_DIR"; exit 1; }
# Содержимое подменяется целиком: страница статическая, частичных состояний
# быть не должно. Каталог не удаляется — nginx держит его в alias.
rm -rf "$WEB_DIR"/* 2>/dev/null || true
cp -r "$SRC_DIR"/. "$WEB_DIR"/ || { log "ERROR: копирование в $WEB_DIR не удалось"; exit 1; }
# nginx работает под своим пользователем: каталоги должны быть проходимы, файлы
# читаемы. Без этого получается 403 при формально верном конфиге.
chmod -R a+rX "$WEB_DIR"
log "страница выложена в $WEB_DIR ($(find "$WEB_DIR" -type f | wc -l) файлов)"

# --- 2. Эталонные блоки из репозитория --------------------------------------
VOICE_BLOCK="$(awk '/# Одностраничник Voice \(применяется/{f=1} f{print} f && /index index\.html;/{d=1} d && /^    }$/{exit}' \
  "$REPO_DIR/infra/nginx-vds.conf")"
if ! echo "$VOICE_BLOCK" | grep -q "alias $WEB_DIR/;"; then
  log "ERROR: эталонные блоки /voice/ не найдены в infra/nginx-vds.conf"
  exit 1
fi

mapfile -t FILES < <(grep -rls "server_name[^;]*${PUBLIC_HOST%%.*}" /etc/nginx 2>/dev/null \
  | grep -v -e '\.bak' -e '~$' | sort -u)
if [ ${#FILES[@]} -eq 0 ]; then
  log "ERROR: nginx-конфиг $PUBLIC_HOST не найден"
  exit 1
fi
log "найдено конфигов: ${#FILES[@]} (${FILES[*]})"

CHANGED=0
for f in "${FILES[@]}"; do
  if grep -qF "$MARKER" "$f"; then
    log "$f: блоки /voice/ уже есть — пропуск (идемпотентность)"
    continue
  fi
  cp "$f" "$f.bak-voice" || { log "ERROR: бэкап $f не создан"; exit 1; }
  VOICE_BLOCK="$VOICE_BLOCK" python3 - "$f" <<'PYEOF'
import io, os, re, sys, textwrap

path = sys.argv[1]
block = textwrap.dedent(os.environ["VOICE_BLOCK"]).strip("\n")
with io.open(path, encoding="utf-8") as fh:
    text = fh.read()

anchor = re.compile(r"^([ \t]*)location\s+/work-task/\s*\{", re.M)
if not anchor.search(text):
    raise SystemExit(f"не найден якорь 'location /work-task/' в {path}")


def repl(m):
    indent = m.group(1)
    indented = "\n".join(
        indent + line if line.strip() else line for line in block.splitlines()
    )
    return indented + "\n\n" + m.group(0)


text = anchor.sub(repl, text)
with io.open(path, "w", encoding="utf-8") as fh:
    fh.write(text)
print(f"обновлён {path}")
PYEOF
  if [ $? -ne 0 ]; then
    cp "$f.bak-voice" "$f"
    log "ERROR: правка $f не удалась — откат"
    audit "FAIL edit $f (rolled back)"
    exit 1
  fi
  CHANGED=1
done

rollback_all() {
  for f in "${FILES[@]}"; do
    [ -f "$f.bak-voice" ] && cp "$f.bak-voice" "$f"
  done
  nginx -s reload 2>/dev/null || true
}

if [ "$CHANGED" -eq 1 ]; then
  if ! nginx -t; then
    rollback_all
    log "ERROR: nginx -t провален — конфиги откатаны"
    audit "FAIL nginx -t (rolled back)"
    exit 1
  fi
  nginx -s reload
  log "nginx перезагружен (reload)"
  # Воркеры после reload подменяются асинхронно — первые запросы может обслужить
  # ещё старый воркер (та же причина ожидания, что в apply-nginx-cache.sh).
  for _ in $(seq 1 15); do
    fetch /voice/ | grep -q 'releases/latest' && { log "новый конфиг отвечает"; break; }
    sleep 1
  done
fi

# --- 3. Post-check ----------------------------------------------------------
# Проверяется не код ответа, а содержимое: при `try_files … /index.html` в
# родительском location nginx отдал бы оболочку WorkHelper с кодом 200, и
# проверка «200 OK» ничего бы не доказала (ровно этим и был плох прежний
# post-check деплоя, см. комментарий в deploy.yml).
PAGE="$(fetch /voice/)"
SLASHLESS="$(fetch_head /voice)"
MAIN_OK="$(fetch / | grep -c 'id="root"')"

if echo "$PAGE" | grep -q 'releases/latest' \
  && echo "$PAGE" | grep -q 'Voice' \
  && echo "$SLASHLESS" | grep -qE '30[12]' \
  && [ "$MAIN_OK" -ge 1 ]; then
  log "post-check OK: /voice/ отдаёт страницу, /voice редиректит, основной сайт цел"
  audit "OK applied (changed=$CHANGED)"
else
  log "GET /voice/ (первые 200 символов): $(echo "$PAGE" | head -c 200 | tr '\n' ' ')"
  log "HEAD /voice :                     $(echo "$SLASHLESS" | tr -d '\r' | tr '\n' ' ')"
  log "основной сайт отдаёт id=root:     $MAIN_OK"
  if [ "$CHANGED" -eq 1 ]; then
    rollback_all
    log "ERROR: post-check не прошёл — конфиги откатаны"
    audit "FAIL post-check (rolled back)"
    exit 1
  fi
  log "WARNING: страница не отвечает при неизменённом конфиге"
  audit "WARN post-check without changes"
  exit 1
fi

log "DONE"
