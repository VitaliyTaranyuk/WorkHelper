# AUDIT/00-system-map.md — Карта системы WorkTask (baseline)

> Фаза 0 комплексного аудита. Дата: 2026-07-06. Ветка: `main` (bda0474, PR #110).
> Автор: автономный инженерный агент (Principal Engineer / Architect / QA / Product Designer / Tech Lead).

---

## 1. Стек и запуск

| Слой | Технологии |
|------|-----------|
| Backend | Java 21, Spring Boot 3.4, Spring Security + JWT, PostgreSQL (VPS 91.211.249.37:32505), Liquibase, JPA/Hibernate, MapStruct, Lombok, Gradle |
| Frontend | React 19, TypeScript strict, Vite (порт 3000), MUI v7, TanStack Router/Query, Zustand, RHF + Zod, Axios |
| CI | GitHub Actions: backend (JDK 21, build+test), frontend (npm ci + lint + vitest + build) |
| Прод | https://wowoffcata.hlab.kz — VDS, docker backend + статика nginx; деплой `deploy-main.mjs` |

**Точные команды:**
- Backend: `cd backend && ./gradlew test` (тесты), `./gradlew bootRun` (профиль local, БД на VPS)
- Frontend: `cd frontend && npm run lint && npx vitest run && npm run build`; dev: `npm run dev` c `VITE_API_BASE_URL=http://localhost:8080`
- Прод-деплой: `node deploy-main.mjs` из `C:\Users\CyberPC\Desktop\WorkTask`
- Визуальные доказательства: Vite dev-сервер (порт 3000) + локальный backend из main; скриншоты через preview-инструменты

**Окружения (критичный инвариант):** ДВА раздельных инстанса с разными БД:
prod (wowoffcata.hlab.kz, проект «WorkTask» `17565a09-…`, коды ТП-N — доска пользователя)
и test (91.211.249.37/test, коды WTP-N). Задачи заводить только на prod.

## 2. Baseline-метрики (до изменений)

| Метрика | Значение |
|---------|----------|
| Backend: файлов Java (main) | 222 |
| Backend: тестовых классов / тестов | 12 файлов / 120 тестов — все зелёные |
| Frontend: файлов TS/TSX | 331 |
| Frontend: тестовых файлов / тестов | 30 файлов / 256 тестов — все зелёные |
| ESLint | 0 ошибок, **1 warning** (`useTour.ts:41` exhaustive-deps `clamp`) |
| Прод-доска | Пуста (Backlog и активный спринт 23.06–15.07 без задач) |

## 3. Архитектура (сводно)

- **Backend:** слоистая — controllers → services → repositories; DTO + MapStruct; `UserContext` (ThreadLocal, ADR-001); AOP-транзакции (ADR-002); Liquibase (ADR-003). Ключевой домен-инвариант: `TaskPlacementService` — единственная точка согласования спринт/статус задач; завершающая колонка = max-priority видимая (TD-012).
- **Frontend:** FSD-подобная структура: `entities` (типы+утилиты) → `features` (мутации/запросы/логика) → `widget` (Board, Sprint, DashboardLayout, модалки) → `page` → `routes` (TanStack file-based). Серверное состояние — TanStack Query, клиентское — Zustand (voice journal, auth).
- **Голос:** конвейер `SpeechProvider → VoiceContext → IntentResolver (rule → heuristic → [LLM seam]) → SlotResolver → ConfirmationGate → Executor → Journal/Undo` (ADR-005…010, `.ai/VOICE_ARCHITECTURE.md`). 14 команд в реестре, онбординг (калибровка микрофона + spotlight-тур + практика).
- **Контракты:** `frontend/src/shared/api/data-contracts.ts` — источник (генерируется из OpenAPI).

## 4. Маршруты приложения

`/login`, `/register`, `/invite/$token` — вход/регистрация/приглашение;
`/` — доска (kanban активного спринта); `/project/$projectId/backlog` — «Задачи» (единый список);
`/project/$projectId/sprint` — то же представление; `/project/$projectId/calendar` — календарь;
`/task/$code` — карточка задачи; `/task/create` — создание; `/settings` — настройки.

## 5. Документация и расхождения

- `.ai/`: PROJECT_RULES, PROJECT_CHECKPOINT (актуален по 2026-07-05), TASK_REGISTRY, TECH_DEBT (TD-001…TD-018 open), ARCHITECTURE (+ VOICE_ARCHITECTURE, VOICE_DEMO). ADR-001…ADR-010 зафиксированы.
- Расхождение: CLAUDE.md «Запуск базы данных локально … docker-compose» — фактически профиль local ходит в БД на VPS, docker не нужен (подтверждено памятью и конфигом).
- TD-003 «прямой push в main» — устарел: действует PR-процесс (110 PR). Реестр TECH_DEBT частично не актуализирован.

## 6. Существующие задачи и ограничения владельца

- Прод-доска пуста — весь прежний бэклог закрыт (сессии 5–11, PR #37–110).
- Стоячие директивы: деплой прод всегда самостоятельно; PR-процесс, Conventional Commits; изменения sprint/status — только через TaskPlacementService; блокеры прошлого: ТП-10 (ключ LLM) — внешняя зависимость.

## 7. Тестовое покрытие: где пусто

- Backend: 120 тестов на 222 файла — покрыты сервисы точечно (placement, voice-смежное, dev-panel); контроллеры и валидаторы почти без тестов; интеграционных нет (TD-002).
- Frontend: покрытие сконцентрировано в `features/voice` (24 из 30 файлов) + notification/task/user точечно. Board, Sprint, TaskCard, календарь, auth — без тестов → перед их рефакторингом нужны характеризационные тесты.
- e2e нет (TD-014).

## 8. Карта областей и оценки (1–5, выше = лучше; «риск скрытых проблем» — выше = рискованнее)

| Область | Готовность | Качество кода | UX | Архитектура | Риск скрытых проблем | Нужен рефакторинг |
|---------|-----------|---------------|----|-------------|----------------------|--------------------|
| Аутентификация/регистрация/инвайты | 4 | 3 | 3 | 4 | 3 | 2 |
| Доска (kanban, DnD, колонки) | 4 | 3 | 4 | 4 | 4 | 3 |
| Список задач («Задачи», поиск, DnD) | 4 | 4 | 4 | 4 | 3 | 2 |
| Карточка задачи (модал+страница, вложения, комментарии, связи, dev-panel) | 4 | 3 | 3 | 3 | 4 | 3 |
| Создание/редактирование задачи | 4 | 4 | 4 | 4 | 3 | 2 |
| Спринты (create/activate/finish/архив) | 4 | 3 | 3 | 4 | 4 | 3 |
| Календарь и встречи | 3 | 3 | 3 | 3 | 4 | 3 |
| Уведомления (колокольчик, настройки) | 4 | 4 | 4 | 4 | 3 | 2 |
| Настройки/профиль/тема | 4 | 4 | 4 | 4 | 2 | 2 |
| Голосовой помощник (команды+онбординг) | 4 | 4 | 3 | 5 | 3 | 1 |
| Проекты (создание, участники, роли) | 3 | 3 | 3 | 3 | 4 | 3 |
| Backend API целиком (валидация, ошибки, безопасность) | 4 | 3 | — | 4 | 4 | 3 |

Приоритет аудита (по риску × влиянию): карточка задачи → доска/спринты → backend API (безопасность/валидация) → календарь → проекты/инвайты → голос (отдельный трек §8 задания) → остальное.

## 9. Известный техдолг (входящий)

TD-001 (креды в репо, HIGH), TD-002 (нет интеграционных тестов), TD-004 (CI-схема), TD-005…TD-010 (осознанные), TD-011 (URL в коде), TD-012 (завершающая колонка позиционно), TD-013 (404-шум sprint-info), TD-014 (нет e2e), TD-015 (NiceModal вне Router + нет ErrorBoundary, MEDIUM), TD-016…TD-018 (голос: Firefox, LLM, приватность).
