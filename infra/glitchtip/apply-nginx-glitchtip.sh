#!/usr/bin/env bash
# ТП-175: nginx-маршрутизация мониторинга ошибок (config as code, паттерн ТП-181).
# Запускается пайплайном деплоя ПОСЛЕ git pull. Делает две вещи:
#   1) ingest-локация в существующие server-блоки домена: Sentry-протокол
#      (/api/<id>/envelope|store|security/) → GlitchTip (127.0.0.1:8090).
#      Ingest живёт на основном 443 — события доходят из любых сетей;
#   2) отдельный server-блок :8443 (тот же TLS-сертификат) → UI GlitchTip.
# Свойства: идемпотентно; бэкап; nginx -t; reload (не restart); автооткат;
# post-check обоих маршрутов; аудит-след.
set -u

INGEST_MARKER="location ~ ^/api/[0-9]"
UI_MARKER="# glitchtip-ui-server (TP-175)"
AUDIT_LOG="/var/log/workhelper-nginx-glitchtip.log"
REPO_DIR="${REPO_DIR:-/opt/workhelper}"

log() { echo "[apply-nginx-glitchtip] $*"; }
audit() {
  echo "$(date -Is) commit=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo '?') $*" >> "$AUDIT_LOG" 2>/dev/null || true
}

read -r -d '' INGEST_BLOCK <<'EOF'
# Мониторинг клиентских ошибок (ТП-175): ingest Sentry-протокола → GlitchTip.
# Только event-пути: UI мониторинга живёт на :8443, здесь события/сорсмапы.
location ~ ^/api/[0-9]+/(envelope|store|security)/ {
    proxy_pass         http://127.0.0.1:8090;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    client_max_body_size 20M;
    proxy_read_timeout 30s;
    proxy_connect_timeout 5s;
}
EOF

mapfile -t FILES < <(grep -rls "server_name[^;]*wowoffcata" /etc/nginx 2>/dev/null \
  | grep -v -e '\.bak' -e '~$' | sort -u)
if [ ${#FILES[@]} -eq 0 ]; then
  log "ERROR: nginx-конфиг wowoffcata не найден"
  exit 1
fi
log "найдено конфигов: ${#FILES[@]} (${FILES[*]})"

CHANGED=0
for f in "${FILES[@]}"; do
  cp "$f" "$f.bak-glitchtip" || { log "ERROR: бэкап $f не создан"; exit 1; }

  # --- 1. ingest-локация перед каждой location /work-task/ ---------------
  if grep -q "$INGEST_MARKER" "$f"; then
    log "$f: ingest-локация уже есть — пропуск"
  else
    INGEST_BLOCK="$INGEST_BLOCK" python3 - "$f" <<'PYEOF'
import io, os, re, sys
path = sys.argv[1]
block = os.environ["INGEST_BLOCK"].strip("\n")
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
text = pattern.sub(repl, text)
with io.open(path, "w", encoding="utf-8") as fh:
    fh.write(text)
print(f"ingest inserted into {path} ({len(matches)} block(s))")
PYEOF
    if [ $? -ne 0 ]; then
      cp "$f.bak-glitchtip" "$f"
      log "ERROR: вставка ingest в $f не удалась — откат"
      audit "FAIL ingest insert $f (rolled back)"
      exit 1
    fi
    CHANGED=1
  fi

  # --- 2. server-блок :8443 (UI) — в конец файла --------------------------
  if grep -q "$UI_MARKER" "$f"; then
    log "$f: UI-server :8443 уже есть — пропуск"
  else
    CERT=$(grep -Eh '^\s*ssl_certificate\s' "$f" | head -1 | awk '{print $2}' | tr -d ';')
    CERT_KEY=$(grep -Eh '^\s*ssl_certificate_key\s' "$f" | head -1 | awk '{print $2}' | tr -d ';')
    if [ -z "$CERT" ] || [ -z "$CERT_KEY" ]; then
      log "WARNING: $f без ssl_certificate — UI-server :8443 не добавлен (ingest работает)"
    else
      cat >> "$f" <<EOF

$UI_MARKER
# UI мониторинга ошибок (ТП-175): GlitchTip целиком на отдельном порту с тем
# же сертификатом домена. Ingest-события идут через основной 443 (локация выше).
server {
    listen 8443 ssl;
    server_name wowoffcata.hlab.kz;
    ssl_certificate $CERT;
    ssl_certificate_key $CERT_KEY;
    client_max_body_size 100M;

    location / {
        proxy_pass         http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 5s;
    }
}
EOF
      log "$f: добавлен UI-server :8443 (cert: $CERT)"
      CHANGED=1
    fi
  fi
done

rollback_all() {
  for f in "${FILES[@]}"; do
    [ -f "$f.bak-glitchtip" ] && cp "$f.bak-glitchtip" "$f"
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

# --- Post-check ingest: envelope-путь должен уйти в GlitchTip, а не в SPA.
# GET к GlitchTip даёт 405/401/400 (метод/аутентификация), SPA отдала бы
# 200 text/html; 502/504 = локация работает, но сам GlitchTip лежит.
# При лежащем GlitchTip конфиг не откатываем: локация валидна и безвредна
# (путь /api/N/envelope/ SPA не использует), а откат зациклил бы применение —
# прогон №1 показал именно этот сценарий (образ не спуллился → 8090 мёртв).
GT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://127.0.0.1:8090/_health/")
CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -k \
  --resolve "wowoffcata.hlab.kz:443:127.0.0.1" \
  "https://wowoffcata.hlab.kz/api/1/envelope/")
if [ "$CODE" = "405" ] || [ "$CODE" = "401" ] || [ "$CODE" = "400" ] || [ "$CODE" = "403" ]; then
  log "post-check ingest OK (HTTP $CODE от GlitchTip)"
elif [ "$GT_CODE" != "200" ] && { [ "$CODE" = "502" ] || [ "$CODE" = "504" ]; }; then
  log "WARNING: локация применена, но GlitchTip лежит (health $GT_CODE, ingest $CODE) — конфиг оставлен, поднять glitchtip-web"
  audit "WARN applied, glitchtip down (health $GT_CODE ingest $CODE)"
else
  log "диагностика: glitchtip health=$GT_CODE; локации /api в конфигах:"
  grep -n 'location ~ \^/api' "${FILES[@]}" 2>/dev/null || log "  (локация ingest НЕ найдена в конфигах)"
  if [ "$CHANGED" -eq 1 ]; then
    rollback_all
    log "ERROR: post-check ingest дал HTTP $CODE — откат"
    audit "FAIL post-check ingest HTTP $CODE (rolled back)"
    exit 1
  fi
  log "WARNING: post-check ingest HTTP $CODE при неизменённом конфиге"
  audit "WARN post-check ingest HTTP $CODE (no changes)"
  exit 1
fi

# --- Post-check UI :8443 (если блок добавлялся; недоступность UI не критична
# для сбора ошибок, поэтому только предупреждение без отката).
CODE_UI=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -k \
  --resolve "wowoffcata.hlab.kz:8443:127.0.0.1" \
  "https://wowoffcata.hlab.kz:8443/_health/")
if [ "$CODE_UI" = "200" ]; then
  log "post-check UI OK (:8443 /_health/ = 200)"
else
  log "WARNING: UI post-check HTTP $CODE_UI — проверить glitchtip-web/порт 8443"
fi

audit "OK applied (ingest=$CODE ui=$CODE_UI changed=$CHANGED)"
log "DONE"
