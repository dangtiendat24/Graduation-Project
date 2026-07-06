# ── Dependencies stage ────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# ── Production build stage ────────────────────────────────────
FROM builder AS production-build
RUN npm run build

# ── Production stage (Nginx serve static) ─────────────────────
FROM nginx:alpine AS production

COPY --from=production-build /app/dist /usr/share/nginx/html

# Cấu hình nginx cho SPA: mọi route trả về index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]