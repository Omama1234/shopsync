import { NavLink, Navigate, Route, Routes } from "react-router-dom";

import Customers from "./pages/Customers";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Pos from "./pages/Pos";
import Reports from "./pages/Reports";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/inventory", label: "Inventory" },
  { to: "/pos", label: "Billing (POS)" },
  { to: "/customers", label: "Customers" },
  { to: "/reports", label: "Reports" },
];

export default function App() {
  return (
    <div className="app">
      <nav className="sidebar">
        <h1>ShopSync</h1>
        <p className="tagline">Inventory &amp; Billing</p>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/pos" element={<Pos />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}
