# PROJECT_CHECKPOINT.md

> Текущее состояние проекта WorkHelper.
> Обновлять после каждой завершённой задачи.
> **Последнее обновление:** 2026-07-04

---

## Завершено 2026-07-04: ТП-52 «Удалить Оценку из карточки задачи» (ветка `feature/tp52-remove-estimation`)

Поле «Оценка» убрано из карточки задачи: формы создания (`CreateTaskContent`,
`CreateTaskModal`, `CreateTaskDetails`) и редактирования (`TaskCardContent`), из
схемы формы (`taskFormSchema`/`useTaskForm`) и хелперов (`transformEstimaionByLimit`,
`ESTIMATION_MAX` удалены как мёртвый код). Backend-поле `estimation` НЕ трогали
(аддитивность, контракт совместим); отображение старых оценок на доске/в спринтах
(`TaskCard`, `SprintTask`, «Общая оценка» в FinishSprintModal) сохранено.

---

## Завершено 2026-07-04: ТП-53 «Открытие вложений в карточке задачи» (ветка `feature/tp53-attachment-open`)

- Форма создания задачи (`PendingAttachments`): клик по превью изображения открывает
  лайтбокс (общий `LightboxDialog`, выделен из `ImageLightbox` — источник картинки
  передаётся снаружи: blob по JWT или локальный object URL).
- Просматриваемые браузером типы (`image/*`, `text/*`, PDF, JSON —
  `isBrowserViewable`) открываются в новой вкладке кликом по имени файла: и в форме
  создания (object URL локального файла), и в карточке задачи/бага
  (`openAttachmentInNewTab`: вкладка открывается синхронно в обработчике клика —
  обход popup-блокировки, содержимое подставляется после авторизованной загрузки).
- Остальные типы — как раньше, только скачивание. Frontend lint+build зелёные.

---

## Завершено 2026-07-04: ТП-37 «Календарь и встречи» (ветка `feature/tp37-calendar-meetings`)

- **Календарь-вид**: `CalendarPage` — сетка неделя/месяц с переключателем, навигация
  ◀/▶/«Сегодня», выделение сегодняшнего дня; встречи — чипы в ячейках дня, клик
  открывает `MeetingDetailsDialog` (детали, участники, ссылка, удаление).
- **Ссылка на встречу**: `Meeting.link` (+ `CreateMeetingRequest`/`MeetingDto`), поле
  в форме создания и в карточке встречи; валидация `^https?://`. Автогенерации ссылок
  Телемоста нет (нужен OAuth-токен Яндекс 360 — задан [ВОПРОС] в ТП-37); кнопка
  «Создать встречу в Телемосте» открывает telemost.yandex.ru/create.
- **Кликабельные напоминания**: `Notification` получил `meetingId`/`projectId`/`link`
  (аддитивная миграция `20260707`, ПРИМЕНЕНА к общей БД локальным стендом);
  `MeetingReminderScheduler` пишет их через фабрику `Notification.meetingReminder`;
  клик в `NotificationBell`: внешняя ссылка → новая вкладка, иначе — запись встречи
  в календаре (`/project/{id}/calendar?meetingId=…`, search-параметр + автооткрытие).
- Тесты: `MeetingReminderSchedulerTest` (3 новых), backend зелёный; frontend lint+build
  зелёные; e2e по REST на localhost:8081 (create/list/update link, 400 на кривую ссылку).
- `vite.config.ts`: порт дев-сервера переопределяется env `PORT` (для параллельных стендов).

---

## Завершено 2026-07-03: Комплексный аудит и стабилизация (ветка `fix/backlog-status-sprint-consistency`)

Полный аудит FE↔BE-контрактов и бизнес-логики; найдено и устранено 12 дефектов
(BUG-024..035, см. TECH_DEBT), из них 2 CRITICAL. Ключевое:

- **TaskPlacementService** — единая точка инварианта «Backlog-спринт ⟺ Backlog-статус»:
  создание задач, переносы между спринтами, смена статуса, удаление/архивация/завершение
  спринта, удаление колонки. Задачи больше не «исчезают» в невидимых комбинациях.
- **Контракты**: `GET /projects/last` → `IdResponse {id}`; `PUT /tasks/update-sprint`
  принимает `{projectId, sprintId, taskIds}` (как в OpenAPI-типах клиента).
- **Завершение спринта**: Done-задачи архивируются по последней видимой колонке
  (не по строке "DONE"), незавершённые уходят в Backlog; FinishSprintModal сравнивает
  статусы по id.
