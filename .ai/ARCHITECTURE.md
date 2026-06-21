# ARCHITECTURE.md

> Архитектурные решения и описание системы WorkHelper (TMS).
> ADR (Architecture Decision Records) — каждое решение документировать.

---

## Обзор системы

**WorkHelper** — Task Management System (TMS) для управления проектами, спринтами и задачами.

### Монорепо структура
```
WorkHelper/
├── backend/          # Java 21 + Spring Boot 3.4.0
├── frontend/         # React 19 + Vite + TypeScript
├── docs/             # Документация
├── .ai/              # Инженерная память проекта
├── .github/workflows/# CI/CD
├── CLAUDE.md         # Инструкции для AI-агентов
└── README.md
```

---

## Backend Architecture

### Tech Stack
| Компонент | Технология |
|-----------|-----------|
| Runtime | Java 21 |
| Framework | Spring Boot 3.4.0 |
| Security | Spring Security + JWT |
| Database | PostgreSQL (K3s, NodePort 32505) |
| Migrations | Liquibase |
| ORM | Spring Data JPA / Hibernate |
| Mapping | MapStruct |
| Boilerplate | Lombok |
| API Docs | SpringDoc OpenAPI |
| Build | Gradle |

### Package Structure
```
ru.worktechlab.work_task/
├── annotations/      # @TransactionRequired, @TransactionMandatory (AOP)
├── config/           # Spring Security, CORS, mail params
├── controllers/      # REST endpoints
├── dto/              # Request/Response DTOs
├── exceptions/       # Domain exceptions (NotFoundException, etc.)
├── mappers/          # MapStruct mappers
├── models/
│   ├── enums/        # Roles, Gender, etc.
│   └── tables/       # JPA entities
├── repositories/     # Spring Data repositories
├── services/         # Business logic
└── utils/            # UserContext (ThreadLocal), CheckerUtil
```

### Key Design Decisions

**ADR-001: ThreadLocal для пользовательского контекста**
- Решение: `UserContext` использует `ThreadLocal<UserContextData>`
- Причина: Простая передача user ID/email по стеку вызовов без явной параметризации
- Следствие: Необходимо очищать контекст после запроса (Spring фильтр)

**ADR-002: AOP-аннотации для транзакций**
- Решение: `@TransactionRequired` (REQUIRED) и `@TransactionMandatory` (MANDATORY)
- Причина: Явная документация транзакционных требований прямо в сигнатуре
- Следствие: В Unit-тестах AOP не применяется — тестируем логику, а не транзакции

**ADR-003: Liquibase для схемы БД**
- Решение: `ddl-auto: none`, Liquibase управляет всеми миграциями
- Причина: Воспроизводимость схемы, история изменений, безопасный rollback
- Миграции: `src/main/resources/db/changelog/changes/` (16 XML-файлов)

**ADR-004: Профили Spring**
- `local` — используется по умолчанию (`application-local.yml`), подключается к БД на VPS
- `prod` — переменные среды (`DB_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`)
- CI — тесты запускают PostgreSQL как service container

---

## Frontend Architecture

### Tech Stack
| Компонент | Технология |
|-----------|-----------|
| Framework | React 19 |
| Build | Vite |
| Language | TypeScript |
| UI | MUI v7 |
| Routing | TanStack Router |
| Server State | TanStack Query |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| HTTP | Axios |

---

## Infrastructure

### Database
- PostgreSQL 16 на K3s (VPS: 91.211.249.37)
- NodePort: 32505
- Database: `vibe-db`, User: `vibe`

### CI/CD
- GitHub Actions
- `backend-ci.yml`: JDK 21 (Corretto), Gradle build + test
- `frontend-ci.yml`: Node (`.nvmrc`), npm ci + lint + build
- Тригер: push/PR в `main` по изменениям в соответствующих директориях

---

## Security Architecture

- JWT Access Token + Refresh Token (repository-stored)
- RBAC: роли `PROJECT_OWNER`, `PROJECT_MEMBER` через `RoleModel`
- CORS настроен через `application.yml` (allowed origins)
- Пароли: BCrypt через `PasswordEncoder`
- Email-подтверждение с UUID-токеном (опционально, `mail.enable`)

---

## Нерешённые архитектурные вопросы

- [ ] Стратегия кэширования (Redis?)
- [ ] Websocket / SSE для real-time обновлений
- [ ] Стратегия логирования и observability (Loki/Grafana?)
- [ ] Rate limiting на API endpoints
