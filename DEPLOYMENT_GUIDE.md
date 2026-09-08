# Viva Digital Center - Low-Cost Production Deployment Guide

This guide details how to deploy the Viva Digital Center application to low-cost hosting platforms.

---

## Recommended Deployment Options

### Option 1: Hetzner Cloud / DigitalOcean VPS ($3.50 – $4/mo) [RECOMMENDED]

A small VPS provides **guaranteed uptime**, zero cold starts (instant response even after weeks of being idle), and enough RAM (1GB–4GB) to comfortably host PostgreSQL, Redis, Nginx, and PHP.

#### Step-by-Step Instructions:

1. **Provision a VPS:**
   - Create an instance on **Hetzner Cloud** (CX22 / CAX11 for ~€3.79/mo) or **DigitalOcean** ($4-$6/mo droplet).
   - Select Ubuntu 24.04 LTS or Debian 12.

2. **Install Docker & Docker Compose:**
   ```bash
   ssh root@YOUR_SERVER_IP
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Clone Your Repository & Setup Environment:**
   ```bash
   git clone <YOUR_GIT_REPO_URL> /opt/viva
   cd /opt/viva
   cp .env.production.example .env
   # Edit .env and set strong passwords & APP_KEY
   php -r "echo 'base64:'.base64_encode(random_bytes(32));" # or copy APP_KEY from local
   ```

4. **Launch Application:**
   ```bash
   docker compose up -d --build
   ```

5. **Setup Free SSL Certificate (HTTPS) via Caddy or Certbot:**
   Install Caddy for automatic Let's Encrypt SSL:
   ```bash
   sudo apt install -y caddy
   ```
   Add to `/etc/caddy/Caddyfile`:
   ```caddy
   your-domain.com {
       reverse_proxy 127.0.0.1:80
   }
   ```
   Run `sudo systemctl reload caddy`. Your app will be live with free SSL certificates!

---

### Option 2: Self-Hosted Coolify on $4/mo VPS

[Coolify](https://coolify.io) is an open-source, self-hosted alternative to Heroku / Vercel.

1. On a fresh $4 VPS, run:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
2. Open `http://YOUR_SERVER_IP:8000`.
3. Add your Git repository.
4. Select **Docker Compose** or **Dockerfile** build. Coolify handles automatic deployments, SSL certificates, and database management automatically with a slick dashboard UI.

---

### Option 3: Container Hosting (Fly.io / Render)

If you prefer managed containers without managing a server:

#### Fly.io:
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run `fly launch` inside the project root (Fly auto-detects the `Dockerfile`).
3. Set environment variables using `fly secrets set APP_KEY=...`.
4. Deploy using `fly deploy`.

---

## Maintenance & Commands

- **Check logs:** `docker compose logs -f app`
- **Run migrations manually:** `docker compose exec app php artisan migrate`
- **Clear cache:** `docker compose exec app php artisan cache:clear`
- **Restart services:** `docker compose restart`
