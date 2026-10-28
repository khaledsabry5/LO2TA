#!/usr/bin/env bash
# ==============================================================
# YSN Store - Fast Automated Redeployment Script
# ==============================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}🚀 Pulling latest changes from git repository...${NC}"
git pull origin main

echo -e "${BLUE}📦 Building updated containers and restarting services...${NC}"
docker compose up -d --build

echo -e "${BLUE}🧹 Pruning unused Docker build images...${NC}"
docker image prune -f

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
docker compose ps
