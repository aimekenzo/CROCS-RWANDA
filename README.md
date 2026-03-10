# CROCS RWANDA

CROCS RWANDA is an online store project for browsing and ordering Crocs products in Rwanda.

## Features
- Product listing with cart integration
- Contact form with backend API endpoint
- Responsive layouts for mobile, tablet, laptop, desktop, and large screens

## Active Frontend Files
- Storefront pages: `index.html` and `pages/*.html`
- Main storefront logic: `js/main.js`
- Cart and checkout logic: `js/cart.js`
- Admin dashboard logic: `js/admin.js`

## Local Run
1. Install dependencies:
```bash
npm install
```
2. Configure your `.env`:
```text
PORT=3001
MONGODB_URI=mongodb://127.0.0.1:27017/crocs-rwanda
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
ADMIN_SESSION_SECRET=your-long-random-session-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=mailer@example.com
SMTP_PASS=your-smtp-password
EMAIL_FROM="Crocs Rwanda <no-reply@example.com>"
ADMIN_ALERT_EMAIL=owner@example.com
```
3. Start server:
```bash
npm run dev
```
4. Open:
```text
http://localhost:3001
```
5. Run launch checks:
```bash
npm run check:syntax
npm run check:smoke
npm run check:e2e
npm run check:email
```

## Pre-Launch Checks
- `npm run check:syntax` validates the main backend and frontend scripts.
- `npm run check:smoke` probes the key public routes and health endpoint on a running server.
- `npm run check:e2e` performs an admin login, creates a product, places an order, checks stock reduction, and verifies order tracking/status updates.
- `npm run check:email` verifies SMTP configuration and attempts to validate the configured email transport.
- `npm run check` runs both checks in sequence.

## Email Notifications
- Customer order confirmations are sent when SMTP is configured.
- Customer contact acknowledgements are sent when SMTP is configured.
- Admin order/contact alerts are sent to `ADMIN_ALERT_EMAIL` when configured.

## Repository
GitHub: https://github.com/aimekenzo/CROCS-RWANDA
