#!/bin/bash

# SCA Academia - Production Server Script for Ubuntu (using PM2)
# This script uses PM2 for process management and logs
# Better for production environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SCA Academia - Production Server Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"

# Check/Install PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2 globally...${NC}"
    sudo npm install -g pm2
    pm2 startup
    pm2 save
fi

echo -e "${GREEN}✓ PM2: $(pm2 --version)${NC}"

cd "$SCRIPT_DIR"

# Install dependencies
echo -e "${YELLOW}\n📦 Checking dependencies...${NC}"

if [ ! -d "backend/node_modules" ]; then
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"

# Stop existing PM2 apps if running
echo -e "${YELLOW}\n🛑 Stopping any existing processes...${NC}"
pm2 stop sca-backend sca-frontend 2>/dev/null || true

# Start Backend with PM2
echo -e "${YELLOW}\n🚀 Starting Backend...${NC}"
mkdir -p "$SCRIPT_DIR/backend/logs"
pm2 start "$SCRIPT_DIR/backend/server.js" \
  --name "sca-backend" \
  --cwd "$SCRIPT_DIR/backend" \
  -e "$SCRIPT_DIR/backend/logs/error.log" \
  -o "$SCRIPT_DIR/backend/logs/output.log"

# Start Frontend with PM2
echo -e "${YELLOW}\n🚀 Starting Frontend...${NC}"
mkdir -p "$SCRIPT_DIR/frontend/logs"
cd "$SCRIPT_DIR/frontend"
pm2 start npm \
  --name "sca-frontend" \
  -e "$SCRIPT_DIR/frontend/logs/error.log" \
  -o "$SCRIPT_DIR/frontend/logs/output.log" \
  -- run preview

# Save PM2 process list
pm2 save

# Display info
echo -e "${BLUE}\n========================================${NC}"
echo -e "${GREEN}✅ Servers started with PM2!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\n${YELLOW}Running Processes:${NC}"
pm2 list

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo "  View logs:     ${YELLOW}pm2 logs${NC}"
echo "  Monitor:       ${YELLOW}pm2 monit${NC}"
echo "  Stop all:      ${YELLOW}pm2 stop sca${NC}"
echo "  Restart all:   ${YELLOW}pm2 restart sca${NC}"
echo "  Kill all:      ${YELLOW}pm2 kill${NC}"

echo -e "\n${BLUE}========================================${NC}"
