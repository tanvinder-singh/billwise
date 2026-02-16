#!/bin/bash
# ─────────────────────────────────────────────────────────
# Rupiya — Code Deployment Script
# Run from your local machine:  chmod +x deploy.sh && ./deploy.sh
#
# Prerequisites: Run setup.sh first on a fresh EC2 instance.
# This script only handles: commit → push → pull → restart
# ─────────────────────────────────────────────────────────

set -e

# ─── Configuration (must match setup.sh) ─────────────────
EC2_IP="107.22.33.194"
PEM_FILE="$HOME/Downloads/rupiya.pem"
EC2_USER="ubuntu"
APP_DIR="/home/ubuntu/billwise"
# ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}   Rupiya — Deploy Code${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""

# ─── Validate ────────────────────────────────────────────
if [ ! -f "$PEM_FILE" ]; then
  echo -e "${RED}ERROR: PEM file not found at $PEM_FILE${NC}"
  exit 1
fi

# ─── Step 1: Commit & push local changes ────────────────
echo -e "${YELLOW}[1/4] Pushing local changes to GitHub...${NC}"

cd "$(dirname "$0")"

if [ -n "$(git status --porcelain)" ]; then
  echo "  Uncommitted changes found. Committing..."
  git add -A
  echo -n "  Commit message (or Enter for default): "
  read -r MSG
  MSG="${MSG:-Update app}"
  git commit -m "$MSG"
  echo -e "  ${GREEN}Committed.${NC}"
else
  echo "  No uncommitted changes."
fi

echo "  Pushing to GitHub..."
git push origin main
echo -e "  ${GREEN}Pushed.${NC}"

# ─── Step 2: Pull on EC2 ────────────────────────────────
echo ""
echo -e "${YELLOW}[2/4] Pulling latest code on EC2...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << REMOTE_PULL
  set -e
  cd $APP_DIR
  git stash 2>/dev/null || true
  git pull origin main
  npm install --production
REMOTE_PULL

echo -e "  ${GREEN}Code updated.${NC}"

# ─── Step 3: Restart app ────────────────────────────────
echo ""
echo -e "${YELLOW}[3/4] Restarting app...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << REMOTE_RESTART
  set -e
  cd $APP_DIR
  pm2 restart billwise
  sleep 2
  pm2 status
REMOTE_RESTART

echo -e "  ${GREEN}App restarted.${NC}"

# ─── Step 4: Health check ───────────────────────────────
echo ""
echo -e "${YELLOW}[4/4] Health check...${NC}"
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_IP" --max-time 10 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}App is live at http://$EC2_IP (HTTP $HTTP_CODE)${NC}"
else
  echo -e "  ${RED}Warning: HTTP $HTTP_CODE from http://$EC2_IP${NC}"
  echo "  Check logs: ssh -i $PEM_FILE $EC2_USER@$EC2_IP 'pm2 logs billwise --lines 20'"
fi

echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}   Deployment complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
