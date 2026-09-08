# Deploying Viva Digital Center to Railway 🚀

Railway is an excellent low-cost PaaS choice for this project. It automatically manages SSL certificates, database connections, container deployment, and auto-sleep/wake rules.

---

## 📋 Pre-Deployment Checklist
Make sure you have pushed your project (including `Dockerfile`, `railway.json`, and `docker/entrypoint.sh`) to your GitHub repository.

---

## 🛠️ Step-by-Step Railway Setup Guide

### 1. Create a New Project on Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **+ New Project**.
3. Select **Deploy from GitHub repo**.
4. Search for and select your **viva** repository.

---

### 2. Add PostgreSQL Database
1. In your Railway project canvas, click **+ New** (or press `Ctrl+K`).
2. Select **Database** -> **Add PostgreSQL**.
3. Railway will provision a dedicated PostgreSQL database container in seconds.

---

### 3. (Optional) Add Redis Database
For background email queueing and real-time processing:
1. Click **+ New** -> **Database** -> **Add Redis**.
2. Railway will provision a Redis instance.

---

### 4. Configure Environment Variables
1. Click on your **Viva App Service** in the Railway canvas.
2. Navigate to the **Variables** tab.
3. Click **New Variable** (or **Raw Editor**) and set the following:

```env
APP_NAME=Viva Digital Center
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:SET_YOUR_32_CHAR_BASE64_KEY_HERE
APP_URL=https://${RAILWAY_PUBLIC_DOMAIN}
FRONTEND_URL=https://${RAILWAY_PUBLIC_DOMAIN}
DB_CONNECTION=pgsql
DB_URL=${{ Postgres.DATABASE_URL }}
PORTAL_EMAIL_NOTIFICATIONS_ENABLED=false
APP_TIMEZONE=Africa/Dar_es_Salaam
```

> 💡 **Tip:** `${{ Postgres.DATABASE_URL }}` allows Railway to automatically inject your database credentials without hardcoding passwords!

---

### 5. Generate Public Domain & Deploy
1. In your Viva App Service, go to **Settings** -> **Networking** (or **Public Networking**).
2. Click **Generate Domain**.
3. Railway will issue a free custom domain with SSL (e.g. `viva-production.up.railway.app`).
4. Railway will automatically build the `Dockerfile` and launch your app!

---

## ⚡ What Happens Automatically on Deployment?

1. **Vite SPA Build**: Node.js compiles the React frontend assets.
2. **Laravel PHP-FPM Setup**: PHP 8.3 installs all dependencies and extensions.
3. **Database Migration**: The container automatically connects to PostgreSQL and runs `php artisan migrate --force`.
4. **Cache Optimization**: Runs `config:cache`, `route:cache`, and `view:cache`.
5. **Unified Server**: Nginx serves the React SPA at `/` and proxies API requests to Laravel at `/api/v1/*`.

---

## 🔍 Diagnostics & Command Execution

If you need to view logs or run manual commands:
- **View Container Logs**: Go to **Deployments** -> **View Logs** tab in Railway.
- **Run Artisan Commands**:
  Use Railway CLI locally:
  ```bash
  railway run php artisan db:seed
  ```
