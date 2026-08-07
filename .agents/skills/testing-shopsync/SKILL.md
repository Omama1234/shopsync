---
name: testing-shopsync
description: How to run and end-to-end test the ShopSync inventory/billing app (FastAPI backend + React/Vite frontend) locally in a browser.
---

# Testing ShopSync locally

## Services

No auth, no credentials, no secrets are required for any flow.

```bash
cd backend && .venv/bin/python seed.py            # idempotent; 8 products + 3 customers
cd backend && .venv/bin/uvicorn app.main:app --port 8000
cd frontend && npm run dev                        # http://localhost:5173
```

- Frontend talks to `http://localhost:8000` by default; override with `VITE_API_BASE`.
- `vite` / `@vitejs/plugin-react` are pinned to 7.x / 4.x on purpose — 8.x fails on a rolldown native binding on this box. Do not upgrade them just to make an install succeed.
- Check whether services are already up before starting new ones: `ss -ltnp | grep -E '8000|5173'`.
- Data persists in `backend/shopsync.db`. Test runs leave products/customers/invoices behind; delete them via the UI or reset the DB file before a demo.

## Browser

`google-chrome` on this box is a thin shim that PUTs to a CDP endpoint on port 29229 and fails if nothing is listening. If it does nothing, launch the real binary directly and then maximize:

```bash
DISPLAY=:0 nohup /opt/.devin/chrome/chrome/linux-<ver>/chrome-linux64/chrome \
  --remote-debugging-port=29229 --no-first-run --no-default-browser-check "http://localhost:5173" &
DISPLAY=:0 wmctrl -a "Google Chrome for Testing"; DISPLAY=:0 wmctrl -r :ACTIVE: -b add,maximized_vert,maximized_horz
```

## UI paths

Left sidebar: Dashboard, Inventory, Billing (POS), Customers, Reports (routes `/dashboard`, `/inventory`, `/pos`, `/customers`, `/reports`).

- **Inventory**: "Add product" toggles the create form. "Add stock" uses a native `window.prompt`; "Delete" uses `window.confirm` — both need real clicks on the browser dialog, not just DOM interaction. Search is debounced ~250 ms.
- **POS**: search → "Add" → edit qty/discount inline → pick customer + payment → "Generate invoice". The cart preview totals are computed client-side and should equal the returned invoice's `total` exactly; that equality is the highest-value assertion on this app.
- **Reports**: "Download CSV" is a plain `<a>` to `${API_BASE}/api/reports/sales.csv`; verify the file at `~/Downloads/sales-report.csv`.

## Useful expected-value math (for adversarial checks)

Backend and frontend both compute: `line_net = max(price*qty - line_discount, 0)`, `tax = line_net * gst%`,
`total = max(subtotal - (line_discounts + bill_discount), 0) + tax`. So an over-large bill discount floors the
total at the GST amount rather than going negative — but note the *recorded* `sale.discount` is NOT capped, so
the Reports "Discount given" figure can be wildly inflated. Watch for that when validating report numbers.

## Devin Secrets Needed

None.

## Date entry gotcha

Typing into the `<input type="date">` expiry field can land mid-field. Click the left-most (month) segment first,
then type `MMDDYYYY` in one go, and verify the DOM value is a full `YYYY-MM-DD` before submitting.
