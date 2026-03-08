# Deployment Checklist

## Required Environment Variables
- `PORT`
- `MONGODB_URI`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

## Optional but Recommended Email Variables
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `ADMIN_ALERT_EMAIL`

## Render Blueprint
- This repo now includes [render.yaml](C:/Users/HP/OneDrive/Desktop/CROCS%20RWANDA/crocs-rwanda/render.yaml)
- The Render service type is `web`
- Health check path is `/api/health`
- Render will host the Node app only
- MongoDB must be provided externally through `MONGODB_URI`

## Render Deploy Steps
1. Push the current repo to GitHub.
2. Open this Blueprint link after push:
   `https://dashboard.render.com/blueprint/new?repo=https://github.com/aimekenzo/CROCS-RWANDA`
3. In Render, review the generated `crocs-rwanda` web service.
4. Fill all env vars marked `sync: false`.
5. Click `Apply`.
6. Wait for the deploy to become live.
7. Test:
   `https://your-render-url.onrender.com/api/health`
8. After that works, connect `crocsrwanda.com` in Render custom domains.

## Before Launch
1. Set strong admin credentials and a long session secret.
2. Use a managed MongoDB database and verify backups are enabled.
3. Configure SMTP and confirm order/contact emails are delivered.
4. Confirm `http://your-domain/api/health` returns `emailConfigured: true` if email is expected.
5. Verify HTTPS is enabled on the deployed domain.
6. Test admin login, order placement, order tracking, and contact form in production.

## Backup Notes
- If using MongoDB Atlas, enable automated backups and point-in-time recovery if available.
- Export products/orders regularly before major releases.
- Keep `.env` out of git and store production secrets only in the hosting platform.
