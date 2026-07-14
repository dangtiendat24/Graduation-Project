# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Recruitment Platform — a monorepo with three services and a shared package:
- **recruitment-be**: NestJS 11 REST API (Node 22, TypeScript 5.7)
- **recruitment-fe**: React 19 + Vite 8 SPA (TypeScript 6, Tailwind CSS 4)
- **ai-service**: FastAPI 0.110 Python service with 5 LangGraph agents
- **packages/shared**: Shared Zod schemas and scoring constants, imported as `@smart-recruitment/shared`

## Running Services

### Docker (recommended)

```bash
# Development (hot reload for all services)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker compose -f docker-compose.yml up
```

Infrastructure services (Postgres 16, Redis 7, Qdrant) are only defined in `docker-compose.yml` — always include it.

### Local Development (services individually)

```bash
# Backend
cd recruitment-be
npm run start:dev        # NestJS watch mode, port 3000

# Frontend
cd recruitment-fe
npm run dev              # Vite dev server, port 5173

# AI Service
cd ai-service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Backend Commands (`recruitment-be/`)

```bash
npm run build            # Compile TypeScript
npm run start:dev        # Watch mode
npm run lint             # ESLint with auto-fix
npm test                 # Jest
npm run migration:generate -- src/database/migrations/MigrationName -d src/config/typeorm.config.ts
npm run migration:run -- -d src/config/typeorm.config.ts
npm run seed             # Run demo seed
```

API global prefix: `/api`. Swagger UI in dev: `http://localhost:3000/api/docs`.

## Frontend Commands (`recruitment-fe/`)

```bash
npm run dev              # Vite dev server
npm run build            # tsc -b && vite build
npm run lint             # ESLint
npm run preview          # Preview production build
```

## AI Service Commands (`ai-service/`)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload   # Dev server, port 8000
```

Swagger UI: `http://localhost:8000/api/ai/docs`.

## Architecture

### Backend (NestJS)

- **Global prefix**: `/api`
- **Auth**: JWT (`Authorization: Bearer <token>`) + Google OAuth via Passport strategies
- **Database**: TypeORM with PostgreSQL — async config in `src/config/typeorm.config.ts`, migrations in `src/database/migrations/`
- **Queue**: BullMQ on Redis — config in `src/config/bullmq.config.ts`
- **File storage**: AWS S3 (CV uploads, reports)
- **New modules** go under `src/modules/<name>/` and are imported into `src/app.module.ts`

### AI Service (FastAPI + LangGraph)

Five agent routers mounted in `app/main.py`, each under `app/agents/agent<N>_<name>/`:

| Agent | Router prefix | Purpose |
|-------|---------------|---------|
| 1 | `/api/ai/resume-parser` | Extract structured data from raw CV text |
| 2 | `/api/ai/matching` | CV-to-JD semantic matching (Qdrant) |
| 3 | `/api/ai/interview` | AI interview orchestration |
| 4 | `/api/ai/scheduling` | Interview scheduling |
| 5 | `/api/ai/reporting` | Generate recruitment reports |

Agents call back to the NestJS backend using `BE_INTERNAL_URL` + `BE_INTERNAL_SECRET`. Config lives in `app/core/config.py` (Pydantic Settings v2).

### Shared Package

`packages/shared/` exports Zod schemas and scoring constants. Imported in backend via path alias `@smart-recruitment/shared` (set in `recruitment-be/tsconfig.json`). Frontend does not yet reference it.

### Inter-service Communication

- Frontend → Backend: `VITE_API_BASE_URL` (default `http://localhost:3000/api`)
- Backend → AI Service: `AI_SERVICE_URL` env var (default `http://localhost:8000`)
- AI Service → Backend: `BE_INTERNAL_URL` + `BE_INTERNAL_SECRET` (internal callback)

## Environment Setup

Copy each `.env.example` to `.env` in the respective directory:
- `recruitment-be/.env.example` — DB, Redis, JWT, AWS S3, Google OAuth, SMTP, AI service URL
- `ai-service/.env.example` — OpenAI API key, Qdrant, DB, NestJS callback
- `recruitment-fe/.env.example` — `VITE_API_BASE_URL`, `VITE_APP_NAME`
