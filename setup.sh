#!/bin/bash
# ─────────────────────────────────────────────────────────
# Rupiya — One-Time EC2 Infrastructure & Database Setup
# Run from your local machine:  chmod +x setup.sh && ./setup.sh
#
# What this does (idempotent — safe to re-run):
#   1. Installs Node.js 20, PostgreSQL 16, Nginx, PM2
#   2. Creates the PostgreSQL user + database
#   3. Clones the repo & installs npm dependencies
#   4. Generates a .env file (prompts for secrets)
#   5. Starts the app with PM2 & configures Nginx reverse proxy
#   6. Enables PM2 startup on reboot
# ─────────────────────────────────────────────────────────

set -e

# ─── Configuration (edit these) ──────────────────────────
EC2_IP="100.30.61.32"
PEM_FILE="$HOME/Downloads/billwise.pem"
EC2_USER="ubuntu"
APP_DIR="/home/ubuntu/rupiya"
GITHUB_REPO="https://github.com/tanvinder-singh/billwise.git"
BRANCH="main"
DB_NAME="rupiya_db"
DB_USER="rupiya"
DB_PASS="rupiya_strong_$(openssl rand -hex 4)"
# ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}   Rupiya — EC2 Infrastructure Setup${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo ""

# ─── Validate PEM ────────────────────────────────────────
if [ ! -f "$PEM_FILE" ]; then
  echo -e "${RED}ERROR: PEM file not found at $PEM_FILE${NC}"
  exit 1
fi
chmod 400 "$PEM_FILE" 2>/dev/null || true

# ─── Prompt for optional secrets ─────────────────────────
echo -e "${YELLOW}Optional: Enter your credentials (press Enter to skip any)${NC}"
echo ""

read -rp "  JWT Secret (or Enter for auto-generated): " INPUT_JWT
JWT_SECRET="${INPUT_JWT:-$(openssl rand -hex 32)}"

read -rp "  Twilio Account SID: " TWILIO_SID
read -rp "  Twilio Auth Token: " TWILIO_AUTH_TOKEN
read -rp "  Twilio Phone Number (e.g. +16802067110): " TWILIO_PHONE

read -rp "  SMTP Host (e.g. email-smtp.us-east-1.amazonaws.com, or Enter to skip): " SMTP_HOST
SMTP_PORT=""
SMTP_SECURE=""
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
if [ -n "$SMTP_HOST" ]; then
  read -rp "  SMTP Port [587]: " SMTP_PORT
  SMTP_PORT="${SMTP_PORT:-587}"
  read -rp "  SMTP Secure (true/false) [false]: " SMTP_SECURE
  SMTP_SECURE="${SMTP_SECURE:-false}"
  read -rp "  SMTP User: " SMTP_USER
  read -rp "  SMTP Pass: " SMTP_PASS
  read -rp "  SMTP From (e.g. noreply@yourdomain.com): " SMTP_FROM
fi

echo ""
echo -e "${YELLOW}[1/7] Installing system packages on EC2...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE_PACKAGES'
  set -e
  echo "  Updating apt..."
  sudo apt-get update -qq

  # Node.js 20 via NodeSource
  if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
    echo "  Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
    sudo apt-get install -y -qq nodejs
  else
    echo "  Node.js $(node -v) already installed."
  fi

  # PostgreSQL
  if ! command -v psql &>/dev/null; then
    echo "  Installing PostgreSQL..."
    sudo apt-get install -y -qq postgresql postgresql-contrib
  else
    echo "  PostgreSQL already installed."
  fi

  # Nginx
  if ! command -v nginx &>/dev/null; then
    echo "  Installing Nginx..."
    sudo apt-get install -y -qq nginx
  else
    echo "  Nginx already installed."
  fi

  # PM2
  if ! command -v pm2 &>/dev/null; then
    echo "  Installing PM2..."
    sudo npm install -g pm2 >/dev/null 2>&1
  else
    echo "  PM2 already installed."
  fi

  # Git
  if ! command -v git &>/dev/null; then
    sudo apt-get install -y -qq git
  fi

  echo "  Node: $(node -v) | npm: $(npm -v) | psql: $(psql --version | head -1)"
REMOTE_PACKAGES

echo -e "  ${GREEN}Packages installed.${NC}"

