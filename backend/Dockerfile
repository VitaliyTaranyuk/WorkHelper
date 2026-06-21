# Используем Amazon Corretto 21
FROM amazoncorretto:21

# Указываем рабочую директорию
WORKDIR /home/deployer/backend

# Копируем собранный JAR-файл
COPY app.jar app.jar

# Получаем аргумент из docker build
ARG SPRING_PROFILES_ACTIVE=prod

# Пробрасываем аргумент в переменную окружения
ENV SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}

# Открываем порт 8080
EXPOSE 8080

# Запускаем приложение
ENTRYPOINT ["java", "-jar", "app.jar"]


