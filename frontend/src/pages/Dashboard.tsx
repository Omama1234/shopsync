import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, currency, type Alerts, type DashboardSummary } from "../api";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.dashboard(), api.alerts()])
      .then(([dash, alert]) => {
        setSummary(dash);
        setAlerts(alert);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!summary || !alerts) return <p className="muted">Loading dashboard…</p>;

  const cards = [
    { label: "Today's Sales", value: currency(summary.today_sales) },
    { label: "Today's Profit", value: currency(summary.today_profit) },
    { label: "Month Revenue", value: currency(summary.month_revenue) },
    { label: "Month Profit", value: currency(summary.month_profit) },
    { label: "Products", value: String(summary.total_products) },
    { label: "Low Stock", value: String(summary.low_stock_count) },
    { label: "Expiring (30d)", value: String(summary.expiring_soon_count) },
    { label: "Customers", value: String(summary.total_customers) },
  ];

  return (
    <>
      <h2 className="page-title">Dashboard</h2>
      <div className="cards">
        {cards.map((card) => (
          <div className="card" key={card.label}>
            <div className="label">{card.label}</div>
            <div className="value">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h3>Last 7 days — revenue &amp; profit</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={summary.daily_sales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" stroke="#059669" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3>Best selling products</h3>
        {summary.best_sellers.length === 0 ? (
          <p className="muted">No sales recorded yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.best_sellers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="product_name" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="panel">
        <h3>Low stock alerts</h3>
        <AlertTable
          rows={alerts.low_stock.map((p) => ({
            name: p.name,
            detail: `${p.quantity} ${p.unit} left (min ${p.minimum_stock})`,
            tone: "low" as const,
            tag: "Low stock",
          }))}
          empty="All products are above minimum stock."
        />
      </div>

      <div className="panel">
        <h3>Expiry alerts</h3>
        <AlertTable
          rows={[
            ...alerts.expired.map((p) => ({
              name: p.name,
              detail: `Expired on ${p.expiry_date}`,
              tone: "expired" as const,
              tag: "Expired",
            })),
            ...alerts.expiring_soon.map((p) => ({
              name: p.name,
              detail: `Expires on ${p.expiry_date}`,
              tone: "low" as const,
              tag: "Expiring",
            })),
          ]}
          empty="Nothing expiring in the next 30 days."
        />
      </div>
    </>
  );
}

function AlertTable({
  rows,
  empty,
}: {
  rows: { name: string; detail: string; tone: "low" | "expired"; tag: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <table>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.name}-${row.tag}`}>
            <td>{row.name}</td>
            <td>{row.detail}</td>
            <td>
              <span className={`badge ${row.tone}`}>{row.tag}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
