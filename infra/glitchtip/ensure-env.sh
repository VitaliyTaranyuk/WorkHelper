#!/usr/bin/env bash
# ТП-175: подготовка секретов мониторинга (config as code, паттерн ТП-181).
# Запускается пайплайном деплоя на VDS ПЕРЕД docker compose up. Идемпотентно:
# существующие значения не перегенерируются (иначе бы инвалидировались DSN,
# сессии GlitchTip и вебхук-токен). Секреты живут только на сервере — в
# репозиторий не попадают (SECURITY: Secrets discipline).
set -u

REPO_DIR="${REPO_DIR:-/opt/workhelper}"
GT_ENV="$REPO_DIR/.env.glitchtip"
VDS_ENV="$REPO_DIR/.env.vds"
DOMAIN="wowoffcata.hlab.kz"

log() { echo "[glitchtip-env] $*"; }

rand() { openssl rand -hex 24; }

# --- .env.glitchtip -----------------------------------------------------
if [ ! -f "$GT_ENV" ]; then
  PG_PASS="$(rand)"
  cat > "$GT_ENV" <<EOF
# GlitchTip (ТП-175). Файл сгенерирован ensure-env.sh — вне git.
SECRET_KEY=$(rand)
POSTGRES_PASSWORD=$PG_PASS
DATABASE_URL=postgres://glitchtip:$PG_PASS@glitchtip-postgres:5432/glitchtip
REDIS_URL=redis://glitchtip-redis:6379/0
# UI живёт на :8443 (тот же TLS-сертификат домена); ingest фронт шлёт на :443.
GLITCHTIP_DOMAIN=https://$DOMAIN:8443
DEFAULT_FROM_EMAIL=glitchtip@$DOMAIN
# SMTP на VDS нет: письма в stdout контейнера, алерты идут вебхуком в WorkTask.
EMAIL_URL=consolemail://
ENABLE_USER_REGISTRATION=False
ENABLE_ORGANIZATION_CREATION=False
GLITCHTIP_MAX_EVENT_LIFE_DAYS=90
CELERY_WORKER_AUTOSCALE=1,3
# Первичный админ (bootstrap.py создаёт при первом прогоне)
GLITCHTIP_ADMIN_EMAIL=admin@$DOMAIN
GLITCHTIP_ADMIN_PASSWORD=$(rand)
EOF
  chmod 600 "$GT_ENV"
  log "создан $GT_ENV"
else
  log "$GT_ENV уже существует — не трогаю (идемпотентность)"
fi

# --- вебхук-токен алертов в .env.vds (backend) --------------------------
if [ -f "$VDS_ENV" ] && grep -q '^MONITORING_WEBHOOK_TOKEN=' "$VDS_ENV"; then
  log "MONITORING_WEBHOOK_TOKEN уже задан в .env.vds"
else
  {
    echo ""
    echo "# ТП-175: приём алертов мониторинга (сгенерировано ensure-env.sh)"
    echo "MONITORING_WEBHOOK_TOKEN=$(rand)"
  } >> "$VDS_ENV"
  log "MONITORING_WEBHOOK_TOKEN добавлен в .env.vds"
fi

if [ -f "$VDS_ENV" ] && grep -q '^MONITORING_PROJECT_ID=' "$VDS_ENV"; then
  log "MONITORING_PROJECT_ID уже задан в .env.vds"
else
  # Продуктовый проект WorkTask: его участники получают алерты в колокольчик.
  echo "MONITORING_PROJECT_ID=17565a09-5b2d-4edd-acf0-d69b3ce57b9d" >> "$VDS_ENV"
  log "MONITORING_PROJECT_ID добавлен в .env.vds"
fi

log "DONE"