- **Вложения**: авторизованная загрузка изображений (blob), встроенный лайтбокс,
  вставка из буфера (Ctrl+V), скачивание с JWT.
- **Доска**: задачи без исполнителя видны (группа «Не назначено»).
- **Календарь**: участники встречи — участники проекта (было: GET /users → 403).
- **Упоминания**: @username работает для 2-символьных usernames.

Backend-тесты: **74/74**. Приёмочный прогон вживую (localhost:8080 + Vite):
регистрация/логин, создание задачи → Backlog, перенос в спринт → To Do,
статус → Backlog (возврат), полный цикл спринта (Done → «Завершённые»),
комментарии, упоминание → уведомление → deep-link, вложения (превью/лайтбокс/Ctrl+V),
календарь — всё зелёное.

---

## Текущий прогресс

**Фаза:** 0 (Инициализация) — ЗАВЕРШЕНА  
**Следующая фаза:** 1 (Качество и надёжность)

---

## Завершённые задачи (COMPLETED)

| ID | Задача | Коммит/PR |
|----|--------|-----------|
| T-001 | Загрузить файлы в GitHub | Push 574 objects → `main` |
| T-002 | CLAUDE.md + README.md | В репозитории |
| T-003 | CI/CD GitHub Actions | `.github/workflows/backend-ci.yml`, `frontend-ci.yml` |
| T-004 | Настройка БД (PostgreSQL VPS + Liquibase) | `application-local.yml`, `application.yml` |
| T-005 | Unit Tests (37 тестов, 100% green) | commit `ec0dda3` |
| T-006 | Структура `.ai/` с правилами проекта | Текущий коммит |

---

## Последняя завершённая: Фаза 1.5 — упрощение модуля задач (Kanban)

Решение пользователя: **medium**-чистка, **Backlog = колонка доски**, **только аддитивные миграции**.

**Сделано (T-150…T-154):**
- Task lifecycle: archive / restore / delete (+ поля `archived`, `completed_date`)
- Массовые операции: bulk archive / delete / move-status / move-project
- Backlog как дефолтная Kanban-колонка; архив/удаление проекта (ARCHIVED / soft-DELETED)
- My Tasks endpoint; удалены 5 фейковых командных фильтров + фейк-юзеры
- 2 аддитивные миграции; backend unit-тесты зелёные (+6 новых на lifecycle/bulk/my-tasks); frontend `tsc -b` зелёный; всё проверено вживую (REST + preview-браузер)

Отложено в Tech Debt: TD-005…011 (удаление спринтов/comments/links/history, полная редукция фильтров, физическое удаление, env для API URL).

## Фаза 2: Trello-like MVP (ветка feature/trello-mvp)

Курс «удалять спринты/comments» **отменён** пользователем; новый курс — расширять существующее. Разрушающее удаление откачено.

**Сделано (backend, аддитивно, проверено вживую + unit-тесты):**
- STEP 3: sprint archive/delete (задачи → Backlog)
- STEP 6: User.username(уникальный)/displayName, профиль `PUT /users/profile`, seed → @admin/@ivanov/@petrov
- STEP 8: in-app уведомления — `Notification` + парсинг `@username` в комментах, список/счётчик/прочитано
- STEP 4: удаление колонки (задачи → дефолт); rename/reorder/create уже были
- STEP 4+: `Task.position` + `PUT /tasks/{id}/reorder` (порядок карточек в колонке)
- STEP 5: bulk move-sprint

**Сделано (frontend, проверено в preview):**
- Колокол уведомлений + счётчик непрочитанных + список + mark-read
- Доска: счётчики задач в колонках, сохранение порядка карточек (DnD), **фикс пред-существующего бага** загрузки задач (доска грузила с несуществующего `GET /tasks` → 401; переключено на `/tasks/tasks-in-project`)

**Фаза 2.1 — UI-полировка + новые фичи (всё сделано, проверено):**
- Уведомления: кликабельная ссылка на задачу (`taskCode` → `/task/{code}`)
- Доска: управление колонками (создание/переименование/удаление), счётчики скрывают «(0)»
- Карточка: клик по всей карточке открывает, ховер-увеличение
- Проекты: создание (модалка) + удаление в сайдбаре; лишние проекты вычищены (остался Тестовый)
- Бэклог и Календарь — в левом меню (Календарь внизу под Бэклогом)
- Спринты: даты уже были; добавлено удаление спринта
- Завершённые задачи: при завершении спринта Done-задачи уходят с доски в раздел «Завершённые»
- **Календарь встреч** (новый домен): Meeting + участники, страница `/project/{id}/calendar`
- **E2E-тест 14/14 OK**: регистрация → проект → спринт → задачи → статусы → Done → завершение спринта → завершённые уходят с доски (boardBefore=3 → boardAfter=0 → completed=3)

