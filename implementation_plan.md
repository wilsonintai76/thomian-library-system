# Official System Architecture: "Cloudflare Native"

The **Thomian Library System** is built on a modern, high-performance, and fully type-safe "Cloudflare Native" stack. This document serves as the primary technical reference for the system's architecture.

## 🏛️ Core Architecture

The system utilizes a monorepo structure with three main components:
1.  **Admin Portal (`/admin`)**: Vite 6 SPA (React 19) for library staff.
2.  **Patron Kiosk (`/kiosk`)**: Vite 6 SPA (React 19) for student self-service.
3.  **Backend Engine (`/backend`)**: Hono (TypeScript) running on **Cloudflare Workers**.

---

## ⚙️ Backend & Persistence

The backend leverages Cloudflare's serverless infrastructure for maximum reliability and zero-maintenance operations.

### 🗄️ Database: Cloudflare D1 + Drizzle ORM
- **Storage**: Primary data (Books, Patrons, Transactions) is stored in **Cloudflare D1** (SQLite).
- **ORM**: **Drizzle ORM** provides type-safe query building and automated schema management.
- **Workflow**: Schema is defined in `backend/src/db/schema.ts` and managed via `drizzle-kit`.

### 🖼️ Assets & Storage: Cloudflare R2
- All binary assets (Book Covers, Staff IDs) are stored in a **Cloudflare R2** bucket (`thomian-assets`).
- R2 provides S3-compatible API access with zero egress fees.

### 🤖 Intelligent Cataloging: Workers AI
- The system uses **Cloudflare Workers AI** (`@cf/meta/llama-3.1-8b-instruct`) as a fallback for automatic **Dewey Decimal Classification (DDC)** when metadata is missing from Open Library or Google Books.

---

## 📡 API Strategy: Hono RPC (`hc`)

The system uses a **Type-Safe RPC** model instead of traditional REST/SDK calls. This ensures full end-to-end type safety between the backend and frontends.

### Benefits
- **Zero-Cohesion Type Safety**: The frontend automatically knows the exact shape of every API response.
- **No Manual Types**: Changes in the backend's Zod validators or response types are instantly reflected in the frontends.
- **Centralized Validation**: Zod is used at the gateway to ensure only valid data enters the system.

### Configuration Example
The frontend initializes the `hc` client using the backend's exported `AppType`:
```typescript
import { hc } from 'hono/client';
import type { AppType } from '../../../backend/src/index';

export const client = hc<AppType>(import.meta.env.VITE_API_BASE_URL);
```

---

## 🔐 Security & Auth

The system uses **JWT-based Authentication** (HS256) at the Worker edge.

- **Frontend**: Stores the JWT in a secure session.
- **Backend Middleware**: Every request (except public routes like `/health` or home-screen stats) passes through a JWT verification middleware.
- **Authorization**: The `Authorization: Bearer <token>` header is automatically attached to all `hc` client requests.

---

## 🎨 Frontend Stack: Vite 6 + React 19

The frontend is built for speed and developer productivity.
- **Framework**: **React 19** using the latest patterns (Hooks, Concurrent Rendering).
- **Styling**: **Tailwind CSS v4** for a high-performance, utility-first design system.
- **UI Components**: **Shadcn UI** (built on Base UI) for a premium, accessible interface.

---

## 🛠️ Tech Stack Recap

| Layer | Technology |
| :--- | :--- |
| **Language** | TypeScript |
| **Framework (Backend)** | Hono (Cloudflare Workers) |
| **Framework (Frontend)** | React 19 (Vite 6) |
| **Primary Database** | Cloudflare D1 (SQLite) |
| **ORM** | Drizzle ORM |
| **File Storage** | Cloudflare R2 |
| **Classification AI** | Workers AI (Llama 3.1) |
| **Styling** | Tailwind CSS v4 |
| **RPC Engine** | Hono `hc` |
