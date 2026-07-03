# TECH_DEBT.md

> Реестр технического долга проекта WorkHelper.
> Обновлять при обнаружении нового долга или устранении существующего.

---

## Активный технический долг

| ID | Описание | Причина | Риск | Статус |
|----|----------|---------|------|--------|
| TD-001 | Credentials DB в `application-local.yml` в репозитории | Быстрая настройка локального окружения | HIGH: утечка паролей если станет публичным | OPEN |
| TD-002 | Отсутствие Integration Tests (только Unit Tests) | Начальный этап покрытия | MEDIUM: нет проверки реального DB-взаимодействия | OPEN |
| TD-003 | Прямой push в `main` без PR | Начальный этап | MEDIUM: нет code review, CI не обязателен | OPEN |
| TD-004 | `ddl-auto: none` только в local/prod, но в CI используется H2/Postgres без Liquibase init | Неполная CI конфигурация | MEDIUM: тесты могут расходиться с реальной схемой | OPEN |
| TD-005 | Подсистема спринтов (entity/controller/service/board) не удалена | Решение «medium» + аддитивные миграции; видение Kanban спринтов не предполагает | MEDIUM: лишний код/таблицы, спрятать в UI как follow-up | OPEN |
| TD-006 | Сущности Comment / Link / TaskHistory не удалены | «Минимальный набор полей» не включает их, но дроп необратим на общей БД | LOW: неиспользуемые таблицы | OPEN |
| TD-007 | Поля задачи priority/assignee/taskType/estimation сохранены | Аддитивный подход; используются текущим UI/маппингом | LOW: избыточные поля относительно минимального видения | OPEN |
| TD-008 | Статусы REVIEW/CANCELED остаются в дефолтных колонках | Не дропаем из БД; видение — 4 колонки | LOW: доска показывает 6 колонок вместо 4 | OPEN |
| TD-009 | Фильтры assignee/creator (dropdown) сохранены наряду с My Tasks | Полный снос dropdown ломает типы/виджет при strict TS | LOW: «только My Tasks» выполнено частично | OPEN |
| TD-010 | Удаление проекта — мягкое (status=DELETED), не физическое | Data safety + каскад FK на tasks/sprints | LOW: записи остаются в БД | OPEN |
| TD-011 | `WORKTECH_API_BASE_URL` зашит в коде (нет env-переменной) | Историческое; локально требуется ручная правка/прокси; фолбэк работает, переопределяется `VITE_API_BASE_URL` | LOW: неудобство локальной разработки | OPEN |
| TD-012 | «Завершающая» колонка доски определяется позиционно (max priority среди видимых), а не явным флагом в модели | Минимальный фикс BUG-033 без миграции | LOW: перестановка колонок меняет семантику завершения; правильное решение — флаг `completedStatus` в TaskStatus (аддитивная миграция) | OPEN |
| TD-013 | Сайдбар шлёт `sprint-info` по каждому проекту и получает 404 при отсутствии активного спринта (шум в логах/сети) | Исторический контракт эндпоинта | LOW: корректнее 200 с пустым телом | OPEN |
| TD-014 | Юнит-тесты фронтенда (Vitest) и e2e (Playwright) отсутствуют — регрессии UI ловятся только ручным прогоном | Не было изначально | MEDIUM: см. T-202/T-203 | OPEN |

---

## Устранённый технический долг

