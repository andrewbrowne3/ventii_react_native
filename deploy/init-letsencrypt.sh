#!/bin/bash
# One-time TLS bootstrap for ventii.andrewbrowne.org.
#
# Solves the chicken-and-egg problem: nginx won't start without a cert, but
# certbot needs nginx running to answer the ACME challenge. We drop a dummy
# self-signed cert in place, start nginx, then replace it with the real one.
#
# Run from the repo root:  ./deploy/init-letsencrypt.sh
# Re-running is safe: pass FORCE=1 to overwrite an existing certificate.
set -e

DOMAIN="ventii.andrewbrowne.org"
EMAIL="${CERTBOT_EMAIL:-andrewb.andrewslearning@gmail.com}"
STAGING="${STAGING:-0}"          # 1 = Let's Encrypt staging (for testing, avoids rate limits)
COMPOSE="docker compose -f docker-compose.prod.yml"
DATA_PATH="./deploy/certbot"

if [ -d "$DATA_PATH/conf/live/$DOMAIN" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "Certificate for $DOMAIN already exists. Set FORCE=1 to replace it."
  exit 0
fi

echo "### Downloading recommended TLS parameters ..."
mkdir -p "$DATA_PATH/conf" "$DATA_PATH/www"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
  > "$DATA_PATH/conf/options-ssl-nginx.conf"
curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
  > "$DATA_PATH/conf/ssl-dhparams.pem"

echo "### Creating a dummy certificate so nginx can start ..."
LIVE_PATH="/etc/letsencrypt/live/$DOMAIN"
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '$LIVE_PATH/privkey.pem' \
    -out '$LIVE_PATH/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Starting nginx ..."
$COMPOSE up -d nginx backend

echo "### Deleting the dummy certificate ..."
$COMPOSE run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### Requesting the real Let's Encrypt certificate for $DOMAIN ..."
STAGING_ARG=""
if [ "$STAGING" != "0" ]; then STAGING_ARG="--staging"; fi
$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "### Reloading nginx with the real certificate ..."
$COMPOSE exec nginx nginx -s reload

echo "### Done. https://$DOMAIN should now be live."