## Завершено 2026-06-22: Frontend Quality Audit

Проведён полный аудит фронтенда по PROJECT QUALITY STANDARD. Найдено и исправлено 13 дефектов (ветка `fix/quality-audit-ux-defects`):

**Критические:**
- Подключён `<Toaster>` sonner — toast-уведомления теперь работают
- Редирект на `/login` при истечении refresh-токена
- Защита от крэша `CreateTaskModal` при отсутствии default-спринта

**Функциональные:**
- Все мутации (задачи, спринты) получили `onSuccess`/`onError` toast
- `ViewSprintButton` теперь навигирует на `/main` вместо console.log
- `FinishSprintModal`: защита от двойного сабмита + skip пустого перемещения задач

**UX:**
- Sprint: empty state "Нет задач" / "Нет задач по фильтру"
- Sprint: expand-кнопка не скрывается при активном фильтре
- CompactTaskForm: исправлен missing key prop
- Опечатка "должлен" → "должен" в форме регистрации

TypeScript: ✅ 0 ошибок, ESLint: ✅ 0 предупреждений

---

## Активная задача

**T-101: Integration Tests** — NOT_STARTED (Docker недоступен — Tech Debt)

Следующий шаг: добавить `@SpringBootTest`-тесты с Testcontainers. Особенно важно после T-100 — нужны интеграционные тесты на: создание 2+ проектов (sequence), активацию спринта, создание комментария, фоллбэк задачи в Backlog. Эти баги Unit-тесты не ловили.

## Последняя завершённая: T-100 (E2E-отладка)

Прогнаны живые пользовательские сценарии (PowerShell + REST к localhost:8080, реальная БД на VPS). Найдено и исправлено **8 багов** (см. TECH_DEBT BUG-001..008), 2 из них CRITICAL (полностью блокировали создание проектов). Итог: полный цикл register→login→project→sprint→activate→task→comment→status→history — **17/17 зелёных**. Ветка `fix/e2e-stabilization`.

---

## Оставшиеся задачи

**Фаза 1 (приоритет):**
- T-101: Integration Tests
- T-102: Branch protection на `main`
- T-103: Убрать credentials из репозитория (TD-001)
- T-104: Статический анализ (Checkstyle/SpotBugs)
- T-105: Расширить coverage до 80%+ (JaCoCo)

**Фаза 2:** Frontend audit + тесты  
**Фаза 3:** Production Readiness (observability, rate limiting, OWASP scan)

---

## Риски

| Риск | Уровень | Митигация |
|------|---------|-----------|
| Credentials в `application-local.yml` (TD-001) | HIGH | T-103: вынести в `.gitignore` + env vars |
| Нет branch protection — прямой push в `main` | MEDIUM | T-102 |
| Нет Integration Tests — расхождение с реальной схемой | MEDIUM | T-101 |
| CI не верифицирует Liquibase миграции | MEDIUM | T-101 + T-104 |

---

## Технический долг

См. `.ai/TECH_DEBT.md`:
- TD-001: Credentials в репозитории (HIGH)
- TD-002: Нет Integration Tests (MEDIUM)
- TD-003: Нет branch protection (MEDIUM)
- TD-004: CI не проверяет Liquibase (MEDIUM)

---

## Последние изменения

```
ec0dda3  test: add unit test suite with 37 tests across 5 test classes
edf8d09  (предыдущие коммиты — CI, docs, DB config, initial push)
```

---

## Состояние репозитория

- **Branch:** `main`
- **Repo:** `https://github.com/VitaliyTaranyuk/WorkHelper`
- **Backend build:** ✅ SUCCESSFUL
- **Backend tests:** ✅ 37/37 PASSED
- **Frontend build:** ✅ (CI проверяет lint + build)
- **DB connection:** PostgreSQL на `91.211.249.37:32505` (vibe-db)

---

## Следующие шаги (в порядке приоритета)

1. **T-102**: Включить branch protection через GitHub Settings → Branches
2. **T-103**: Убрать `application-local.yml` из VCS (добавить в `.gitignore`, создать `.env.example`)
3. **T-104**: Добавить Checkstyle в Gradle
4. **T-101**: Integration Tests с Testcontainers
5. **T-105**: JaCoCo coverage report в CI
