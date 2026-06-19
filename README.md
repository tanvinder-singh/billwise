# Rupiya - GST Billing Software

Rupiya is a Node.js + PostgreSQL billing app for Indian small businesses. It supports GST invoices, parties, items, purchases, expenses, payments, party statements, reports, invoice print themes, and admin user management.

## Launch-Ready Features

- GST sale invoices with CGST/SGST/IGST calculation, HSN/SAC summary, discounts, round-off, print/PDF layouts, logo, signature, bank details, and UPI QR.
- Sales documents: estimates, proforma invoices, delivery challans, sale returns, and conversion to invoices.
- Purchases, purchase orders, purchase returns, payment-in, payment-out, and expenses.
- Parties and items with GSTIN state detection, optional GSTIN API lookup, custom item fields, party-specific rates, stock tracking, batch/expiry fields, and low-stock dashboard alerts.
- Reports for sales, item-wise sales, GST summary, and party statements with PDF, Excel, and CSV exports.
- Dashboard action center for overdue receivables, due-this-week payments, stock alerts, profile readiness, receivables, payables, and recent invoices.
- WhatsApp payment reminder links for unpaid invoices.
- Production hardening: security headers, optional CORS allow-list, auth/OTP/GSTIN rate limits, production JWT secret checks, safer OTP behavior, no bundled GSTIN API key, and `/api/health`.

## Quick Start

```bash
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000.

PostgreSQL must be running and `DATABASE_URL` must point to a database the app can create tables in.

## Production Checklist

Set these before launch:

- `NODE_ENV=production`
- `JWT_SECRET` with a unique 32+ character secret
- `DATABASE_URL` for the production PostgreSQL database
- `CORS_ORIGIN` if your frontend/API are served from specific external origins
- SMTP settings if email OTP delivery is enabled
- Twilio settings if phone OTP login is enabled
- `GSTIN_API_KEY` or per-user GSTIN API keys if full GSTIN lookup is needed

In production, OTPs are not returned in API responses and phone/email OTP endpoints return a configuration error if their delivery provider is missing.

## Useful Commands

```bash
npm run check      # syntax-check server and frontend JS
npm run dev        # run local server
npm run start:prod # run with NODE_ENV=production
```

Health check:

```bash
curl http://localhost:3000/api/health
```

## Project Structure

```text
billing app/
├── server.js           # Express API server
├── database.js         # PostgreSQL schema + lightweight collection wrappers
├── create-admin.js     # Super admin helper
├── public/
│   ├── index.html      # Launch page + auth modals
│   ├── styles.css      # Launch page styles
│   ├── script.js       # Landing/auth logic
│   ├── dashboard.html  # App shell
│   ├── dashboard.css   # Dashboard styles
│   └── dashboard.js    # Dashboard workflows
└── .env.example        # Environment template
```
