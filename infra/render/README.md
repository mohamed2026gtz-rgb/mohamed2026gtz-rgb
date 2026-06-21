# Render + external MySQL setup

Render hosts the Node.js API (Docker) and React admin (static site).
Render does not offer managed MySQL — use Aiven, Railway, or PlanetScale.

## Step 1 — Create MySQL (Aiven example)

1. Create Aiven project -> MySQL 8 service.
2. Note Host, Port, User, Password, Database (Sneo_final).
3. Import: mysql -h HOST -P 3306 -u USER -p --ssl-mode=REQUIRED Sneo_final < Sneo_final.sql
4. Add PROD_DB_* and STAGING_DB_* to GitHub Secrets.

## Step 2 — Apply Render Blueprint

1. render.com -> New -> Blueprint -> connect GitHub repo.
2. Render reads root render.yaml (4 services).
3. Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET on each API service.

## Step 3 — Custom domains and SSL

| Service | Domain |
|---------|--------|
| sneo-api-production | portal.slnecb.org |
| sneo-admin-production | admin.slnecb.org |
| sneo-api-staging | staging-api.slnecb.org |
| sneo-admin-staging | staging-admin.slnecb.org |

DNS CNAME each subdomain to the onrender.com hostname Render shows.

SSL is automatic (Let's Encrypt, auto-renewed by Render).

## Step 4 — Deploy hooks

Settings -> Deploy Hook on each service. Add to GitHub Secrets:

- RENDER_DEPLOY_HOOK_API_PRODUCTION
- RENDER_DEPLOY_HOOK_ADMIN_PRODUCTION
- RENDER_DEPLOY_HOOK_API_STAGING
- RENDER_DEPLOY_HOOK_ADMIN_STAGING
- RENDER_API_KEY (Account -> API Keys)
- RENDER_SERVICE_ID_API_PRODUCTION (for rollback)

autoDeploy: false in render.yaml — only GitHub Actions deploys.

## Step 5 — Deploy

git push origin develop  # staging
git push origin main     # production

## Rollback

Automatic via deploy-production.yml, or Render Dashboard -> Rollback.

## Mobile

EXPO_PUBLIC_API_BASE_URL=https://portal.slnecb.org