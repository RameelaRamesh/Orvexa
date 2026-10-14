# ORVEXA — Modern Multi-Tenant Work & Operations SaaS Platform

ORVEXA is an industry-agnostic, clean, scalable, multi-tenant global SaaS platform designed to support high-throughput operations, execution teams, service delivery, and enterprise organizations without hardcoding industry-specific workflows into the core application engine.

> **Tagline:** Connect people. Manage work. Run operations.

---

## 🏗️ Architecture & Stack Highlights

- **Multi-Tenant Scoping:** User accounts are global (`User`), while workspace access (`Membership`) enforces strict tenant data isolation at the NestJS backend level (`TenantGuard`).
- **Orthogonal Organization Engine:** System Access Roles (`OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, `GUEST`) are kept strictly decoupled from Designations, Departments, Teams, and Reporting Structure (`reportsToId`).
- **Abstracted Providers:**
  - `StorageProvider` interface with `CloudflareR2StorageProvider` implementation (S3 API compatible).
  - `PaymentProvider` interface with `RazorpayPaymentProvider` implementation (Signature verification, checkout order generation).
- **Dual Work Engine:** Supports both standard **Projects & Tasks** and high-volume **Operations Work Queues** (Batch ID, unit throughput, processing stages, quality audits, SLA breach escalations).
- **Design System & Theme Engine:** Tokenized Tailwind CSS system using Manrope primary typography with Light (`#2563EB`) and Dark (`#0B1120`) themes.

---

## 🚀 Tech Stack

### Frontend (`/frontend`)
- **Framework:** Next.js 14 (App Router) & TypeScript
- **Styling:** Tailwind CSS, Manrope Typography, shadcn/ui primitives, next-themes
- **Form & Validation:** React Hook Form, Zod
- **Data Fetching:** TanStack Query (React Query)
- **Icons:** Lucide Icons

### Backend (`/backend`)
- **Framework:** NestJS & TypeScript (REST API)
- **ORM & Database:** Prisma ORM, PostgreSQL
- **Caching & Queues:** Redis, BullMQ, Socket.IO
- **Security:** Passport JWT, Bcrypt, Helmet, CORS, ValidationPipe

---

## 🛠️ Local Development Setup

### Option 1: Docker Compose (Recommended)

1. Clone the repository and navigate to the project directory:
   ```bash
   cd track
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Launch all services via Docker Compose:
   ```bash
   docker-compose up -d --build
   ```
4. Access the applications:
   - **Frontend App:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

---

### Option 2: Manual Development Mode

#### Backend Setup
```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 💳 Razorpay Integration (Test Credentials)

The system is pre-configured to use official Razorpay test credentials:
- **Key ID:** `rzp_test_TCr9Me1AydiZMF`
- **Key Secret:** `uPUkfk9gWbTOaewirN8KHI0T`

> [!IMPORTANT]
> The backend verifies all Razorpay signatures on the server side (`RazorpayPaymentProvider`). No payment secrets are exposed to the frontend browser.

---

## 🌐 Production Deployment (Hostinger VPS)

```
Internet -> Nginx Gateway (SSL/TLS)
              ├── www.orvexa.io  -> Next.js Marketing Site (Port 3000)
              ├── app.orvexa.io  -> Next.js Authenticated App (Port 3000)
              └── api.orvexa.io  -> NextJS API Engine (Port 4000)
```

Nginx configuration is located in `nginx/nginx.conf`.