| ID | Описание | Дата устранения | PR/Commit |
|----|----------|-----------------|-----------|
| BUG-024 | Рассинхрон статус↔спринт: задача, созданная в активный спринт, получала скрытый BACKLOG-статус и «исчезала» из UI; перенос между спринтами/удаление колонки/удаление-архивация-завершение спринта не синхронизировали статус (CRITICAL) | 2026-07-03 | `fix/backlog-status-sprint-consistency`, TaskPlacementService |
| BUG-025 | Задачи без исполнителя не попадали на доску (`/tasks/tasks-in-project` отбрасывал их) (HIGH) | 2026-07-03 | `fix/backlog-status-sprint-consistency` |
| BUG-026 | `TaskModel.setAssignee` — NPE при назначении исполнителя задаче, у которой его не было (HIGH) | 2026-07-03 | `fix/backlog-status-sprint-consistency` |
| BUG-027 | Изображения-вложения не отображались и не скачивались из UI: `<img src>`/`<a href>` без JWT → 401 (HIGH) | 2026-07-03 | `fix/backlog-status-sprint-consistency` |
| BUG-028 | Календарь: `GET /users` доступен только ADMIN/PROJECT_OWNER → 403 у участника проекта, пустой список участников встречи (MEDIUM) | 2026-07-03 | `fix/backlog-status-sprint-consistency` |
| BUG-029 | Раздел Backlog показывал задачи дефолтного спринта с «доскными» статусами → дублирование доска/Backlog (MEDIUM) | 2026-07-03 | `fix/backlog-status-sprint-consistency` |
| BUG-030 | Мёртвый клиентский вызов `GET /tasks` (эндпоинт не существует) (LOW) | 2026-07-03 | `fix/backlog-status-sprint-consistency` |
| BUG-031 | `PUT /tasks/update-sprint` → 404: фронтенд шлёт `sprintId`, бэкенд ждал `targetSprintId` — перенос задач в спринт и перенос незавершённых при закрытии спринта не работали вовсе (CRITICAL) | 2026-07-03 | UpdateTasksSprintRequestDto |
| BUG-032 | `GET /projects/last` возвращал голую строку вместо `IdResponse {id}` — «активным» становился случайный первый проект из неотсортированного списка; Backlog фильтровался по статусам чужого проекта (HIGH) | 2026-07-03 | IdResponse + сортировка for-user |
| BUG-033 | `archiveDoneTasks` сравнивал код колонки с "DONE", а колонки создаются как "Done" — Done-задачи не архивировались при завершении спринта (HIGH) | 2026-07-03 | последняя видимая колонка (max priority) |
| BUG-034 | `FinishSprintModal`: сравнение статусов по ссылке (`task.status !== resolveStatus`) — все задачи всегда «незавершённые»; `resolveStatus` мог выбрать скрытую колонку Canceled (HIGH) | 2026-07-03 | сравнение по id + только видимые колонки |
| BUG-035 | Упоминания `@username` не работали для 2-символьных usernames (например `vt` из префикса email): regex требовал 3+ (MEDIUM) | 2026-07-03 | политика и regex согласованы на 2-32 |
| BUG-011 | `sonner` установлен но `<Toaster>` не подключён → ни одно уведомление не отображалось (HIGH) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-012 | `apiMiddleware.ts`: при неудачном refresh-токена только `console.error` без редиректа → пользователь застревал с 401 (HIGH) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-013 | `CreateTaskModal`: non-null assertion `find()!.id` → крэш при отсутствии default-спринта (HIGH) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-014 | Все мутации без `onError` → ошибки API молча игнорировались (MEDIUM) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-015 | `EditTaskPage` catch-блок только `console.log` → ошибка сохранения незаметна (MEDIUM) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-016 | `CreateTaskPage` без try/catch в submit → unhandled promise rejection (MEDIUM) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-017 | `ViewSprintButton` — заглушка `console.log` → кнопка "просмотреть спринт" не работала (MEDIUM) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-018 | `FinishSprintModal` без защиты от двойного сабмита → многократный вызов API (MEDIUM) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-019 | `FinishSprintModal` вызывал `updateTasksSprint` при пустом списке незакрытых задач (LOW) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-020 | `Sprint` без empty state → при 0 задачах пустое пространство без объяснений (LOW) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-021 | `Sprint` expand-кнопка скрывалась при активном фильтре → нельзя свернуть/развернуть (LOW) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-022 | `CompactTaskForm` MenuItem спринтов без `key` prop → React предупреждения + непредсказуемый diff (LOW) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-023 | `useRegister` опечатка "Пароль должлен" → "Пароль должен" (LOW) | 2026-06-22 | `fix/quality-audit-ux-defects` |
| BUG-001 | `task_status_id_seq` рассинхрон после seed → невозможно создать проект (CRITICAL) | 2026-06-21 | `20250630-fix-task-status-sequence.xml` |
| BUG-002 | `users_projects_id_seq` тот же рассинхрон → невозможно создать проект (CRITICAL) | 2026-06-21 | `20250630-fix-task-status-sequence.xml` |
| BUG-003 | `SprintsRepository.hasActiveSprint` — сломанный native SQL → 500 при активации спринта (HIGH) | 2026-06-21 | SprintsRepository.java |
| BUG-004 | Таблица `comment` без колонки тела → 500 при создании комментария (HIGH) | 2026-06-21 | `20250701-add-comment-body-column.xml` |
| BUG-005 | `TaskService.getProjectTaskByUserGuid` передавал userId вместо lastProjectId → 404 (HIGH) | 2026-06-21 | TaskService.java |
| BUG-006 | Задача без `sprintId` падала с 404 вместо фоллбэка в Backlog (MEDIUM) | 2026-06-21 | SprintsService.resolveSprintForTask |
| BUG-007 | `createProject` возвращал пустые statuses/users (граф не подгружен) (MEDIUM) | 2026-06-21 | ProjectsService (EntityManager.refresh) |
| BUG-008 | `update-status` с null статусом → 500 NPE вместо 400 (LOW) | 2026-06-21 | UpdateStatusRequestDTO @NotNull |
| BUG-009 | `User.extendedPermissions` — `@OneToMany` без `mappedBy` → JPA искал несуществующую join-таблицу `users_extended_permissions` → 500 на `/users/profile`, ломая логин в UI (CRITICAL) | 2026-06-21 | User.java `mappedBy = "user"` |
| BUG-010 | CORS: backend разрешал только `localhost:5173`, а frontend (vite) работает на `localhost:3000` → 403 «Invalid CORS request» из браузера, логин в UI падал с «Неверное имя/пароль» (CRITICAL) | 2026-06-21 | application-local.yml + SecurityConfig (origins через запятую) |

---

## Правила ведения реестра

- Добавлять новый долг немедленно при обнаружении
- При устранении — переносить в секцию "Устранённый"
- Приоритет устранения: HIGH > MEDIUM > LOW
- CRITICAL блокирует релиз
