# INSIGHT PRO – Business Intelligence Platform

An enterprise-grade Data Analytics and Business Intelligence platform built with React, Vite, Chart.js, Tailwind CSS, Node.js, Express, PostgreSQL, Drizzle ORM, and Firebase Authentication.

## Architecture Overview

- **Frontend (`src/frontend/`)**: React 19 + TypeScript + Tailwind CSS v4 + Chart.js (`react-chartjs-2`), featuring a dark navy sidebar, dual Light/Dark Navy themes, violet interactive accents, dynamic filter bars, CSV/Excel client preview (`papaparse` & `xlsx`), and PDF/CSV report exports (`jspdf` & `jspdf-autotable`).
- **Backend (`src/backend/`, `server.ts`)**: Express.js REST APIs organized into controllers, routes, and authentication/RBAC middleware.
- **Database (`src/db/`)**: PostgreSQL managed with Drizzle ORM (`users`, `categories`, `customers`, `products`, `orders`, `sales`, `imported_datasets`, `activity_logs`).

## Environment Variables

Copy `.env.example` to `.env` and populate your PostgreSQL and server variables:

```env
PORT=3000
NODE_ENV=development
APP_URL="http://localhost:3000"

SQL_HOST="127.0.0.1"
SQL_DB_NAME="insight_pro"
SQL_USER="app_user"
SQL_PASSWORD="YOUR_SQL_USER_PASSWORD"
SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="YOUR_SQL_ADMIN_PASSWORD"
```

Ensure `firebase-applet-config.json` is present in the project root for Firebase Authentication.

## Installation

```bash
npm install
```

Push the Drizzle PostgreSQL schema:

```bash
npx drizzle-kit push --config=src/db/drizzle.config.ts
```

## Running the Application

### Option 1: Unified Full-Stack Server (Recommended / Production-aligned)

Starts Express APIs and Vite on port `3000`:

```bash
npm run dev
```

For production build and execution:

```bash
npm run build
NODE_ENV=production npm start
```

### Option 2: Run Backend and Frontend Separately

1. **Start the Express Backend API server** on port `3000`:

```bash
SEPARATE_BACKEND=true npm run dev:backend
```

2. **Start the Vite React Frontend** on port `5173` (automatically proxies `/api/*` to `http://localhost:3000`):

```bash
npm run dev:frontend
```

## Key Modules

1. **Executive Overview**: Real-time PostgreSQL KPIs (Total Revenue, Orders, Customers, Profit, AOV, Growth %), sparklines, Revenue Overview, Monthly Sales, Customer Growth, Profit & Loss, Sales by Category/Region, Top Products, and Recent Transactions with order entry.
2. **Data Import**: Drag-and-drop `.csv`, `.xlsx`, and `.xls` upload with client-side preview, schema validation, PostgreSQL transactional ingestion, dataset deletion, and re-import.
3. **Data Analytics**: Year-over-Year performance comparison, customer segment distribution, product margin matrix, and top customer leaderboard.
4. **Interactive Filters**: Date range, Fiscal Year, Month, Category, Region, Customer, and Reset Filters.
5. **Reports & Export**: Executive report templates with PDF download, CSV export, and print stylesheet.
6. **User Management & RBAC**: Role-based access (`admin`, `analyst`, `viewer`), user provisioning, and status controls.
7. **Notifications & Settings**: Live KPI margin alerts, audit event feed, profile settings, currency & table density preferences, and Light/Dark Navy theme switching.
