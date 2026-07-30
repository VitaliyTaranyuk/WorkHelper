#!/usr/bin/env bash
# Кэш-заголовки статики (config as code, тот же контракт, что у
# apply-nginx-ws.sh): эталон — infra/nginx-vds.conf из репозитория, ручные
# правки прод-nginx не используются.
#
# Зачем: измерено на проде — `/` и `/assets/*` отдавались БЕЗ Cache-Control.
# Браузер кэшировал index.html по эвристике и после деплоя продолжал грузить
# прежний бандл до жёсткой перезагрузки, а файлы с хешем в имени, наоборот,
# перезапрашивались каждый раз.
#
# Свойства:
#  - идемпотентно: блоки уже есть → no-op;
#  - бэкап → вставка → nginx -t → reload → post-check по заголовкам;
#  - автооткат при провале nginx -t или post-check;
#  - аудит-след в /var/log/workhelper-nginx-cache.log.
set -u

MARKER="location = /index.html"
AUDIT_LOG="/var/log/workhelper-nginx-cache.log"
REPO_DIR="${REPO_DIR:-/opt/workhelper}"
PUBLIC_HOST="${PUBLIC_HOST:-wowoffcata.hlab.kz}"

log() { echo "[apply-nginx-cache] $*"; }
audit() {
  echo "$(date -Is) commit=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo '?') $*" \
    >> "$AUDIT_LOG" 2>/dev/null || true
}

# Эталонный блок — единственный источник: infra/nginx-vds.conf.
CACHE_BLOCK="$(awk '/# Кэширование статики/{f=1} f{print} f && /immutable/{done=1} done && /^    }$/{exit}' \
  "$REPO_DIR/infra/nginx-vds.conf")"
if [ -z "$CACHE_BLOCK" ] || ! echo "$CACHE_BLOCK" | grep -q "immutable"; then
  log "ERROR: эталонный блок не найден в infra/nginx-vds.conf"
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
    log "$f: блок уже есть — пропуск (идемпотентность)"
    continue
  fi
  cp "$f" "$f.bak-cache" || { log "ERROR: бэкап $f не создан"; exit 1; }
  # Вставка перед `location /work-task/ {` — якорь есть в каждом рабочем
  # server-блоке (через него проксируется API), отступ берётся из файла.
  CACHE_BLOCK="$CACHE_BLOCK" python3 - "$f" <<'PYEOF'
import io, os, re, sys, textwrap
path = sys.argv[1]
block = textwrap.dedent(os.environ["CACHE_BLOCK"]).strip("\n")
with io.open(path, encoding="utf-8") as fh:
    text = fh.read()
pattern = re.compile(r"^([ \t]*)location\s+/work-task/\s*\{", re.M)
matches = list(pattern.finditer(text))
if not matches:
    raise SystemExit(f"marker 'location /work-task/' not found in {path}")
def repl(m):
    indent = m.group(1)
    indented = "\n".join(indent + line if line.strip() else line
                         for line in block.splitlines())
    return indented + "\n\n" + m.group(0)
text = pattern.sub(repl, text, count=1)
with io.open(path, "w", encoding="utf-8") as fh:
    fh.write(text)
print(f"inserted into {path}")
PYEOF
  if [ $? -ne 0 ]; then
    cp "$f.bak-cache" "$f"
    log "ERROR: вставка в $f не удалась — откат"
    audit "FAIL insert $f (rolled back)"
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
fi

# Post-check: заголовки обязаны появиться, а сайт — остаться живым.
headers() { curl -sSI --max-time 10 --resolve "$PUBLIC_HOST:443:127.0.0.1" -k "https://$PUBLIC_HOST$1"; }
INDEX_HEADERS="$(headers /)"
ASSET_PATH="$(curl -sS --max-time 10 --resolve "$PUBLIC_HOST:443:127.0.0.1" -k "https://$PUBLIC_HOST/" \
  | grep -oE '/assets/index-[^"]+\.js' | head -1)"
ASSET_HEADERS="$([ -n "$ASSET_PATH" ] && headers "$ASSET_PATH")"

ok_index=$(echo "$INDEX_HEADERS" | grep -ci "^Cache-Control: no-cache" || true)
ok_asset=$(echo "$ASSET_HEADERS" | grep -ci "immutable" || true)
ok_status=$(echo "$INDEX_HEADERS" | grep -c "200" || true)

if [ "$ok_index" -ge 1 ] && [ "$ok_asset" -ge 1 ] && [ "$ok_status" -ge 1 ]; then
  log "post-check OK: index.html no-cache, ассет immutable, сайт отвечает 200"
  audit "OK applied (changed=$CHANGED)"
else
  if [ "$CHANGED" -eq 1 ]; then
    rollback_all
    log "ERROR: post-check не прошёл — конфиги откатаны"
    log "index: $(echo "$INDEX_HEADERS" | tr -d '\r' | head -5 | tr '\n' ' ')"
    audit "FAIL post-check (rolled back)"
    exit 1
  fi
  log "WARNING: заголовков нет при неизменённом конфиге — проверить вручную"
  audit "WARN post-check without changes"
  exit 1
fi

log "DONE"
