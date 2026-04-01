# Thomian Library System

A professional-grade Library Information System for St. Thomas Secondary School, featuring a student kiosk with wayfinding and a librarian dashboard for cataloging and circulation.

## 🏛️ Modern Architecture

The system has been migrated from a legacy Django/SQLite stack to a modern, high-performance architecture:

- **Frontend (Admin Portal)**: Built with React 19, Vite, and Shadcn UI. Deployed to Cloudflare Pages.
- **Frontend (Patron Kiosk)**: Built with React 19, Vite, and Shadcn UI. Deployed to Cloudflare Pages.
- **Backend**: Hono (TypeScript) running on Cloudflare Workers.
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS) and RPC functions.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher.
- **Supabase Account**: For database and authentication services.
- **Cloudflare Account**: For deployment using Wrangler.

### 1. Installation

Install dependencies for all components:

```bash
# Install root dependencies
npm install

# Install sub-project dependencies
cd admin && npm install
cd ../kiosk && npm install
cd ../backend && npm install
```

### 2. Local Development

Run the development servers:

```bash
# Run Admin
npm run dev:admin

# Run Kiosk
npm run dev:kiosk

# Run Backend
npm run dev:backend
```

### 3. Deployment

Deploy to Cloudflare using Wrangler:

```bash
# Deploy Admin
npm run deploy:admin

# Deploy Kiosk
npm run deploy:kiosk

# Deploy Backend
npm run deploy:backend
```

For more detailed information, see [cloudflare_deployment.md](./cloudflare_deployment.md).

## 🛠️ Key Features

- **Advanced Cataloging**: MARC-compatible book management.
- **Student Kiosk**: Interactive wayfinding and search.
- **Librarian Dashboard**: Real-time analytics and circulation management.
- **Security**: Granular access control using Supabase RLS.
- **Modern UI**: Dark-mode support, responsive design, and premium aesthetics.
