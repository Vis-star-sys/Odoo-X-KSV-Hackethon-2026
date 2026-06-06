# VendorBridge — ERP Procurement System

A complete procurement workflow ERP built for the Odoo x KSV Hackathon.

## Features

- **Authentication** — JWT login with 4 role types (Admin, Manager, Procurement Officer, Vendor)
- **Vendor Management** — Add, edit, search, filter vendors with ratings
- **RFQ Management** — Create RFQs, assign vendors, set deadlines
- **Quotation Portal** — Vendors submit quotations; AI scoring engine ranks them
- **AI Vendor Recommendation** — Score = Price(50%) + Delivery(30%) + Rating(20%)
- **Quotation Comparison** — Side-by-side table with best highlights
- **Approval Workflow** — Manager approves/rejects with remarks
- **Auto PO Generation** — PO-2026-001 auto-generated on approval
- **Invoice System** — Generate invoices with GST calculation
- **PDF Download** — POs and invoices downloadable as PDF
- **Email Notifications** — Nodemailer templates for all events
- **Real-time Notifications** — Socket.io push notifications
- **Analytics Dashboard** — Charts for spend, vendor performance, RFQ trends
- **Activity Log** — Full audit trail of every action
- **Dark Mode** — Full dark/light theme toggle

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Query, Chart.js, Framer Motion |
| Backend | Node.js, Express.js, Socket.io |
| Database | MySQL |
| Auth | JWT + bcrypt |
| PDF | PDFKit |
| Email | Nodemailer |
| Files | Multer + Cloudinary |

## Setup

### 1. Database

```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend

```bash
cd server
npm install
# Edit .env with your MySQL password
npm run dev
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

### 4. Access

Open http://localhost:5173

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vendorbridge.com | password123 |
| Manager | manager@vendorbridge.com | password123 |
| Procurement Officer | officer@vendorbridge.com | password123 |
| Vendor | vendor1@abctech.com | password123 |

## Workflow

```
Admin → Create Vendors
       ↓
Procurement Officer → Create RFQ → Assign Vendors
       ↓
Vendor → Login → Submit Quotation
       ↓
AI Engine → Score & Rank Quotations
       ↓
Procurement Officer → Select Best → Send for Approval
       ↓
Manager → Approve / Reject
       ↓
System → Auto-Generate PO (PO-2026-001)
       ↓
Procurement Officer → Generate Invoice
       ↓
Download PDF + Send Email
       ↓
Analytics Dashboard
```

## Project Structure

```
vendorbridge/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/       # All page components
│       ├── components/  # Reusable components
│       ├── layouts/     # MainLayout with sidebar
│       ├── context/     # Auth + Theme context
│       ├── services/    # API service layer
│       └── hooks/       # Custom hooks
├── server/          # Express backend
│   └── src/
│       ├── controllers/ # Business logic
│       ├── routes/      # API routes
│       ├── middleware/  # Auth middleware
│       ├── services/    # Email service
│       ├── utils/       # Logger, notifications
│       └── config/      # DB config
└── database/
    └── schema.sql   # Full MySQL schema + seed data
```
