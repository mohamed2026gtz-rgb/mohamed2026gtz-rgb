#!/usr/bin/env bash
set -euo pipefail

echo "=== Student Management API — server prerequisites (Ubuntu 22.04/24.04) ==="

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/scripts/01-install-prerequisites.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git ufw nginx certbot python3-certbot-nginx

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin || true
fi

systemctl enable docker nginx
systemctl start docker nginx

ufw allow OpenSSH
ufw allow "Nginx Full"
echo "y" | ufw enable || true

echo ""
echo "Done. Next: configure deploy/.env, import DB, run 03-deploy-docker.sh (see DEPLOY.md)"