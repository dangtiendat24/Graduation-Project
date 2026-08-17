# ── Build stage: shared package (@smart-recruitment/shared) ─────
# Build context = repo root (docker build -f recruitment-be/Dockerfile .)
FROM node:22-alpine AS shared-builder

WORKDIR /app/packages/shared

COPY packages/shared/package*.json ./
RUN npm ci

COPY packages/shared/ .
RUN npm run build

# ── Build stage: recruitment-be ──────────────────────────────────
FROM node:22-alpine AS builder

# docker-compose.dev.yml chạy `npm run start:dev` trực tiếp trên stage này (target: builder),
# nên Puppeteer (modules/reports) cần Chromium thật ở đây, không chỉ ở stage production.
# Alpine không có shared libs mà Chromium tải sẵn của Puppeteer cần (nss, freetype, harfbuzz...)
# nên phải dùng bản Chromium của apk và trỏ PUPPETEER_EXECUTABLE_PATH vào đó, đồng thời skip
# download Chromium riêng của Puppeteer khi `npm ci` chạy postinstall.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# recruitment-be/package.json khai báo "@smart-recruitment/shared": "file:../packages/shared"
# nên packages/shared phải nằm ở vị trí anh em (sibling) của recruitment-be khi npm ci chạy
WORKDIR /app
COPY --from=shared-builder /app/packages/shared ./packages/shared

WORKDIR /app/recruitment-be
COPY recruitment-be/package*.json ./
RUN npm ci

COPY recruitment-be/ .
RUN npm run build

# ── Production stage ──────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY --from=shared-builder /app/packages/shared ./packages/shared

WORKDIR /app/recruitment-be

ENV NODE_ENV=production

COPY recruitment-be/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/recruitment-be/dist ./dist

EXPOSE 3000

# Chạy migration còn thiếu trước khi start app — tránh lặp lại lỗi entity/DB lệch schema do
# migration mới chưa từng được áp dụng lên DB production (đã xảy ra 2 lần: interview_answers,
# rồi interview_sessions/notifications khi thêm voice interview). migration:run:prod dùng thẳng
# dist/config/typeorm.config.js (không cần ts-node/devDependencies, vốn đã bị `npm ci --omit=dev`
# xoá khỏi stage production). TypeORM tự lưu migration nào đã chạy vào bảng "migrations", nên lệnh
# này an toàn khi container khởi động lại nhiều lần (free tier hay sleep/wake) — chỉ áp dụng phần
# migration còn thiếu, không chạy lại cái đã chạy.
CMD ["sh", "-c", "npm run migration:run:prod && node dist/main"]
