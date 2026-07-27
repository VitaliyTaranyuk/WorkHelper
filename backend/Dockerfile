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

# Получаем аргумент из docker build
ARG SPRING_PROFILES_ACTIVE=prod

# Пробрасываем аргумент в переменную окружения
ENV SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}

# Открываем порт 8080
EXPOSE 8080

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"]
