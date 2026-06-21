# Deployment checklist (Render)

## One-time setup

- [ ] GitHub repo with main + develop branches
- [ ] External MySQL (Aiven/Railway) for production + staging
- [ ] Sneo_final imported; npm run migrate:all tested
- [ ] Render Blueprint applied (render.yaml)
- [ ] DB + JWT env vars set on Render API services
- [ ] Deploy hooks copied to GitHub Secrets
- [ ] RENDER_API_KEY + service IDs for rollback
- [ ] DNS CNAME records for portal, admin, staging subdomains
- [ ] SSL active (Render auto)
- [ ] Mobile EXPO_PUBLIC_API_BASE_URL=https://portal.slnecb.org

## Each production release

- [ ] CI green on PR
- [ ] Staging verified on develop
- [ ] DB backup before migrate (Aiven snapshot)
- [ ] Merge to main -> watch GitHub Actions
- [ ] curl https://portal.slnecb.org/health/ready
- [ ] Login on admin + mobile supervisor test

## Rollback

- [ ] GitHub Actions rollback job, or Render Dashboard -> Rollback
- [ ] Restore MySQL from snapshot if migration caused issues