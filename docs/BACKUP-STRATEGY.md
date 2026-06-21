# Database backup strategy (Render + external MySQL)

Render does not host MySQL. Backups are managed by your MySQL provider.

## Aiven / Railway / PlanetScale

- Enable automated daily backups + point-in-time recovery (production)
- Retention: 14 days minimum
- Pre-deploy: trigger manual snapshot before production migrate in CI

## Logical dumps (secondary)

Weekly mysqldump to encrypted object storage (S3, Backblaze B2).

## Restore

1. Restore MySQL from provider snapshot or dump
2. Update Render env if host changed
3. Redeploy API via deploy hook
4. Verify /health/ready

## Application rollback

Render Dashboard -> service -> Rollback (or automatic via deploy-production.yml).