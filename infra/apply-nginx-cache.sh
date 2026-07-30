#!/usr/bin/env bash
# Кэш-заголовки статики (config as code, тот же контракт, что у
# apply-nginx-ws.sh): эталон — infra/nginx-vds.conf из репозитория, ручные
# правки прод-nginx не используются.
#
# Зачем: измерено на проде — `/` и `/assets/*` отдавались БЕЗ Cache-Control.
# Браузер кэшировал оболочку SPA по эвристике и после деплоя продолжал грузить
# прежний бандл до жёсткой перезагрузки, а файлы с хешем в имени, наоборот,
# перезапрашивались каждый раз.
#
# Две операции, обе идемпотентные:
#  1) `add_header Cache-Control "no-cache"` внутрь существующего `location /`
#     — именно он отдаёт оболочку по фолбэку try_files для ЛЮБОГО маршрута
#     (/main, /project/…/board). Отдельная `location = /index.html` не годится:
#     на проде она не подхватывалась (прогон #30558012673, откат по post-check);
#  2) отдельный блок `location /assets/` с длинным кэшем.
#
# Свойства: бэкап → правка → nginx -t → reload → post-check по заголовкам →
# автооткат при любом провале. Аудит-след в /var/log/workhelper-nginx-cache.log.
set -u

MARKER='Cache-Control "no-cache"'
AUDIT_LOG="/var/log/workhelper-nginx-cache.log"
REPO_DIR="${REPO_DIR:-/opt/workhelper}"
PUBLIC_HOST="${PUBLIC_HOST:-wowoffcata.hlab.kz}"

log() { echo "[apply-nginx-cache] $*"; }
# Пробуем рабочий :443-блок изнутри сервера (тот же путь, что у apply-nginx-ws).
fetch_headers() {
  curl -sSI --max-time 10 --resolve "$PUBLIC_HOST:443:127.0.0.1" -k "https://$PUBLIC_HOST$1"
}
audit() {
  echo "$(date -Is) commit=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo '?') $*" \
    >> "$AUDIT_LOG" 2>/dev/null || true
}

# Эталонный блок /assets/ — единственный источник: infra/nginx-vds.conf.
ASSETS_BLOCK="$(awk '/# Кэширование хешированной статики/{f=1} f{print} f && /immutable/{d=1} d && /^    }$/{exit}' \
  "$REPO_DIR/infra/nginx-vds.conf")"
if ! echo "$ASSETS_BLOCK" | grep -q "immutable"; then
  log "ERROR: эталонный блок /assets/ не найден в infra/nginx-vds.conf"
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
  if grep -q "$MARKER" "$f"; then
    log "$f: заголовки уже настроены — пропуск (идемпотентность)"
    continue
  fi
  cp "$f" "$f.bak-cache" || { log "ERROR: бэкап $f не создан"; exit 1; }
  ASSETS_BLOCK="$ASSETS_BLOCK" python3 - "$f" <<'PYEOF'
import io, os, re, sys, textwrap

path = sys.argv[1]
block = textwrap.dedent(os.environ["ASSETS_BLOCK"]).strip("\n")
with io.open(path, encoding="utf-8") as fh:
    text = fh.read()

# 1. Заголовок оболочки — на уровень server-блока, прямо перед `location /`
#    с SPA-фолбэком. Внутри самого location он до ответа не доезжает: `/`
#    обслуживается через внутренний редирект index-модуля (проверено на проде).
#    Позиция «строкой выше location» гарантирует, что директива окажется
#    ИМЕННО в том server-блоке, где живёт SPA, — а не в редиректе :80 и не в
#    блоке GlitchTip на :8443.
shell = re.compile(
    r"^([ \t]*)location\s+/\s*\{\s*\n([ \t]*)try_files\s+\$uri\s+\$uri/\s+/index\.html;",
    re.M,
)
if not shell.search(text):
    raise SystemExit(f"не найден блок SPA-фолбэка в {path}")
root_block = (
    'add_header Cache-Control "no-cache";\n\n'
    "# `/` переписывается в /index.html до подбора location: при обслуживании\n"
    "# index-модулем заголовок до ответа не доезжает (измерено на проде).\n"
    "rewrite ^/$ /index.html last;\n\n"
)
text = shell.sub(
    lambda m: "\n".join(
        m.group(1) + line if line.strip() else line for line in root_block.splitlines()
    )
    + "\n"
    + m.group(0),
    text,
)

