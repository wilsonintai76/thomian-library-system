# Cloudflare Deployment Guide (GitHub Integrated)

This guide provides the official build and deployment configuration for the **Thomian Library System** on Cloudflare.

## 🏛️ Architecture Overview

The system is a fully integrated **Cloudflare Native** stack:
- **Admin Portal**: Vite (React) -> Cloudflare Pages
- **Patron Kiosk**: Vite (React) -> Cloudflare Pages
- **Backend Engine**: Hono (TypeScript) -> Cloudflare Workers

---

## 🌐 Custom Domains

The following domains must be configured in the Cloudflare Dashboard:
1.  **Patron Kiosk**: `www.thomian-lib.com` (Cloudflare Pages)
2.  **Admin Portal**: `admin.thomian-lib.com` (Cloudflare Pages)
3.  **Backend API**: (e.g. `api.thomian-lib.com`) (Cloudflare Workers)

---

## 🏗️ 1. Patron Kiosk (`thomian-kiosk`)

**Cloudflare Pages** settings:
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `kiosk`
- **Compatibility Flags**: `nodejs_compat` (for Hono client)

### Custom Domain
- Go to **Custom Domains** tab and add `www.thomian-lib.com`.

---

## 🏗️ 2. Admin Portal (`thomian-admin`)

**Cloudflare Pages** settings:
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `admin`
- **Compatibility Flags**: `nodejs_compat`

### Custom Domain
- Go to **Custom Domains** tab and add `admin.thomian-lib.com`.

---

## ⚙️ 3. Backend Engine (`thomian-backend`)

The backend is a Cloudflare Worker using **Hono** and **Drizzle**.

### Bindings & Resources
Ensure these are configured in `wrangler.jsonc` and the Cloudflare Dashboard:
- **D1 Database**: Binding name `DB` (Project: `thomian-db`)
- **R2 Bucket**: Binding name `R2` (Bucket: `thomian-assets`)
- **KV Namespace**: Binding name `KV` (for caching/state)
- **Workers AI**: Binding name `AI` (for DDC classification)

### Environment Variables
- `JWT_SECRET`: A secure string for signing session tokens.
- `NODE_VERSION`: `20`

### Manual Deployment
```bash
cd backend
npx wrangler deploy
```

---

## 🛠️ Build & Tooling Notes

### Tailwind CSS v4
The system uses **Tailwind v4**. Cloudflare Pages uses individual root directories (`kiosk/`, `admin/`) where Tailwind v4 is integrated via `@tailwindcss/vite`. No manual PostCSS configuration is required.

### React 19
Both frontends run on **React 19**. Ensure `NODE_VERSION` is set to `20+` in both Pages projects to support the latest dependencies.

---

> [!IMPORTANT]
> **Static Asset Optimization**: Since moving from Next.js to Vite, the Kiosk is now a purely static set of assets. This significantly improves load times and reduces Worker usage costs.
