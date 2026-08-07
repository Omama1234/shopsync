# ShopSync — Local Shop Inventory & Billing (Web MVP)

A working web MVP of ShopSync: inventory management, point-of-sale billing with
automatic GST and profit calculation, customers, low-stock/expiry alerts, and
sales/inventory reports.

## Stack

- Backend: FastAPI + SQLModel (SQLite by default, PostgreSQL via `DATABASE_URL`)
- Frontend: React + TypeScript + Vite + Recharts

## Run the backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python seed.py          # optional demo data
.venv/bin/uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Run the frontend

```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```

Set `VITE_API_BASE` if the API is not on `http://localhost:8000`.

## Features in this MVP

- Dashboard: today/month revenue and profit, 7-day trend, best sellers, low stock
  and expiry alerts
- Inventory: add/search/delete products, add stock, per-product GST, minimum
  stock and expiry tracking
- POS: search or scan-type lookup, cart with per-line and bill-level discounts,
  payment method, stock decrement, invoice with GST and profit
- Customers: create customers, per-customer invoice count and spend
- Reports: 30-day sales report with CSV export, inventory valuation report

## Not yet implemented

Purchases/suppliers, credit book, employees and attendance, barcode camera
scanning, multi-shop, auth/roles, offline sync, AI features.
