# Deployment Checklist

## Required environment

- PHP 8.3 or newer with PostgreSQL, GD, DOM, and fileinfo extensions.
- PostgreSQL database.
- Redis and the PHP Redis extension.
- A persistent Horizon process managed by Supervisor or an equivalent process monitor.
- A cron entry for Laravel's scheduler.
- HTTPS in production.

## Environment variables

Set production values for:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL`
- `APP_TIMEZONE=Africa/Dar_es_Salaam`
- `DB_*`
- `QUEUE_CONNECTION=redis`
- `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`
- `REDIS_QUEUE_RETRY_AFTER=180`
- `HORIZON_MAX_PROCESSES` (start with `5` and tune for the server)
- `MAIL_*`
- `VIVA_MANAGER_EMAIL`
- `VIVA_MANAGER_PASSWORD`
- `VIVA_ADMIN_EMAIL`
- `VIVA_ADMIN_PASSWORD`
- `VITE_API_URL`

Initial staff passwords must be strong and changed after first deployment.

## Email delivery

Website enquiries queue two emails: one alert to all approved managers/admins and
one confirmation to the visitor. Configure a real SMTP account:

```dotenv
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_FROM_ADDRESS=no-reply@vivadigitalcenter.com
MAIL_FROM_NAME="VIVA DIGITAL CENTER"
QUEUE_CONNECTION=redis
```

The sender address must be accepted or verified by the SMTP provider. For Gmail,
use `smtp.gmail.com`, the full Gmail address as the username, and a Google App
Password rather than the normal account password.

## Release commands

```bash
composer install --no-dev --classmap-authoritative
php artisan migrate --force
php artisan db:seed --force
php artisan optimize
php artisan horizon:terminate
cd frontend && npm ci && npm run build
```

`horizon:terminate` gracefully stops the old Horizon master after a release. The
process monitor then starts a fresh process that uses the new code and cached
configuration.

Run Horizon under Supervisor. Replace the project path and operating-system user:

```ini
[program:viva-horizon]
process_name=%(program_name)s
command=php /path/to/viva/artisan horizon
directory=/path/to/viva
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/path/to/viva/storage/logs/horizon.log
stopwaitsecs=3600
```

Load and start that configuration:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start viva-horizon
```

`stopwaitsecs` must be longer than the longest job so Supervisor does not kill a
job during deployment. Horizon itself uses the worker settings in
`config/horizon.php`; do not add separate `queue:work` processes.

Run the scheduler every minute:

```cron
* * * * * cd /path/to/viva && php artisan schedule:run >> /dev/null 2>&1
```

## Verification

- Check `GET /up`.
- Check `php artisan horizon:status`.
- Open `/horizon` locally and confirm queued, completed, and failed jobs appear.
- Run `php artisan schedule:list`.
- Confirm Horizon processes a test email.
- Confirm private certificate/material URLs require authentication.
- Confirm `storage` and `bootstrap/cache` are writable.
- Back up PostgreSQL and `storage/app/private` together.