# 2. Блок /assets/ — перед КАЖДОЙ `location /work-task/ {`: в файле бывает
#    несколько server-блоков (:80 от certbot и рабочий :443), и вставка только
#    в первый оставляла рабочий без заголовков.
anchor = re.compile(r"^([ \t]*)location\s+/work-task/\s*\{", re.M)
if not anchor.search(text):
    raise SystemExit(f"не найден якорь 'location /work-task/' в {path}")
def repl(m):
    indent = m.group(1)
    indented = "\n".join(indent + line if line.strip() else line
                         for line in block.splitlines())
    return indented + "\n\n" + m.group(0)
text = anchor.sub(repl, text)

with io.open(path, "w", encoding="utf-8") as fh:
    fh.write(text)
print(f"обновлён {path}")
PYEOF
  if [ $? -ne 0 ]; then
    cp "$f.bak-cache" "$f"
    log "ERROR: правка $f не удалась — откат"
    audit "FAIL edit $f (rolled back)"
    exit 1
  fi
  CHANGED=1
done

rollback_all() {
  for f in "${FILES[@]}"; do
    [ -f "$f.bak-cache" ] && cp "$f.bak-cache" "$f"
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
  # Воркеры после reload подменяются АСИНХРОННО: первые запросы может
  # обслужить ещё старый воркер со старым конфигом. Пять прогонов подряд
  # «доказывали», что заголовок на / не появляется, — на самом деле / просто
  # пробовался первым, через доли секунды после reload, а остальные пути
  # секундой позже и заголовок уже имели. Ждём, пока новый конфиг реально
  # начнёт отвечать.
  for _ in $(seq 1 15); do
    if fetch_headers / | grep -qi "^Cache-Control:"; then
      log "новый конфиг отвечает"
      break
    fi
    sleep 1
  done
fi

# Post-check: заголовки обязаны появиться на РАБОЧЕМ адресе, сайт — отвечать 200.
INDEX_HEADERS="$(fetch_headers /)"
ASSET_PATH="$(curl -sS --max-time 10 --resolve "$PUBLIC_HOST:443:127.0.0.1" -k "https://$PUBLIC_HOST/" \
  | grep -oE '/assets/index-[^"]+\.js' | head -1)"
ASSET_HEADERS=""
[ -n "$ASSET_PATH" ] && ASSET_HEADERS="$(fetch_headers "$ASSET_PATH")"

# Глубокая ссылка проверяется наравне с корнем: оболочку для /main отдаёт
# фолбэк try_files, и это ровно тот путь, по которому пользователь возвращается
# в приложение после деплоя.
DEEP_HEADERS="$(fetch_headers /main)"

if echo "$INDEX_HEADERS" | grep -qi "^Cache-Control:.*no-cache" \
  && echo "$INDEX_HEADERS" | grep -q "200" \
  && echo "$DEEP_HEADERS" | grep -qi "^Cache-Control:.*no-cache" \
  && echo "$ASSET_HEADERS" | grep -qi "immutable"; then
  log "post-check OK: / и /main — no-cache, ассет — immutable, сайт отвечает 200"
  audit "OK applied (changed=$CHANGED)"
else
  log "GET / :            $(echo "$INDEX_HEADERS" | tr -d '\r' | tr '\n' ' ')"
  log "GET /index.html :  $(fetch_headers /index.html | tr -d '\r' | tr '\n' ' ')"
  log "GET /favicon.ico : $(fetch_headers /favicon.ico | tr -d '\r' | tr '\n' ' ')"
  log "GET $ASSET_PATH : $(echo "$ASSET_HEADERS" | tr -d '\r' | tr '\n' ' ')"
  # Диагностика: ПОЛНЫЙ первый server-блок — по скелету из grep причину
  # трижды определить не удалось, нужен текст целиком.
  for f in "${FILES[@]}"; do
    log "--- $f (первый server-блок целиком) ---"
    awk '/^server \{/{n++} n==1{print NR": "$0} n==1 && /^}/{exit}' "$f"
  done
  if [ "$CHANGED" -eq 1 ]; then
    rollback_all
    log "ERROR: post-check не прошёл — конфиги откатаны"
    audit "FAIL post-check (rolled back)"
    exit 1
  fi
  log "WARNING: заголовков нет при неизменённом конфиге"
  audit "WARN post-check without changes"
  exit 1
fi

log "DONE"
