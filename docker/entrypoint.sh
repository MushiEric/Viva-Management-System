#!/bin/sh
set -e

echo "==> Starting Viva Digital Center application startup sequence..."

# Configure Nginx to listen on both standard Port 80 AND dynamic $PORT (8080)
LISTEN_PORT="${PORT:-8080}"
echo "==> Configuring Nginx to listen on ports 80 and ${LISTEN_PORT}..."
if [ -f /etc/nginx/http.d/default.conf ]; then
    if [ "$LISTEN_PORT" != "80" ]; then
        sed -i -E "s/listen 80;/listen 80;\n    listen ${LISTEN_PORT};/g" /etc/nginx/http.d/default.conf
    fi
    nginx -t
fi

# Support Railway's DATABASE_URL automatically
if [ -n "$DATABASE_URL" ] && [ -z "$DB_URL" ]; then
    export DB_URL="$DATABASE_URL"
fi

# Support Railway's REDIS_URL automatically
if [ -n "$REDIS_URL" ] && [ -z "$REDIS_QUEUE_CONNECTION" ]; then
    export QUEUE_CONNECTION=redis
fi

# Fix directory permissions for Laravel storage and cache
mkdir -p /var/www/html/storage/framework/cache/data \
         /var/www/html/storage/framework/sessions \
         /var/www/html/storage/framework/views \
         /var/www/html/storage/logs \
         /var/www/html/bootstrap/cache

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# If using SQLite and database file doesn't exist, create it
if [ "${DB_CONNECTION}" = "sqlite" ]; then
    SQLITE_DB="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    mkdir -p "$(dirname "$SQLITE_DB")"
    if [ ! -f "$SQLITE_DB" ]; then
        echo "==> Creating SQLite database at $SQLITE_DB..."
        touch "$SQLITE_DB"
        chown www-data:www-data "$SQLITE_DB"
    fi
fi

# If using external DB (PostgreSQL/MySQL), wait for connection if DB_HOST is explicitly provided
if [ -n "$DB_HOST" ] && [ "$DB_CONNECTION" != "sqlite" ]; then
    echo "==> Waiting for database at $DB_HOST:${DB_PORT:-5432}..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    until nc -z -v -w5 "$DB_HOST" "${DB_PORT:-5432}" 2>/dev/null || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
        echo "Waiting for database connection... ($((RETRY_COUNT++))/$MAX_RETRIES)"
        sleep 2
    done
fi

echo "==> Running Laravel Database Migrations..."
php /var/www/html/artisan migrate --force --no-interaction || echo "Migration warning encountered, continuing..."

echo "==> Optimizing Laravel application caches..."
if [ -z "$APP_KEY" ]; then
    echo "==> Warning: APP_KEY environment variable is missing. Generating key..."
    export APP_KEY=$(php /var/www/html/artisan key:generate --show)
fi
php /var/www/html/artisan config:cache
php /var/www/html/artisan route:cache
php /var/www/html/artisan view:cache

echo "==> Setting final storage permissions for www-data..."
touch /var/www/html/storage/logs/laravel.log
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 777 /var/www/html/storage/logs

echo "==> Launching Supervisor (PHP-FPM + Nginx + Queue Worker)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
