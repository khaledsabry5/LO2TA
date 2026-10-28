#!/usr/bin/env bash
# ==============================================================
# YSN Store - Standalone Let's Encrypt SSL Certificate Setup
# Domain: ysn-store.cloud
# ==============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run with sudo or as root:${NC} sudo ./get-ssl.sh"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if [ ! -f .env ]; then
    echo -e "${RED}[ERROR] .env file not found. Please create it first.${NC}"
    exit 1
fi

DOMAIN_NAME=$(grep -E '^DOMAIN_NAME=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "ysn-store.cloud")
CERTBOT_EMAIL=$(grep -E '^CERTBOT_EMAIL=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "lo2tastore2026@gmail.com")
DOMAIN_NAME=${DOMAIN_NAME:-ysn-store.cloud}
CERTBOT_EMAIL=${CERTBOT_EMAIL:-lo2tastore2026@gmail.com}

echo -e "${BLUE}Requesting Let's Encrypt SSL certificate for ${DOMAIN_NAME} and www.${DOMAIN_NAME}...${NC}"

docker compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot \
    -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME} \
    --email ${CERTBOT_EMAIL} \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    --non-interactive" certbot

echo -e "${GREEN}Reloading Nginx with new certificate...${NC}"
docker compose exec nginx nginx -s reload

echo -e "${GREEN}✅ SSL certificate is now active for https://${DOMAIN_NAME}!${NC}"
