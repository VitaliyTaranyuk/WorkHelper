#!/usr/bin/env bash
# ТП-181: применение nginx-локации WebSocket-сигналинга Meet (config as code).
# Запускается ПАЙПЛАЙНОМ деплоя на VDS ПОСЛЕ git pull (скрипт и конфиг приезжают
# из репозитория — ручные правки сервера устранены как класс).
#
# Свойства (мандат ТП-181):
#  - идемпотентно: блок уже есть → no-op, повторный запуск безопасен;
#  - бэкап → вставка → nginx -t → reload (НЕ restart: активные звонки живут);
#  - автооткат: провал nginx -t или post-check возвращает бэкап и reload;
#  - post-check: хендшейк-запрос с Upgrade-заголовками через nginx обязан
#    дойти до backend (401 без токена = прокси жив; 404/5xx = откат);
#  - аудит-след: строка в /var/log/workhelper-nginx-ws.log (кто/когда/коммит).
set -u

MARKER="location /work-task/ws/"
AUDIT_LOG="/var/log/workhelper-nginx-ws.log"
REPO_DIR="${REPO_DIR:-/opt/workhelper}"

log() { echo "[apply-nginx-ws] $*"; }
audit() {
  echo "$(date -Is) commit=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo '?') $*" >> "$AUDIT_LOG" 2>/dev/null || true
}

# Эталонный блок — единственный источник: infra/nginx-vds.conf из репозитория.
extract_block() {
  awk '/# WebSocket \(сигналинг WorkTask Meet\)/,/^    }$/' "$REPO_DIR/infra/nginx-vds.conf"
}

WS_BLOCK="$(extract_block)"
if [ -z "$WS_BLOCK" ]; then
  log "ERROR: эталонный блок не найден в infra/nginx-vds.conf"
  exit 1
fi

# Все server-блоки wowoffcata (http:80 и https:443 от certbot)
mapfile -t FILES < <(grep -rl "server_name wowoffcata" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | sort -u)
if [ ${#FILES[@]} -eq 0 ]; then
  log "ERROR: nginx-конфиг wowoffcata не найден"
  exit 1
fi

CHANGED=0
for f in "${FILES[@]}"; do
  if grep -q "$MARKER" "$f"; then
    log "$f: локация уже есть — пропуск (идемпотентность)"
    continue
  fi
  cp "$f" "$f.bak-ws" || { log "ERROR: бэкап $f не создан"; exit 1; }
  # Вставка блока перед КАЖДОЙ "location /work-task/ {" (python3 есть на VDS)
  WS_BLOCK="$WS_BLOCK" python3 - "$f" <<'PYEOF'
import io, os, sys
path = sys.argv[1]
block = os.environ["WS_BLOCK"].rstrip() + "\n"
with io.open(path, encoding="utf-8") as fh:
    text = fh.read()
target = "    location /work-task/ {"
if target not in text:
    raise SystemExit(f"marker 'location /work-task/' not found in {path}")
text = text.replace(target, block + "\n" + target)
with io.open(path, "w", encoding="utf-8") as fh:
    fh.write(text)
print(f"inserted into {path}")
PYEOF
  if [ $? -ne 0 ]; then
    cp "$f.bak-ws" "$f"
    log "ERROR: вставка в $f не удалась — откат"
    audit "FAIL insert $f (rolled back)"
    exit 1
  fi
  CHANGED=1
done

rollback_all() {
  for f in "${FILES[@]}"; do
    [ -f "$f.bak-ws" ] && cp "$f.bak-ws" "$f"
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
  log "nginx перезагружен (reload, без разрыва соединений)"
fi

# Post-check: хендшейк с Upgrade-заголовками через nginx должен дойти до
# backend-интерцептора. Без валидного JWT ожидаем 400/401 ОТ BACKEND
# (значит прокси и upgrade-путь живы). 404/5xx = проксирование сломано.
CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "http://127.0.0.1/work-task/ws/meet?room=probe&token=probe")
if [ "$CODE" = "401" ] || [ "$CODE" = "400" ] || [ "$CODE" = "101" ]; then
  log "post-check OK: nginx проксирует WS-путь на backend (HTTP $CODE)"
  audit "OK applied (post-check HTTP $CODE, changed=$CHANGED)"
else
  if [ "$CHANGED" -eq 1 ]; then
    rollback_all
    log "ERROR: post-check дал HTTP $CODE — конфиги откатаны"
    audit "FAIL post-check HTTP $CODE (rolled back)"
    exit 1
  fi
  log "WARNING: post-check дал HTTP $CODE при неизменённом конфиге — проверить вручную (runbook)"
  audit "WARN post-check HTTP $CODE (no changes made)"
  exit 1
fi

log "DONE"
