import { useEffect, useState } from "react";

import {
  API_BASE,
  api,
  currency,
  type InventoryReport,
  type SalesReport,
} from "../api";

export default function Reports() {
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.salesReport(), api.inventoryReport()])
      .then(([sales, inv]) => {
        setSalesReport(sales);
        setInventory(inv);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!salesReport || !inventory) return <p className="muted">Loading reports…</p>;

  return (
    <>
      <h2 className="page-title">Reports</h2>

      <div className="panel">
        <h3>
          Sales report ({salesReport.start} → {salesReport.end})
        </h3>
        <div className="cards">
          <Card label="Invoices" value={String(salesReport.invoice_count)} />
          <Card label="Revenue" value={currency(salesReport.revenue)} />
          <Card label="GST collected" value={currency(salesReport.tax)} />
          <Card label="Discount given" value={currency(salesReport.discount)} />
          <Card label="Profit" value={currency(salesReport.profit)} />
        </div>
        <a href={`${API_BASE}/api/reports/sales.csv`}>
          <button className="secondary">Download CSV</button>
        </a>
        <table style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {salesReport.rows.map((row) => (
              <tr key={row.invoice_number}>
                <td>{row.invoice_number}</td>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>{row.payment_method.toUpperCase()}</td>
                <td>{currency(row.total)}</td>
                <td>{currency(row.profit)}</td>
              </tr>
            ))}
            {salesReport.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No sales in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h3>Inventory report</h3>
        <div className="cards">
          <Card label="Products" value={String(inventory.total_products)} />
          <Card label="Stock value (cost)" value={currency(inventory.stock_value)} />
          <Card label="Retail value" value={currency(inventory.retail_value)} />
          <Card label="Potential profit" value={currency(inventory.potential_profit)} />
        </div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Min</th>
              <th>Stock value</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {inventory.rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.category ?? "—"}</td>
                <td>{row.quantity}</td>
                <td>{row.minimum_stock}</td>
                <td>{currency(row.stock_value)}</td>
                <td>{row.expiry_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
