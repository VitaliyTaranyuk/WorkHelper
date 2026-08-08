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

### Настройка

**Учётных данных в репозитории нет** — ни от боевой базы, ни от локальной (K-33). Два файла
создаются из шаблонов, значения вы задаёте сами:

```bash
cp backend/enviroment/local/.env.example backend/enviroment/local/.env
cp backend/src/main/resources/application-local.yml.example backend/src/main/resources/application-local.yml
```

Первый читает `docker-compose` при подъёме БД, второй — backend при старте. Значения в них
должны совпадать. Оба файла в git не хранятся и в docker-образ не попадают.

Дальше: `docker-compose up -d` в `backend/enviroment/local`, затем `./gradlew bootRun`
в `backend/` и `npm install && npm run dev` во `frontend/`.

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

Секреты (`DEEPSEEK_API_KEY`, доступ к БД и т.п.) живут только в `.env.vds` на
сервере и в репозиторий не попадают.

## Наблюдаемость (T-301)

Всё ниже доступно **только с сервера**: порт метрик публикуется на `127.0.0.1`,
nginx его не проксирует.

| Вопрос | Команда на VDS |
|---|---|
| Работает ли приложение | `curl -s https://wowoffcata.hlab.kz/work-task/api/v1/health` (публично) |
| Сколько памяти занято | `curl -s 127.0.0.1:8081/actuator/metrics/jvm.memory.used` |
| Какие запросы и с каким исходом | `curl -s 127.0.0.1:8081/actuator/metrics/http.server.requests` |
| Что было в конкретном запросе | `docker logs workhelper-backend-1 \| jq 'select(.rid=="abc123")'` |
| Все ошибки за сегодня | `docker logs workhelper-backend-1 \| jq 'select(.log.level=="ERROR")'` |

Лог боевого профиля — JSON в формате ECS, одна строка на событие; каждая строка
запроса несёт `rid` (он же уходит клиенту заголовком `X-Request-Id`), `uid`,
метод, путь, статус и длительность. Ошибки клиента собирает GlitchTip — это
отдельный контур (ADR-016).


## Структура модулей (Backend)

```
src/main/java/ru/worktechlab/work_task/
├── annotations/        Кастомные аннотации транзакций
├── authorization/      JWT-фильтры, точки входа
├── config/             Security, Swagger, Mail, MapStruct конфигурации
├── controllers/        REST-контроллеры (Task, Project, Sprint, User, Role...)
├── ...
```
