FROM node:lts-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Ставим зависимости
RUN npm ci

# Копируем остальной код
COPY . .

# Собираем продакшн-версию (tsc + vite build)
RUN npm run build

# --- Запуск через nginx ---
FROM nginxinc/nginx-unprivileged:mainline-alpine

COPY --from=builder /app/dist /var/www/app

# Копируем собранное приложение из dist/
# COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем кастомный конфиг nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
