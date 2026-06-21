# Monitoring (Render)

## Built-in

- Render Dashboard: CPU, memory, deploy history, logs
- Health check path: /health/ready (configured in render.yaml)

## External uptime

- UptimeRobot: https://portal.slnecb.org/health/ready (keyword: ready)
- GitHub uptime-probe.yml runs every 15 minutes

## Alerts

Configure in Render: Settings -> Notifications (email/Slack on deploy failure).

## Logs

Render -> each service -> Logs tab. Filter 5xx and DB connection errors.

## Mobile

Synthetic check: login + supervisor assignment visible after deploy.