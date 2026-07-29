# Deployment Checklist

## Required environment

- PHP 8.3 or newer with PostgreSQL, GD, DOM, and fileinfo extensions.
- PostgreSQL database.
- A persistent queue worker.
- A cron entry for Laravel's scheduler.
- HTTPS in production.

## Environment variables

Set production values for:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL`
- `APP_TIMEZONE=Africa/Dar_es_Salaam`
- `DB_*`
- `QUEUE_CONNECTION=database`
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
QUEUE_CONNECTION=database
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
cd frontend && npm ci && npm run build
```

Run the queue worker under a process supervisor:

```bash
php artisan queue:work --tries=3 --timeout=120
```

Run the scheduler every minute:

```cron
* * * * * cd /path/to/viva && php artisan schedule:run >> /dev/null 2>&1
```

## Verification

- Check `GET /up`.
- Run `php artisan schedule:list`.
- Confirm the queue worker processes a test email.
- Confirm private certificate/material URLs require authentication.
- Confirm `storage` and `bootstrap/cache` are writable.
- Back up PostgreSQL and `storage/app/private` together.
