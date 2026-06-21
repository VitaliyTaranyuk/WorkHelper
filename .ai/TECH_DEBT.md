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

---

## Устранённый технический долг

| ID | Описание | Дата устранения | PR/Commit |
|----|----------|-----------------|-----------|
| BUG-001 | `task_status_id_seq` рассинхрон после seed → невозможно создать проект (CRITICAL) | 2026-06-21 | `20250630-fix-task-status-sequence.xml` |
| BUG-002 | `users_projects_id_seq` тот же рассинхрон → невозможно создать проект (CRITICAL) | 2026-06-21 | `20250630-fix-task-status-sequence.xml` |
| BUG-003 | `SprintsRepository.hasActiveSprint` — сломанный native SQL → 500 при активации спринта (HIGH) | 2026-06-21 | SprintsRepository.java |
| BUG-004 | Таблица `comment` без колонки тела → 500 при создании комментария (HIGH) | 2026-06-21 | `20250701-add-comment-body-column.xml` |
| BUG-005 | `TaskService.getProjectTaskByUserGuid` передавал userId вместо lastProjectId → 404 (HIGH) | 2026-06-21 | TaskService.java |
| BUG-006 | Задача без `sprintId` падала с 404 вместо фоллбэка в Backlog (MEDIUM) | 2026-06-21 | SprintsService.resolveSprintForTask |
| BUG-007 | `createProject` возвращал пустые statuses/users (граф не подгружен) (MEDIUM) | 2026-06-21 | ProjectsService (EntityManager.refresh) |
| BUG-008 | `update-status` с null статусом → 500 NPE вместо 400 (LOW) | 2026-06-21 | UpdateStatusRequestDTO @NotNull |
| BUG-009 | `User.extendedPermissions` — `@OneToMany` без `mappedBy` → JPA искал несуществующую join-таблицу `users_extended_permissions` → 500 на `/users/profile`, ломая логин в UI (CRITICAL) | 2026-06-21 | User.java `mappedBy = "user"` |

---

## Правила ведения реестра

- Добавлять новый долг немедленно при обнаружении
- При устранении — переносить в секцию "Устранённый"
- Приоритет устранения: HIGH > MEDIUM > LOW
- CRITICAL блокирует релиз
