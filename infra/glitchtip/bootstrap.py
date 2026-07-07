# ТП-175: идемпотентный bootstrap GlitchTip (выполняется в django shell
# контейнера glitchtip-web пайплайном деплоя):
#   1) суперпользователь-админ (креды из .env.glitchtip);
#   2) организация worktask + проект work-task-frontend (+ DSN-ключ);
#   3) API-токен для заливки source maps при сборке фронтенда;
#   4) алерт-правила (новые ошибки / всплеск) с вебхуком в WorkTask.
# Результаты пишутся в /code/bootstrap-out/ (маппится на хост) построчно:
#   dsn, token — файлы читает деплой-пайплайн.
# Повторный запуск ничего не дублирует. Диагностика — в stdout.
import os
import secrets
import sys

OUT_DIR = os.environ.get("BOOTSTRAP_OUT", "/tmp/bootstrap-out")
os.makedirs(OUT_DIR, exist_ok=True)

ADMIN_EMAIL = os.environ["GLITCHTIP_ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["GLITCHTIP_ADMIN_PASSWORD"]
ORG_SLUG = "worktask"
PROJECT_SLUG = "work-task-frontend"
INGEST_HOST = "wowoffcata.hlab.kz"  # ingest на основном 443 (nginx-локация)
WEBHOOK_TOKEN = os.environ.get("MONITORING_WEBHOOK_TOKEN", "")
WEBHOOK_URL = (
    f"https://{INGEST_HOST}/work-task/api/v1/monitoring/alert?token={WEBHOOK_TOKEN}"
    if WEBHOOK_TOKEN
    else None
)

def log(msg):
    print(f"[bootstrap] {msg}", flush=True)

# --- 1. Админ -----------------------------------------------------------
from django.contrib.auth import get_user_model  # noqa: E402

User = get_user_model()
admin = User.objects.filter(email=ADMIN_EMAIL).first()
if admin is None:
    admin = User.objects.create_superuser(email=ADMIN_EMAIL, password=ADMIN_PASSWORD)
    log(f"создан суперпользователь {ADMIN_EMAIL}")
else:
    log(f"суперпользователь {ADMIN_EMAIL} уже есть")
# Подтверждённый email — иначе login-flow требует верификации (SMTP нет).
try:
    from allauth.account.models import EmailAddress

    EmailAddress.objects.get_or_create(
        user=admin, email=ADMIN_EMAIL, defaults={"verified": True, "primary": True}
    )
except Exception as e:  # noqa: BLE001
    log(f"WARN: allauth EmailAddress: {e}")

# --- 2. Организация / проект / DSN --------------------------------------
from apps.organizations_ext.models import Organization  # noqa: E402

org = Organization.objects.filter(slug=ORG_SLUG).first()
if org is None:
    org = Organization.objects.create(name="WorkTask", slug=ORG_SLUG)
    log("создана организация worktask")
else:
    log("организация worktask уже есть")

try:
    org_user = org.add_user(admin)  # роль по умолчанию — owner для первого
    log("админ добавлен в организацию")
except Exception:
    org_user = org.organization_users.filter(user=admin).first()
    log("админ уже в организации")

from apps.projects.models import Project, ProjectKey  # noqa: E402

# Идемпотентность по ИМЕНИ, старейший первым: GlitchTip уникализирует slug
# при сохранении (прогоны №2–4 плодили дубли и меняли DSN на каждый деплой,
# теряя историю ошибок). Пустые дубли можно удалить в UI.
project = (
    Project.objects.filter(organization=org, name="WorkTask Frontend")
    .order_by("id")
    .first()
)
if project is None:
    project = Project.objects.create(
        organization=org, name="WorkTask Frontend", slug=PROJECT_SLUG, platform="javascript-react"
    )
    log("создан проект work-task-frontend")
else:
    log(f"проект work-task-frontend уже есть (id={project.id})")

# Команда нужна, чтобы проект был виден в UI не-суперпользователям.
try:
    from apps.teams.models import Team

    team, _ = Team.objects.get_or_create(organization=org, slug=ORG_SLUG)
    if org_user is not None:
        team.members.add(org_user)
    team.projects.add(project)
    log("команда worktask привязана к проекту")
except Exception as e:  # noqa: BLE001
    log(f"WARN: team: {e}")

key = ProjectKey.objects.filter(project=project).first()
if key is None:
    key = ProjectKey.objects.create(project=project)
    log("создан DSN-ключ проекта")
public_key = getattr(key, "public_key", None) or getattr(key, "public_key_hex", None)
dsn = f"https://{public_key}@{INGEST_HOST}/{project.id}"
with open(os.path.join(OUT_DIR, "dsn"), "w") as f:
    f.write(dsn)
log(f"DSN: {dsn}")

# --- 3. API-токен для source maps ----------------------------------------
try:
    from apps.api_tokens.models import APIToken

    token_obj = APIToken.objects.filter(user=admin, label="deploy-sourcemaps").first()
    if token_obj is None:
        scopes_field = APIToken._meta.get_field("scopes")
        flag_count = len(getattr(scopes_field, "flags", []) or [])
        token_obj = APIToken(user=admin, label="deploy-sourcemaps")
        if flag_count:
            # BitField ждёт целочисленную маску (прогон №2: список имён дал
            # «int() argument ... not 'list'») — включаем все скоупы.
            token_obj.scopes = (1 << flag_count) - 1
        token_obj.save()
        log(f"создан API-токен (scopes: все {flag_count})")
    else:
        log("API-токен deploy-sourcemaps уже есть")
    with open(os.path.join(OUT_DIR, "token"), "w") as f:
        f.write(str(token_obj.token))
except Exception as e:  # noqa: BLE001
    log(f"ERROR: api token: {e}")
    sys.exit(3)

# --- 4. Алерты: новые ошибки + всплеск, вебхук в WorkTask ----------------
if WEBHOOK_URL:
    try:
        from apps.alerts.models import AlertRecipient, ProjectAlert

        def ensure_alert(name, quantity, timespan):
            alert = ProjectAlert.objects.filter(project=project, name=name).first()
            if alert is None:
                alert = ProjectAlert.objects.create(
                    project=project, name=name, quantity=quantity, timespan_minutes=timespan
                )
                log(f"создано алерт-правило «{name}» ({quantity}/{timespan}м)")
            AlertRecipient.objects.get_or_create(
                alert=alert, recipient_type="webhook", url=WEBHOOK_URL
            )

        # Любая новая ошибка: первое событие issue даёт сигнал команде.
        ensure_alert("Новые ошибки", 1, 1)
        # Всплеск: 20 событий за 5 минут — деградация на проде.
        ensure_alert("Всплеск ошибок", 20, 5)
        log("вебхук алертов → WorkTask настроен")
    except Exception as e:  # noqa: BLE001
        log(f"ERROR: alerts: {e}")
        sys.exit(4)
else:
    log("WARN: MONITORING_WEBHOOK_TOKEN пуст — алерт-вебхук не настроен")

log("DONE")
