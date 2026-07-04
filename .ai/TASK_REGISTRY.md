# TASK_REGISTRY.md

> Реестр задач проекта WorkHelper.
> Обновлять статус после каждого завершения задачи.

---

## Статусы: NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED

---

## Фаза 0: Инициализация проекта

| ID | Задача | Зависимости | Статус | Критерии завершения |
|----|--------|-------------|--------|---------------------|
| T-001 | Загрузить файлы проекта в GitHub-репозиторий | — | COMPLETED | Все файлы на `main` в `VitaliyTaranyuk/WorkHelper` |
| T-002 | Создать CLAUDE.md и README.md | T-001 | COMPLETED | Файлы в репо, описывают проект и правила |
| T-003 | Создать CI/CD (GitHub Actions) | T-001 | COMPLETED | `backend-ci.yml`, `frontend-ci.yml` в `.github/workflows/` |
| T-004 | Настроить подключение к БД | T-001 | COMPLETED | `application-local.yml` с кредами, Liquibase enabled |
| T-005 | Покрыть backend unit-тестами (80%+ критической логики) | T-004 | COMPLETED | 37 тестов, 0 ошибок, 5 классов: Auth/User/Sprints/Task/CheckerUtil |
| T-006 | Создать `.ai/` структуру (PROJECT_RULES, CHECKPOINT, TASK_REGISTRY, TECH_DEBT, ARCHITECTURE) | T-005 | COMPLETED | Все 5 файлов созданы, закоммичены, правила перенесены из `rules.txt` |

---

## Фаза 1: Качество и надёжность

| ID | Задача | Зависимости | Статус | Критерии завершения |
|----|--------|-------------|--------|---------------------|
| T-100 | E2E-отладка: прогон пользовательских сценариев на живом приложении, устранение багов | T-005 | COMPLETED | 8 багов исправлено (BUG-001..008), полный цикл проект→спринт→задача→коммент зелёный (17/17 E2E) |
| T-101 | Добавить Integration Tests (с реальной БД) | T-005 | NOT_STARTED | Tests с `@SpringBootTest` + Testcontainers или CI Postgres |
| T-102 | Настроить branch protection на `main` (требовать PR + CI) | T-003 | NOT_STARTED | Direct push в main заблокирован через GitHub Settings |
| T-103 | Устранить TD-001: вынести credentials из репозитория | T-006 | NOT_STARTED | `application-local.yml` убран из git, добавлен в `.gitignore`, README описывает setup |
| T-104 | Добавить Checkstyle / SpotBugs в Gradle для статического анализа | T-005 | NOT_STARTED | `./gradlew check` включает статический анализ |
| T-105 | Покрыть оставшиеся сервисы тестами (ProjectsService, NotificationService и др.) | T-005 | NOT_STARTED | Coverage ≥ 80% по JaCoCo |

---

## Фаза 1.5: Упрощение модуля задач (Kanban)

| ID | Задача | Зависимости | Статус | Критерии завершения |
|----|--------|-------------|--------|---------------------|
| T-150 | Аудит модуля задач/проектов (что удалить) | T-100 | COMPLETED | Список кандидатов на удаление + конфликты с видением |
| T-151 | Task lifecycle: archive/restore/delete + миграция | T-150 | COMPLETED | Эндпоинты + поля archived/completed_date, проверено вживую |
| T-152 | Массовые операции (archive/delete/move-status/move-project) | T-151 | COMPLETED | 4 bulk-эндпоинта, проверено вживую |
| T-153 | Backlog как колонка доски + архив/удаление проекта | T-150 | COMPLETED | BACKLOG дефолтная колонка, миграция для существующих проектов, ARCHIVED/DELETED проекта |
| T-154 | My Tasks endpoint + чистка фейковых фильтров | T-151 | COMPLETED | `/tasks/{id}/my`, удалены 5 командных фильтров + фейк-юзеры, build зелёный |
| T-155 | Полная редукция фильтров до только My Tasks (dropdown assignee/creator) | T-154 | NOT_STARTED | См. TD-009: требует рефактора виджета/типов |
| T-156 | Удаление спринтов/comments/links/history из БД и кода | T-150 | NOT_STARTED | См. TD-005..008: после согласования разрушающих миграций |

