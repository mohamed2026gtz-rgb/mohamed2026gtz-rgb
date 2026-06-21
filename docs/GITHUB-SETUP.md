# GitHub setup (Phase 1 — before MySQL)

Complete this first. MySQL and Render come in Phase 2 and 3.

## Phase 1 — Create repo and push code

### 1. Initialize locally (already done if you ran git init)

```powershell
cd C:\Users\Mohamed\Desktop\MOBILEAPPFORFLUTTER
git init
git checkout -b main
git add .
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "Initial commit: student management system with CI/CD"
git checkout -b develop
git checkout main
```

### 2. Create empty repo on GitHub

1. Open https://github.com/new
2. Repository name: `student-management` (or your choice)
3. **Private** recommended (contains school data integration)
4. Do **NOT** add README, .gitignore, or license (we already have them)
5. Click **Create repository**

### 3. Push both branches

Replace YOUR_ORG and REPO with your GitHub username/org:

```powershell
git remote add origin https://github.com/YOUR_ORG/REPO.git
git push -u origin main
git push -u origin develop
```

### 4. Verify CI runs

After push, open GitHub -> **Actions** tab.

The **CI** workflow should run and pass (API Docker build, admin build, mobile typecheck).

Deploy workflows will show "Deploy not configured yet" until Phase 3 — that is expected.

---

## Phase 1b — GitHub repository settings

### Branch protection (recommended)

Settings -> Branches -> Add rule for `main`:

- Require pull request before merging
- Require status checks: **CI / API checks**, **CI / Admin build**, **CI / Mobile typecheck**

### Repository variables (Settings -> Secrets and variables -> Actions -> Variables)

Add these now (deploy stays off until MySQL + Render):

| Variable | Value |
|----------|-------|
| ENABLE_DB_MIGRATIONS | false |
| ENABLE_RENDER_DEPLOY | false |
| PROD_API_DOMAIN | portal.slnecb.org |
| PROD_ADMIN_DOMAIN | admin.slnecb.org |
| STAGING_API_DOMAIN | staging-api.slnecb.org |
| STAGING_ADMIN_DOMAIN | staging-admin.slnecb.org |
| EAS_BUILD_ON_STAGING | false |

### Environments (optional but recommended)

Settings -> Environments -> create:

- `production` (can add required reviewers later)
- `staging`

---

## Phase 2 — MySQL (later)

When MySQL is ready (Aiven / Railway):

1. Add secrets: PROD_DB_*, STAGING_DB_*
2. Set `ENABLE_DB_MIGRATIONS=true`

---

## Phase 3 — Render (later)

When Render Blueprint is applied:

1. Add deploy hook secrets (see .github/GITHUB_SECRETS.template)
2. Add RENDER_API_KEY and RENDER_SERVICE_ID_API_PRODUCTION
3. Set `ENABLE_RENDER_DEPLOY=true`

---

## Workflows summary

| Workflow | When | Needs MySQL? |
|----------|------|--------------|
| ci.yml | Every PR + push to main/develop | No |
| deploy-staging.yml | Push to develop | Only if ENABLE_DB_MIGRATIONS=true |
| deploy-production.yml | Push to main | Only if ENABLE_DB_MIGRATIONS=true |
| uptime-probe.yml | Every 15 min | No (needs live API URL) |

---

## Troubleshooting

**CI fails on npm ci** — run `npm ci` locally in each project folder and commit any updated package-lock.json.

**Deploy workflow fails on empty curl** — set ENABLE_RENDER_DEPLOY=false until Render hooks are added.

**Large files rejected** — APK files are gitignored; build in CI or attach releases manually on GitHub Releases.