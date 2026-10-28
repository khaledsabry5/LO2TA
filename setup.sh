#!/usr/bin/env bash
# ==============================================================
# YSN Store - Automated Deployment Script for Ubuntu VPS
# Target Domain: ysn-store.cloud
# ==============================================================

set -e

# Colors for readable console output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================${NC}"
echo -e "${BLUE}       YSN Store - Automated VPS Deployment Setup             ${NC}"
echo -e "${BLUE}==============================================================${NC}"

# 1. Require Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root or with sudo:${NC} sudo ./setup.sh"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Update System Packages & Install Prerequisites
echo -e "\n${YELLOW}[1/6] Updating system packages & installing prerequisites...${NC}"
apt-get update -y
apt-get install -y --no-install-recommends \
    curl \
    git \
    openssl \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw

# 3. Install Docker & Docker Compose Plugin (if not already installed)
echo -e "\n${YELLOW}[2/6] Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}Installing Docker Engine & Docker Compose plugin...${NC}"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
    echo -e "${GREEN}Docker installed successfully.${NC}"
else
    echo -e "${GREEN}Docker is already installed ($(docker --version)).${NC}"
fi

# 4. Configure UFW Firewall (Allow SSH, HTTP, HTTPS)
echo -e "\n${YELLOW}[3/6] Configuring UFW Firewall...${NC}"
ufw allow OpenSSH || ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured: Ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) are open.${NC}"

# 5. Prepare Environment Configuration (.env)
echo -e "\n${YELLOW}[4/6] Verifying environment configuration (.env)...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Copying from .env.example...${NC}"
    cp .env.example .env
    
    # Generate a cryptographically secure JWT_SECRET
    RANDOM_JWT=$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 48)
    sed -i "s/replace_with_a_very_long_secure_random_secret_key_here/${RANDOM_JWT}/" .env

    echo -e "${GREEN}Created .env with newly generated JWT_SECRET.${NC}"
    echo -e "${YELLOW}[NOTE] Please review and add your Cloudinary/Brevo keys in .env if needed.${NC}"
else
    echo -e "${GREEN}.env file already exists.${NC}"
fi

# Load domain and email settings from .env
DOMAIN_NAME=$(grep -E '^DOMAIN_NAME=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "ysn-store.cloud")
CERTBOT_EMAIL=$(grep -E '^CERTBOT_EMAIL=' .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" || echo "lo2tastore2026@gmail.com")
DOMAIN_NAME=${DOMAIN_NAME:-ysn-store.cloud}
CERTBOT_EMAIL=${CERTBOT_EMAIL:-lo2tastore2026@gmail.com}

# Create necessary directories
mkdir -p certbot/conf/live/"$DOMAIN_NAME" certbot/www nginx/conf.d backend/uploads backend/static
chmod -R 755 certbot/www backend/uploads backend/static

# 6. SSL Certificate Pre-flight (Generate dummy cert if certificates don't exist yet)
echo -e "\n${YELLOW}[5/6] Checking SSL certificates for ${DOMAIN_NAME}...${NC}"
CERT_FILE="certbot/conf/live/${DOMAIN_NAME}/fullchain.pem"
KEY_FILE="certbot/conf/live/${DOMAIN_NAME}/privkey.pem"

HAS_REAL_CERT=false
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo -e "${GREEN}Existing SSL certificates detected for ${DOMAIN_NAME}.${NC}"
    HAS_REAL_CERT=true
else
    echo -e "${BLUE}Generating temporary fallback certificates to allow Nginx to start...${NC}"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/CN=localhost" \
        2>/dev/null
    echo -e "${GREEN}Temporary fallback certificates created.${NC}"
fi

# 7. Build and Start Docker Containers
echo -e "\n${YELLOW}[6/6] Building and starting application containers...${NC}"
docker compose down --remove-orphans || true
docker compose up -d --build

echo -e "\n${BLUE}Waiting for Nginx to become ready...${NC}"
sleep 5

# 8. Request Real Let's Encrypt Certificate if not already present
if [ "$HAS_REAL_CERT" = false ]; then
    echo -e "\n${BLUE}Attempting to obtain official Let's Encrypt SSL certificates for ${DOMAIN_NAME}...${NC}"
    
    # Remove dummy cert before requesting real certificate
    rm -rf "certbot/conf/live/${DOMAIN_NAME}"
    rm -rf "certbot/conf/archive/${DOMAIN_NAME}"
    rm -rf "certbot/conf/renewal/${DOMAIN_NAME}.conf"

    if docker compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot \
        -d ${DOMAIN_NAME} -d www.${DOMAIN_NAME} \
        --email ${CERTBOT_EMAIL} \
        --rsa-key-size 4096 \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        --non-interactive" certbot; then
        
        echo -e "${GREEN}Official SSL certificate successfully issued by Let's Encrypt!${NC}"
        docker compose exec nginx nginx -s reload
    else
        echo -e "${YELLOW}==============================================================${NC}"
        echo -e "${YELLOW}[WARNING] Let's Encrypt verification could not complete.${NC}"
        echo -e "${YELLOW}Reason: Domain DNS (A Record) may not yet point to this server's public IP.${NC}"
        SERVER_IP=$(curl -s -4 ifconfig.me || curl -s icanhazip.com || echo "your_server_ip")
        echo -e "Make sure DNS A Records point to this VPS IP: ${GREEN}${SERVER_IP}${NC}"
        echo -e "  - ${DOMAIN_NAME}     -> ${SERVER_IP}"
        echo -e "  - www.${DOMAIN_NAME} -> ${SERVER_IP}"
        echo -e "Once DNS propagates, simply run: ${GREEN}./get-ssl.sh${NC}"
        echo -e "${YELLOW}==============================================================${NC}"
        
        # Restore fallback cert so Nginx stays up
        mkdir -p "certbot/conf/live/${DOMAIN_NAME}"
        openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
            -keyout "$KEY_FILE" \
            -out "$CERT_FILE" \
            -subj "/CN=${DOMAIN_NAME}" \
            2>/dev/null
        docker compose restart nginx
    fi
fi

# 9. Summary & Status
echo -e "\n${GREEN}==============================================================${NC}"
echo -e "${GREEN}🎉 YSN Store deployment finished successfully!                ${NC}"
echo -e "${GREEN}==============================================================${NC}"
echo -e "🌐 Storefront Website:  ${BLUE}https://${DOMAIN_NAME}${NC}"
echo -e "⚙️  Backend API:         ${BLUE}https://${DOMAIN_NAME}/api${NC}"
echo -e "📖 Interactive Docs:    ${BLUE}https://${DOMAIN_NAME}/docs${NC}"
echo -e "📊 Container Status:"
docker compose ps
echo -e "\n${BLUE}Useful Commands:${NC}"
echo -e "  - View live logs:      ${YELLOW}docker compose logs -f${NC}"
echo -e "  - Restart services:    ${YELLOW}docker compose restart${NC}"
echo -e "  - Re-run SSL setup:    ${YELLOW}./get-ssl.sh${NC}"
echo -e "  - Fast update/deploy:  ${YELLOW}./deploy.sh${NC}"
echo -e "${GREEN}==============================================================${NC}\n"