---

## Фаза 2: Frontend

| ID | Задача | Зависимости | Статус | Критерии завершения |
|----|--------|-------------|--------|---------------------|
| T-201 | Аудит frontend: что работает, что нет | T-001 | NOT_STARTED | Отчёт по состоянию компонентов |
| T-202 | Добавить frontend unit-тесты (Vitest) | T-201 | NOT_STARTED | Тесты для хуков и критических компонентов |
| T-203 | E2E тесты (Playwright) | T-202 | NOT_STARTED | Основные сценарии: логин, создание задачи, спринт |

---

## Фаза 4: Голосовое управление (ADR — `.ai/VOICE_ARCHITECTURE.md`)

> Соответствие задачам TMS: ТП‑90..103 (проект WorkTask). MVP = Веха 1 без AI
> (критический путь V0→F1→F2→F3→I1→X1). Дерево — стартовая декомпозиция; каждая
> задача проходит повторный анализ перед реализацией.

| ID | Задача (ТП) | Зависимости | Статус | Критерии завершения |
|----|--------|-------------|--------|---------------------|
| T-400 | V0 (ТП‑90): архитектурный ADR подсистемы, без кода | — | IN_PROGRESS | `VOICE_ARCHITECTURE.md` + ADR‑005..010 в ARCHITECTURE; поведение не меняется |
| T-401 | F1 (ТП‑91): Command Registry + Executor | T-400 | NOT_STARTED | реестр ≥2 команд (перенос диктовки/создания); executor → существующие мутации; тесты; легаси без регрессии |
| T-402 | F2 (ТП‑92): Context Provider (`useVoiceContext`) | T-400 | NOT_STARTED | типизированный снимок из кэшей/route; тесты на mock-кэшах |
| T-403 | F3 (ТП‑93): Slot/Entity Resolver | T-402 | NOT_STARTED | матрица фраз строка→ID/неоднозначность; не выдумывает ID; unit-тесты |
| T-404 | I1 (ТП‑94): backend Intent‑прокси + RuleBased (без AI) | T-401,T-402 | NOT_STARTED | `POST /voice/resolve` без ключей; OpenAPI→data-contracts; интеграционные тесты |
| T-405 | X1 (ТП‑95): лаунчер + Confirmation + Feedback | T-401..404 | NOT_STARTED | сквозной сценарий без AI; destructive всегда с подтверждением; проверено на деплое |
| T-406 | I2 (ТП‑96): LLM Intent Resolver | T-404 | NOT_STARTED | NL→commandId+слоты; авто‑фолбэк на RuleBased; секреты в env |
| T-407 | C1..C6 (ТП‑97..102): пачки команд по доменам | T-405 | NOT_STARTED | матрицы «фраза→существующая мутация» + тесты; без правки чужих компонентов |
| T-408 | X2 (ТП‑103): журнал действий + undo | T-405 | NOT_STARTED | журнал сессии; undo через обратные мутации |

---

## Фаза 3: Production Readiness

| ID | Задача | Зависимости | Статус | Критерии завершения |
|----|--------|-------------|--------|---------------------|
| T-301 | Настроить observability (логи + метрики) | T-102 | NOT_STARTED | Spring Actuator + структурированные логи |
| T-302 | Добавить rate limiting на API | T-102 | NOT_STARTED | Защита от DDoS/брутфорс |
| T-303 | Dependency Security Scan (OWASP) в CI | T-003 | NOT_STARTED | `dependencyCheckAnalyze` в Gradle + CI step |
| T-304 | Docker Compose для локальной разработки | T-103 | NOT_STARTED | `docker-compose.yml` поднимает весь стек |
