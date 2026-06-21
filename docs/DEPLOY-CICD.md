# Production deployment on Render

CI/CD for portal.slnecb.org using **Render** (API + admin) and **external managed MySQL**.

## Architecture

```
GitHub (main / develop)
    -> GitHub Actions (migrate + deploy hooks)
    -> Render Web Services (Docker API + static admin)
    -> External MySQL (Aiven / Railway)
    -> Android APK -> https://portal.slnecb.org
```

## Quick start

1. Create MySQL on Aiven (or Railway) — see infra/render/README.md
2. Push repo to GitHub
3. Render Dashboard -> New -> Blueprint -> select repo (uses render.yaml)
4. Set DB + JWT secrets on each API service in Render
5. Add deploy hooks + DB secrets to GitHub (see .github/GITHUB_SECRETS.template)
6. Point DNS CNAME records to Render
7. Push to develop (staging), then main (production)

## GitHub workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| ci.yml | PR, develop push | Build checks |
| deploy-staging.yml | develop push | Migrate -> Render hooks -> smoke test |
| deploy-production.yml | main push | Migrate -> Render hooks -> smoke test -> rollback on fail |
| uptime-probe.yml | every 15 min | External health check |

## GitHub secrets (minimum)

- RENDER_DEPLOY_HOOK_API_PRODUCTION
- RENDER_DEPLOY_HOOK_ADMIN_PRODUCTION
- RENDER_API_KEY
- RENDER_SERVICE_ID_API_PRODUCTION
- PROD_DB_HOST, PROD_DB_PORT, PROD_DB_NAME, PROD_DB_USER, PROD_DB_PASSWORD

Staging: same pattern with STAGING_* and RENDER_DEPLOY_HOOK_*_STAGING.

## Migrations

Run automatically in CI before deploy: npm run migrate:all

## SSL

Automatic via Render when custom domains are attached.

## Android

EXPO_PUBLIC_API_BASE_URL=https://portal.slnecb.org

See also: infra/render/README.md, docs/DEPLOYMENT-CHECKLIST.md