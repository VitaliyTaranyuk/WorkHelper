# WorkHelper — TMS (Task Management System)

> Репозиторий для отладки и разработки приложения ТМС на основе WorkTask

Монорепо проекта **WorkTask** — системы управления задачами и спринтами с полноценным REST API и веб-интерфейсом.

## Архитектура

```
WorkHelper/
├── backend/     Java 21 + Spring Boot 3.4 (REST API)
├── frontend/    React 19 + TypeScript + Vite (SPA)
└── docs/        Аналитика, ER-диаграммы, диаграммы последовательностей
```

## Технологический стек

### Backend
| Технология | Версия | Назначение |
|---|---|---|
| Java | 21 | Язык программирования |
| Spring Boot | 3.4.0 | Основной фреймворк |
| Spring Security + JWT | — | Аутентификация и авторизация |
| PostgreSQL | latest | База данных |
| Liquibase | — | Миграции БД |
| Lombok | — | Снижение бойлерплейта |
| MapStruct | 1.5.5 | Маппинг DTO |
| SpringDoc OpenAPI | 2.8.5 | Документация API (Swagger UI) |
| Gradle | — | Сборка проекта |
| Docker | — | Контейнеризация |

### Frontend
| Технология | Версия | Назначение |
|---|---|---|
| React | 19 | UI-фреймворк |
| TypeScript | 5.8 | Типизация |
| Vite | 7 | Сборщик |
| Material UI | 7 | Компонентная библиотека |
| TanStack Router | 1.x | Клиентский роутинг |
| TanStack Query | 5.x | Серверный стейт / кеширование |
| Zustand | 5 | Клиентский стейт |
| React Hook Form + Zod | — | Формы и валидация |
| Axios | — | HTTP-клиент |
| Hello Pangea DND | — | Drag-and-drop |

## Быстрый старт

### Требования
- Java 21+
- Node.js 20+ (`.nvmrc` указывает на нужную версию)
- Docker & Docker Compose
- PostgreSQL (или запуск через Docker)

### 1. База данных

```bash
cd backend/enviroment/local
docker-compose up -d
```

Параметры подключения по умолчанию:
- Host: `localhost:5432`
- DB: `mydb`
- User: `myuser`
- Password: `1234566`

### 2. Backend

```bash
cd backend
./gradlew bootRun
```

Swagger UI доступен по адресу: `http://localhost:8080/swagger-ui/index.html`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложение доступно по адресу: `http://localhost:5173`

### Генерация типов из OpenAPI

После запуска бэкенда обновите типы:

```bash
cd frontend
npm run openapi-generate
```

## Функциональность

- Управление проектами
- Спринты (создание, управление задачами внутри спринта)
- Задачи: создание, статусы, приоритеты, назначение
- Пользователи и роли (RBAC)
- JWT-аутентификация
- Email-уведомления
- Drag-and-drop доска задач

## Workflow разработки

Проект следует строгим инженерным правилам (см. [CLAUDE.md](CLAUDE.md)):

1. **Ветки:** одна задача = одна ветка (`feature/...`, `fix/...`, `refactor/...`)
2. **Коммиты:** [Conventional Commits](https://www.conventionalcommits.org/)
3. **PR:** обязательное прохождение CI перед merge
4. **Запрещено:** работа напрямую в `main`

## CI/CD

**CI (автоматически, на каждый PR):**

- `.github/workflows/backend-ci.yml` — сборка и тесты backend (при изменениях в `backend/`)
- `.github/workflows/frontend-ci.yml` — lint, тесты и build frontend (при изменениях в `frontend/`)

**Деплой:** `.github/workflows/deploy.yml` — запускается вручную (Actions →
Deploy to VDS → Run workflow), можно выкатить backend, frontend или оба.
Workflow ждёт, пока контейнер станет `healthy`, и проверяет, что сайт отвечает;
предыдущая версия фронтенда сохраняется рядом в `*.old` для быстрого отката.

Чтобы он заработал, нужны секреты репозитория (Settings → Secrets and variables
→ Actions): `SERVER_IP`, `SERVER_USER`, `SSH_PRIVATE_KEY`. Без них workflow
намеренно падает на первом шаге с понятным сообщением. Необязательные
переменные (вкладка Variables): `DEPLOY_DIR`, `WEB_ROOT`, `PUBLIC_URL`,
`VITE_SENTRY_DSN`.

Ту же процедуру можно выполнить руками — ниже описано, что именно она делает.
Раздел раньше описывал деплой на K3s через `backend-deploy.yml` /
`frontend-deploy.yml` — этих workflow в репозитории никогда не существовало, и
именно это описание привело к тому, что смерженная задача три недели считалась
развёрнутой, не работая у пользователя.

Порядок на сервере (каталог `/opt/workhelper`, рядом лежит `.env.vds` вне git):

```bash
git checkout main && git pull
docker compose -f docker-compose.vds.yml up -d --build backend
```

Backend собирается ВНУТРИ образа (многоэтапный `backend/Dockerfile`), поэтому
отдельная сборка jar не нужна: обновление кода доезжает до прода само.

Frontend собирается вручную и раскладывается в корень nginx
(`/var/www/workhelper`). Переменная обязательна — без неё бандл уйдёт на
дефолтный адрес из `frontend/src/config.ts` (TD-024):

```bash
cd frontend && npm ci \
  && VITE_API_BASE_URL=https://wowoffcata.hlab.kz \
     VITE_SENTRY_DSN=https://f6cee9c358cd4d1db97e069c05e783f3@wowoffcata.hlab.kz/1 \
     npm run build
```

`VITE_SENTRY_DSN` — приём клиентских ошибок в GlitchTip (ТП-175). Публичный
ключ, не секрет: он в любом случае попадает в бандл. **Важно:** ключ пишется
БЕЗ дефисов, хотя GlitchTip показывает его как UUID — Sentry SDK принимает
только `[A-Za-z0-9_]` (`DSN_REGEX` в `@sentry/core`), и с дефисами DSN молча
отбрасывается вместе со всем мониторингом (TD-025).

Секреты (`DEEPSEEK_API_KEY`, доступ к БД и т.п.) живут только в `.env.vds` на
сервере и в репозиторий не попадают.

## Документация

Папка `docs/` содержит:
- `worktask.adoc` — основная аналитическая документация (AsciiDoc)
- `image/ER- diagramm.png` — ER-диаграмма базы данных
- Диаграммы последовательностей основных процессов
- `WorkTask-Analytics.zip` — полный архив аналитики

## Структура модулей (Backend)

```
src/main/java/ru/worktechlab/work_task/
├── annotations/        Кастомные аннотации транзакций
├── authorization/      JWT-фильтры, точки входа
├── config/             Security, Swagger, Mail, MapStruct конфигурации
├── controllers/        REST-контроллеры (Task, Project, Sprint, User, Role...)
├── ...
```
