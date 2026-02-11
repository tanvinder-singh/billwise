# BillWise – GST Billing Software for Small Business (India)

A full-stack GST billing application for Indian small businesses. Create invoices, manage customers, track payments, and stay GST compliant.

## Features

- **Email Registration** — Sign up with name, email, phone, and password
- **Phone OTP Authentication** — Login with just your mobile number + OTP
- **GST Invoice Creation** — Full invoice form with customer details, line items, HSN/SAC, GST rates
- **Auto GST Calculation** — CGST+SGST for intra-state, IGST for inter-state (based on Place of Supply)
- **Invoice Management** — List, view, print, mark as paid, delete invoices
- **Dashboard** — Overview stats (total, paid, pending amounts)
- **Business Profile** — Set your business name, GSTIN, address, state for invoices
- **Print / PDF** — Print-ready invoice layout (works with browser Print → Save as PDF)
- **Amount in Words** — Indian numbering (Lakh, Crore)

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

## How It Works

### Auth Flows

1. **Create Account**: Fill in name, email, phone, password → account created → auto-login → redirected to dashboard
2. **Email Login**: Email + password → login → dashboard
3. **Phone OTP Login**: Enter phone → receive OTP → enter OTP → login → dashboard

> **Dev Mode**: Since no SMTP/Twilio is configured by default, OTPs are shown directly on screen so you can test the full flow without any external service.

### Creating an Invoice

1. Go to **New Invoice** in the dashboard
2. Fill customer details (name, phone, GSTIN, state)
3. Set invoice date and Place of Supply
4. Add line items with HSN code, qty, rate, and GST %
5. GST is auto-calculated (CGST+SGST or IGST based on state match)
6. Click **Create Invoice** → view, print, or share

## Project Structure

```
billing app/
├── server.js           # Express API server (auth + invoice routes)
├── database.js         # NeDB database setup (users, invoices, otps)
├── package.json        # Dependencies
├── .env                # Environment config (copy from .env.example)
├── .env.example        # Template for environment variables
├── data/               # Database files (auto-created)
├── public/
│   ├── index.html      # Landing page
│   ├── styles.css      # Landing page styles
│   ├── script.js       # Landing page auth (API-connected)
│   ├── dashboard.html  # Billing dashboard (app shell)
│   ├── dashboard.css   # Dashboard styles
│   └── dashboard.js    # Dashboard logic (routing, invoice CRUD)
└── README.md
```

## Configuration

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required? |
|----------|-------------|-----------|
| `PORT` | Server port (default: 3000) | No |
| `JWT_SECRET` | Secret for JWT tokens | Yes (for production) |
| `SMTP_HOST` | SMTP server for email OTP | No (dev mode if blank) |
| `SMTP_PORT` | SMTP port (default: 587) | No |
| `SMTP_USER` | SMTP username | No |
| `SMTP_PASS` | SMTP password | No |
| `SMTP_FROM` | From email address | No |
| `TWILIO_SID` | Twilio Account SID for SMS OTP | No (dev mode if blank) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No |
| `TWILIO_PHONE` | Twilio phone number | No |

### Production Email (example with Gmail)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=youremail@gmail.com
```

### Production SMS (Twilio)

```env
TWILIO_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE=+1234567890
```

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: NeDB (embedded, file-based, zero config)
- **Auth**: JWT + bcrypt + OTP
- **Email**: Nodemailer
- **Frontend**: Vanilla HTML/CSS/JS (no build step)

## Browser Support

Chrome, Firefox, Safari, Edge (modern versions).
