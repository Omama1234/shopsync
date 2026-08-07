import { useEffect, useState } from "react";

import { api, currency, type Customer, type Sale } from "../api";

const emptyForm = { name: "", mobile: "", email: "", address: "", gst_number: "" };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");

  const load = async () => {
    const [custs, allSales] = await Promise.all([api.customers(), api.sales()]);
    setCustomers(custs);
    setSales(allSales);
  };

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.createCustomer({
        name: form.name,
        mobile: form.mobile || null,
        email: form.email || null,
        address: form.address || null,
        gst_number: form.gst_number || null,
      });
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const statsFor = (customerId: number) => {
    const own = sales.filter((sale) => sale.customer_id === customerId);
    return {
      count: own.length,
      spent: own.reduce((sum, sale) => sum + sale.total, 0),
    };
  };

  return (
    <>
      <h2 className="page-title">Customers</h2>
      {error && <p className="error">{error}</p>}
      <div className="panel">
        <h3>Add customer</h3>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label>Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Mobile</label>
              <input
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="field">
              <label>GST number</label>
              <input
                value={form.gst_number}
                onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" style={{ marginTop: 12 }}>
            Save customer
          </button>
        </form>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Invoices</th>
              <th>Total spent</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const stats = statsFor(customer.id);
              return (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.mobile ?? "—"}</td>
                  <td>{customer.email ?? "—"}</td>
                  <td>{stats.count}</td>
                  <td>{currency(stats.spent)}</td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
