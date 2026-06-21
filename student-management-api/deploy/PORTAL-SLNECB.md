# Deploy on Ubuntu — portal.slnecb.org

Tailored steps for SLNECB Portal at https://portal.slnecb.org

## Before you start

1. DNS A record: portal.slnecb.org -> your Ubuntu server public IP
2. Files: student-management-api folder + Sneo_final.sql
3. SSH with sudo access

## 1. Export database (Windows PC)

```powershell
mysqldump -u root -p Sneo_final > Sneo_final.sql
```

## 2. Upload to server

```powershell
scp -r C:\Users\Mohamed\Desktop\MOBILEAPPFORFLUTTER\student-management-api root@YOUR_SERVER_IP:/opt/
scp C:\path\to\Sneo_final.sql root@YOUR_SERVER_IP:/opt/
```

## 3. Install Docker, Nginx, Certbot

```bash
cd /opt/student-management-api
sudo bash deploy/scripts/01-install-prerequisites.sh
```

## 4. Configure environment

```bash
cd /opt/student-management-api/deploy
cp .env.production.example .env
nano .env
```

Set MYSQL_ROOT_PASSWORD, DB_PASSWORD, JWT_SECRET (openssl rand -base64 48).

Confirm:
```env
API_PUBLIC_URL=https://portal.slnecb.org
CORS_ORIGIN=https://portal.slnecb.org
```

## 5. Import database

```bash
bash deploy/scripts/02-import-database.sh /opt/Sneo_final.sql
```

## 6. Start API + MySQL

```bash
bash deploy/scripts/03-deploy-docker.sh
curl http://127.0.0.1:5103/health
```

## 7. Nginx + SSL

```bash
sudo cp deploy/nginx/portal-slnecb.conf /etc/nginx/sites-available/portal-slnecb
sudo ln -sf /etc/nginx/sites-available/portal-slnecb /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d portal.slnecb.org
curl https://portal.slnecb.org/health
```

## 8. Mobile APK

```env
EXPO_PUBLIC_API_BASE_URL=https://portal.slnecb.org
```

```powershell
cd student-management-mobile
npm run build:android
```

## URLs

| Service | URL |
|---------|-----|
| Health | https://portal.slnecb.org/health |
| API | https://portal.slnecb.org/api |
| Mobile base URL | https://portal.slnecb.org |

See DEPLOY.md for troubleshooting and backups.