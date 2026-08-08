# Многоэтапная сборка (TD-023). Раньше здесь было `COPY app.jar app.jar` —
# образ собирался из ГОТОВОГО jar, который лежал рядом и в git не хранился.
# Из-за этого `git pull` + `docker compose up -d --build` на сервере выглядели
# как успешный деплой, но переупаковывали старый jar: так ТП-208 три недели
# считалась развёрнутой, не работая у пользователя (см. .ai/TECH_DEBT.md).
# Теперь jar собирается ВНУТРИ образа из исходников — «собралось» и
# «задеплоилось» больше не расходятся.

# --- этап сборки ---
FROM gradle:8.10-jdk21 AS build
WORKDIR /src

# VDS: 1 CPU и ~1.8 ГБ RAM, поэтому демон Gradle не поднимаем и ограничиваем
# heap — иначе сборка уходит в swap и падает по памяти.
ENV GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx512m -Dorg.gradle.daemon=false"

# Сначала только описание сборки: слой с зависимостями переиспользуется,
# пока build.gradle не изменился, и повторные деплои не качают их заново.
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle --no-daemon dependencies --quiet || true

COPY src ./src
# Тесты прогоняет CI (backend-ci.yml) — на сервере это только время и память.
RUN gradle --no-daemon bootJar -x test

# --- этап запуска ---
FROM amazoncorretto:21
WORKDIR /home/deployer/backend

COPY --from=build /src/build/libs/*.jar app.jar

# T-305: отпечаток версии. build.gradle считает версию через `git rev-parse`,
# но в контекст сборки `.git` не копируется — внутри образа версия
# вырождалась в «0.0.1-», и деплой не мог доказать, что запущен образ ИЗ
# нового кода (TD-030). SHA приезжает аргументом.
#
# ARG объявлен ТОЛЬКО в рантайм-стадии и после COPY: в стадии сборки он сбросил
# бы кэш слоёв, и каждый деплой пересобирал бы зависимости Gradle на VDS с
# одним CPU.
ARG APP_VERSION=unknown
ENV APP_VERSION=${APP_VERSION}

# Получаем аргумент из docker build
ARG SPRING_PROFILES_ACTIVE=prod

# Пробрасываем аргумент в переменную окружения
ENV SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}

# Открываем порт 8080
EXPOSE 8080

# T-301: порт метрик (Spring Actuator). EXPOSE — только документация образа:
# наружу порт публикует docker-compose.vds.yml, и делает это на 127.0.0.1.
EXPOSE 8081

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"]
