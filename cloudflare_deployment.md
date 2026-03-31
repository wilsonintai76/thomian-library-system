# Cloudflare Pages Monorepo Deployment

Because your project is a **Monorepo** (meaning multiple websites live inside one GitHub repository folder), you will need to create **two separate projects** in Cloudflare Pages. Both projects will connect to the exact same GitHub repository, but they will look at different subfolders to build different apps.

Here is the exact setup you need for both:

---

## 🏗️ Project 1: The Patron Kiosk
This project will build the `kiosk` subfolder (which is a Next.js 15 application) and host it on your main domain.

1. In Cloudflare, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**
2. Select the `thomian-library-system` repository.
3. Configure the build settings exactly like this:
   - **Project name**: `thomian-kiosk`
   - **Production branch**: `main`
   - **Framework preset**: `Next.js`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory (/):** `kiosk` *(<-- THIS IS CRITICAL)*
4. Under **Environment Variables (Advanced)**, add the exact variables from your `kiosk/.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://...`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `sb_publishable_...`
5. Click **Save and Deploy**. Once it builds, go to Custom Domains and attach `www.thomian-lib.com`.

---

## 🏗️ Project 2: The Admin Portal
This project will build the `admin` subfolder (which is a Vite/React application) and host it on your staff subdomain.

1. Go back to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**
2. Select the **same** `thomian-library-system` repository again.
3. Configure the build settings exactly like this:
   - **Project name**: `thomian-admin`
   - **Production branch**: `main`
   - **Framework preset**: `Vite` (or `React`)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory (/):** `admin` *(<-- THIS IS CRITICAL)*
4. Under **Environment Variables (Advanced)**, add the exact variables from your `admin/.env` file:
   - `VITE_SUPABASE_URL` = `https://...`
   - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` = `sb_publishable_...`
5. Click **Save and Deploy**. Once it builds, go to Custom Domains and attach `admin.thomian-lib.com`.

---

## 🚀 How Updates Work From Now On
Because of this "Monorepo" setup, whenever you push an update to GitHub to the `main` branch, Cloudflare will automatically detect the changes.
- If you edit a file inside the `kiosk` folder, only the Kiosk website will re-build.
- If you edit a file inside the `admin` folder, only the Admin website will re-build.
 
---
 
## ⚠️ Troubleshooting Builds
 
### Error: "Failed: root directory not found"
This usually means Cloudflare Pages is searching for a folder that doesn't exactly match your repository structure.
 
1. **Case-Sensitivity**: Cloudflare's **Root directory (/)** setting is case-sensitive. Ensure it is set to **`kiosk`** or **`admin`** in all lowercase.
2. **Project Name**: If you renamed your Page project in Cloudflare, ensure the **Production branch** is still set to **`main`**.
3. **CLI Escape Valve**: If the GitHub automated build continues to fail, you can deploy directly from your terminal using:
   ```bash
   cd kiosk
   npm run build
   npx wrangler pages deploy .next --project-name=thomian-kiosk
   ```
   This will bypass the GitHub directory mapping and upload your local build directly.
