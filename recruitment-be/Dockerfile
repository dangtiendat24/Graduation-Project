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

WORKDIR /app
COPY --from=shared-builder /app/packages/shared ./packages/shared

WORKDIR /app/recruitment-be

ENV NODE_ENV=production

COPY recruitment-be/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/recruitment-be/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
