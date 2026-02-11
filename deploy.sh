#!/bin/bash
# ─────────────────────────────────────────────────
# BillWise Deployment Script
# Run from your local machine: ./deploy.sh
# ─────────────────────────────────────────────────

set -e

# ─── Configuration ───────────────────────────────
EC2_IP="54.235.24.234"
PEM_FILE="$HOME/Downloads/test-tan-bill.pem"
EC2_USER="ubuntu"
APP_DIR="/home/ubuntu/billwise"
# ─────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}   BillWise Deployment Script${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""

# ─── Validate config ─────────────────────────────
if [ "$EC2_IP" = "YOUR_EC2_IP_HERE" ]; then
  echo -e "${RED}ERROR: Edit deploy.sh and set EC2_IP to your Elastic IP.${NC}"
  exit 1
fi

if [ ! -f "$PEM_FILE" ]; then
  echo -e "${RED}ERROR: PEM file not found at $PEM_FILE${NC}"
  echo "Update the PEM_FILE path in deploy.sh"
  exit 1
fi

# ─── Step 1: Push local changes to GitHub ────────
echo -e "${YELLOW}[1/4] Checking for local changes...${NC}"

cd "$(dirname "$0")"

if [ -n "$(git status --porcelain)" ]; then
  echo "  Uncommitted changes found. Committing..."
  git add -A
  echo -n "  Commit message (or press Enter for default): "
  read -r MSG
  MSG="${MSG:-Update app}"
  git commit -m "$MSG"
  echo -e "  ${GREEN}Committed.${NC}"
else
  echo "  No uncommitted changes."
fi

echo "  Pushing to GitHub..."
git push origin main
echo -e "  ${GREEN}Pushed to GitHub.${NC}"

# ─── Step 2: SSH into EC2 and deploy ─────────────
echo ""
echo -e "${YELLOW}[2/4] Pulling latest code on EC2...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE_SCRIPT'
  set -e
  cd /home/ubuntu/billwise

  echo "  Pulling from GitHub..."
  git pull origin main

  echo "  Installing dependencies..."
  npm install --production

REMOTE_SCRIPT

echo -e "  ${GREEN}Code updated on EC2.${NC}"

# ─── Step 3: Restart the app ─────────────────────
echo ""
echo -e "${YELLOW}[3/4] Restarting app with PM2...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE_SCRIPT'
  set -e
  cd /home/ubuntu/billwise
  pm2 restart billwise
  sleep 2
  pm2 status
REMOTE_SCRIPT

echo -e "  ${GREEN}App restarted.${NC}"

# ─── Step 4: Quick health check ──────────────────
echo ""
echo -e "${YELLOW}[4/4] Health check...${NC}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_IP" --max-time 10 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}App is live at http://$EC2_IP (HTTP $HTTP_CODE)${NC}"
else
  echo -e "  ${RED}Warning: Got HTTP $HTTP_CODE from http://$EC2_IP${NC}"
  echo "  Check logs with: ssh -i $PEM_FILE $EC2_USER@$EC2_IP 'pm2 logs billwise --lines 20'"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