# ─── Step 2: PostgreSQL setup ────────────────────────────
echo ""
echo -e "${YELLOW}[2/7] Setting up PostgreSQL database...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << REMOTE_DB
  set -e
  sudo systemctl enable postgresql
  sudo systemctl start postgresql

  # Create user if not exists
  sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

  # Update password in case it changed
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"

  # Create database if not exists
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

  # Grant privileges
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
  sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

  echo "  Database '$DB_NAME' ready with user '$DB_USER'."
REMOTE_DB

echo -e "  ${GREEN}PostgreSQL configured.${NC}"

# ─── Step 3: Clone repo ─────────────────────────────────
echo ""
echo -e "${YELLOW}[3/7] Cloning repository...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << REMOTE_CLONE
  set -e
  if [ -d "$APP_DIR/.git" ]; then
    echo "  Repo already exists. Pulling latest..."
    cd $APP_DIR
    git stash 2>/dev/null || true
    git pull origin $BRANCH
  else
    echo "  Cloning from GitHub..."
    rm -rf $APP_DIR
    git clone -b $BRANCH $GITHUB_REPO $APP_DIR
  fi
  cd $APP_DIR
  echo "  Installing npm dependencies..."
  npm install --production
REMOTE_CLONE

echo -e "  ${GREEN}Repository ready.${NC}"

# ─── Step 4: Create .env ────────────────────────────────
echo ""
echo -e "${YELLOW}[4/7] Creating .env configuration...${NC}"

DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"

ENV_CONTENT="PORT=3000
JWT_SECRET=$JWT_SECRET

# PostgreSQL
DATABASE_URL=$DATABASE_URL

# Twilio SMS OTP
TWILIO_SID=$TWILIO_SID
TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN
TWILIO_PHONE=$TWILIO_PHONE

# SMTP Email OTP
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=$SMTP_SECURE
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=$SMTP_FROM"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "cat > $APP_DIR/.env << 'INNEREOF'
$ENV_CONTENT
INNEREOF
echo '  .env created at $APP_DIR/.env'"

echo -e "  ${GREEN}.env configured.${NC}"

# ─── Step 5: Start app with PM2 ─────────────────────────
echo ""
echo -e "${YELLOW}[5/7] Starting app with PM2...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << REMOTE_PM2
  set -e
  cd $APP_DIR

  # Stop existing if any
  pm2 delete rupiya 2>/dev/null || true

  # Start fresh
  pm2 start server.js --name rupiya
  pm2 save

  # Enable PM2 startup on reboot
  sudo env PATH=\$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null || true
  pm2 save

  sleep 2
  pm2 status
REMOTE_PM2

echo -e "  ${GREEN}App started with PM2.${NC}"

# ─── Step 6: Configure Nginx ────────────────────────────
echo ""
echo -e "${YELLOW}[6/7] Configuring Nginx reverse proxy...${NC}"

ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" << 'REMOTE_NGINX'
  set -e
  sudo tee /etc/nginx/sites-available/rupiya > /dev/null << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXCONF

  sudo ln -sf /etc/nginx/sites-available/rupiya /etc/nginx/sites-enabled/rupiya
  sudo rm -f /etc/nginx/sites-enabled/default

  sudo nginx -t
  sudo systemctl enable nginx
  sudo systemctl restart nginx
  echo "  Nginx configured and restarted."
REMOTE_NGINX

echo -e "  ${GREEN}Nginx ready.${NC}"

# ─── Step 7: Health check ───────────────────────────────
echo ""
echo -e "${YELLOW}[7/7] Health check...${NC}"
sleep 3

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$EC2_IP" --max-time 10 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "  ${GREEN}App is live at http://$EC2_IP (HTTP $HTTP_CODE)${NC}"
else
  echo -e "  ${RED}Warning: Got HTTP $HTTP_CODE — checking PM2 logs...${NC}"
  ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "pm2 logs rupiya --lines 15 --nostream" 2>/dev/null || true
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}   Setup Complete!${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo ""
echo -e "  App URL:       ${GREEN}http://$EC2_IP${NC}"
echo -e "  SSH:           ssh -i $PEM_FILE $EC2_USER@$EC2_IP"
echo -e "  App logs:      ssh -i $PEM_FILE $EC2_USER@$EC2_IP 'pm2 logs rupiya'"
echo -e "  DB password:   $DB_PASS"
echo ""
echo -e "  ${YELLOW}IMPORTANT: Save the DB password above! It's in the .env on the server.${NC}"
echo ""
