# Cloudflare Deployment Guide (GitHub Integrated)

This guide provides the official build and deployment configuration for the **Thomian Library System** monorepo on Cloudflare.

## 🏛️ Architecture Overview

The system is now a stable **Vite + Hono** stack:
- **Admin Portal**: Vite (React) -> Cloudflare Pages
- **Patron Kiosk**: Vite (React) -> Cloudflare Pages
- **Backend Engine**: Hono (TypeScript) -> Cloudflare Workers

---

## 🏗️ 1. Patron Kiosk (`thomian-kiosk`)

Follow these settings in the **Cloudflare Pages** dashboard after connecting your GitHub repository.

- **Production branch**: `main`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `kiosk`

### Environment Variables
Set these under **Settings > Functions > Compatibility Flags** or **Environment Variables**:
- `NODE_VERSION`: `20`
- `PNPM_VERSION`: `9` (if using pnpm, else leave default)

---

## 🏗️ 2. Admin Portal (`thomian-admin`)

- **Production branch**: `main`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `admin`

### Environment Variables
- `NODE_VERSION`: `20`

---

## ⚙️ 3. Backend Engine (`thomian-backend`)

The backend runs as a Cloudflare Worker and is usually deployed via CLI, but can be integrated into GitHub Actions.

### Manual Command
```bash
cd backend
npx wrangler deploy
```

### GitHub Actions (Continuous Deployment)
Create `.github/workflows/deploy-backend.yml`:
```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['backend/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd backend && npm install && npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## 🛠️ Troubleshooting common build errors

### "PostCSS config failed: module is not defined"
Ensure `postcss.config.cjs` is used instead of `.js` (already fixed in `kiosk`).

### "Root directory not found"
Ensure the **Root directory** in Cloudflare is set correctly to the folder name (`kiosk` or `admin`).

### "Failed to compile: It looks like you're trying to use tailwindcss directly..."
This happens with Tailwind v4. The system is already updated to use `@tailwindcss/vite` or `@tailwindcss/postcss`.

---

> [!NOTE]
> Since we moved from Next.js to Vite, you **no longer need** OpenNext or any worker-side logic for the Kiosk. It is now a highly efficient static asset deployment.
