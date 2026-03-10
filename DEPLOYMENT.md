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
7. Run `npm run check` locally before pushing the final launch build.

## Launch Runbook
1. Confirm the production branch contains the final launch commit only.
2. Run `npm run check:syntax`.
3. Start the app locally and run `npm run check:smoke`.
4. Verify the live catalog in admin and confirm products have real names, prices, stock, and images.
5. Place one test order in production and confirm:
   `order saved`, `stock reduced`, `tracking works`, `status update works`.
6. Submit one production test contact message and confirm it appears in admin.
7. If SMTP is enabled, verify both customer and admin emails are delivered.
8. Confirm the custom domain serves the latest deployment over HTTPS.
9. Remove any test orders or messages that should not remain in production records.
10. Only then announce launch publicly.

## Post-Launch Monitoring
1. Check `/api/health` after launch and again after the first real customer order.
2. Watch server logs for 401, 404, 409, and 500 responses during the first day.
3. Review new orders in admin to confirm stock and status updates are behaving normally.
4. Check contact inbox/admin messages for failed follow-up or delivery questions.
5. Verify email delivery for order confirmations and contact acknowledgements.
6. Export or back up products and orders after the first stable launch window.

## Backup Notes
- If using MongoDB Atlas, enable automated backups and point-in-time recovery if available.
- Export products/orders regularly before major releases.
- Keep `.env` out of git and store production secrets only in the hosting platform.
