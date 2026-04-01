# Thomian Library System

A professional-grade Library Information System for St. Thomas Secondary School, featuring a student patron kiosk with wayfinding and a full librarian dashboard for cataloging, circulation, and reporting.

## 🏛️ Architecture

The system runs on a fully **Cloudflare-native** stack, migrated from a legacy Django/SQLite deployment. The architecture follows a **Type-Safe API Gateway** model — the frontend communicates exclusively through the Hono RPC client (`hc`), ensuring end-to-end TypeScript type safety between the frontend and backend.

```
┌─────────────────────┐     ┌─────────────────────┐
│   Admin Portal      │     │   Patron Kiosk       │
│   (Vite + React 19) │     │   (Vite + React 19)  │
│   Cloudflare Pages  │     │   Cloudflare Pages   │
└────────┬────────────┘     └──────────┬───────────┘
         │  Hono RPC `hc` client        │
         └──────────────┬───────────────┘
                        ▼
           ┌────────────────────────┐
           │  Backend Engine        │
           │  Hono (TypeScript)     │
           │  Cloudflare Workers    │
           └────────────┬───────────┘
                        │ Supabase JS (server-side)
                        ▼
           ┌────────────────────────┐
           │  Supabase (PostgreSQL) │
           │  RLS + Auth + RPC      │
           └────────────────────────┘
```

### Stack
| Layer | Technology | Platform |
|---|---|---|
| Admin Portal | React 19 + Vite + Shadcn UI | Cloudflare Pages |
| Patron Kiosk | React 19 + Vite + Shadcn UI | Cloudflare Pages |
| Backend API | Hono (TypeScript) + Zod | Cloudflare Workers |
| Database | Supabase (PostgreSQL) | Supabase Cloud |
| Auth | Supabase Auth (JWT) | Supabase Cloud |

### Design Principles
- **End-to-End Type Safety**: Hono's `AppType` is imported directly by the frontend. API calls via `hc` are fully typed with no manual interface duplication.
- **Centralized Validation**: All payloads are validated with Zod on the backend before reaching the database.
- **Clean API Layer**: Complex relational queries (joins, aggregations) are resolved in the backend and returned as shaped interfaces — the frontend never queries Supabase directly.
- **Auth via JWT passthrough**: Supabase Auth sessions remain on the frontend. The `Authorization: Bearer <token>` header is attached to every `hc` request so Supabase RLS continues to enforce user-level access on the backend.

---

## 📁 Monorepo Structure

```
thomian-lib/
├── admin/          # Librarian dashboard (Cloudflare Pages)
├── kiosk/          # Patron self-service kiosk (Cloudflare Pages)
├── backend/        # Hono API engine (Cloudflare Workers)
└── package.json    # Root scripts for dev/deploy
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20 or higher
- **Supabase** account (database + auth)
- **Cloudflare** account (Pages + Workers via Wrangler)

### 1. Install Dependencies

```bash
# Root
npm install

# Sub-projects
cd admin && npm install
cd ../kiosk && npm install
cd ../backend && npm install
```

### 2. Environment Variables

Create `.env` files in each sub-project. At minimum:

**`admin/.env` and `kiosk/.env`**
```env
VITE_API_BASE_URL=https://your-backend.workers.dev
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**`backend/.env`** (or Wrangler secrets)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Local Development

```bash
npm run dev:admin     # Admin portal  → http://localhost:5173
npm run dev:kiosk     # Patron kiosk  → http://localhost:5174
npm run dev:backend   # Hono Worker   → http://localhost:8787
```

---

## ☁️ Deployment (Cloudflare)

### Admin Portal & Patron Kiosk — Cloudflare Pages (GitHub)

Connect the repo in the Cloudflare Pages dashboard and use these settings:

| Setting | Admin Portal | Patron Kiosk |
|---|---|---|
| **Project name** | `thomian-admin` | `thomian-kiosk` |
| **Production branch** | `main` | `main` |
| **Root directory** | `admin` | `kiosk` |
| **Build command** | `npm run build` | `npm run build` |
| **Output directory** | `dist` | `dist` |
| **NODE_VERSION** | `20` | `20` |

### Backend — Cloudflare Workers (CLI)

```bash
cd backend
npx wrangler deploy
```

Or use GitHub Actions for continuous deployment — see [cloudflare_deployment.md](./cloudflare_deployment.md) for the full workflow YAML.

---

## 🛠️ Key Features

- **Type-Safe Hono RPC**: Shared `AppType` between backend and frontend — zero guesswork on API contracts.
- **Advanced Cataloging**: MARC-compatible book management with Dewey enrichment.
- **Circulation Management**: Loans, returns, renewals, and overdue tracking.
- **Student Kiosk**: Interactive wayfinding, book search, and patron self-service.
- **Librarian Dashboard**: Real-time analytics, engagement hub, and genre intelligence.
- **Stocktake & Acquisitions**: Inventory scanning and procurement waterfall.
- **Security**: Supabase RLS enforced via JWT passthrough on every API request.
- **Modern UI**: Shadcn UI, dark-mode support, responsive design for desktop and mobile.

---

## 📖 Further Reading

- [Cloudflare Deployment Guide](./cloudflare_deployment.md) — build settings, environment variables, GitHub Actions CI/CD, and troubleshooting.
- [Implementation Plan](./implementation_plan.md) — architectural rationale for the Hono RPC / Type-Safe API Gateway design.
