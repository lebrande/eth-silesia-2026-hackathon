#!/bin/bash
# Wait for PrestaShop container to be ready, then rename admin folder

CONTAINER=$(docker ps --filter "ancestor=prestashop/prestashop:8-apache" -q)

if [ -z "$CONTAINER" ]; then
  echo "PrestaShop container not running. Start it first:"
  echo "  docker compose --profile prestashop up -d"
  exit 1
fi

echo "Waiting for PrestaShop to be ready..."
until docker exec "$CONTAINER" test -d /var/www/html/admin 2>/dev/null; do
  sleep 2
done

docker exec "$CONTAINER" mv /var/www/html/admin /var/www/html/admin-dev 2>/dev/null

if docker exec "$CONTAINER" test -d /var/www/html/admin-dev; then
  echo "Done. Admin: http://localhost:8080/admin-dev/"
else
  echo "admin-dev already exists."
fi
