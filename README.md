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

Деплой на K3s-кластер через GitHub Actions:

- `.github/workflows/backend-deploy.yml` — ручной запуск (prod / test-env)
- `.github/workflows/frontend-deploy.yml` — автоматически при пуше в `main` (изменения в `frontend/`)

Необходимые секреты репозитория: `SERVER_IP`, `SERVER_USER`, `SSH_PRIVATE_KEY`

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
