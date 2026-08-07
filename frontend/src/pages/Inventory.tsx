import { useCallback, useEffect, useState } from "react";

import { api, currency, type Product } from "../api";

const CATEGORIES = [
  "Grocery",
  "Dairy",
  "Vegetables",
  "Fruits",
  "Electronics",
  "Medicines",
  "Cosmetics",
  "Hardware",
  "Clothing",
  "Mobile Accessories",
  "Stationery",
  "Bakery",
  "Others",
];

const emptyForm = {
  name: "",
  barcode: "",
  category: "Grocery",
  unit: "pcs",
  purchase_price: "",
  selling_price: "",
  gst_percent: "",
  quantity: "",
  minimum_stock: "",
  expiry_date: "",
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (term: string) => {
    try {
      setProducts(await api.products(term));
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(search), 250);
    return () => clearTimeout(timer);
  }, [search, load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.createProduct({
        name: form.name,
        barcode: form.barcode || null,
        category: form.category,
        unit: form.unit,
        purchase_price: Number(form.purchase_price || 0),
        selling_price: Number(form.selling_price || 0),
        gst_percent: Number(form.gst_percent || 0),
        quantity: Number(form.quantity || 0),
        minimum_stock: Number(form.minimum_stock || 0),
        expiry_date: form.expiry_date || null,
      });
      setForm({ ...emptyForm });
      setShowForm(false);
      await load(search);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const addStock = async (product: Product) => {
    const input = window.prompt(`Add stock for ${product.name}`, "10");
    if (!input) return;
    const amount = Number(input);
    if (Number.isNaN(amount)) return;
    await api.updateProduct(product.id, { quantity: product.quantity + amount });
    await load(search);
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try {
      await api.deleteProduct(product.id);
      await load(search);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h2 className="page-title">Inventory</h2>
      <div className="panel">
        <div className="row">
          <input
            style={{ maxWidth: 320 }}
            placeholder="Search by name, SKU or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add product"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {showForm && (
          <form onSubmit={submit} style={{ marginTop: 16 }}>
            <div className="form-grid">
              <Field label="Product name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Barcode">
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit">
                <input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </Field>
              <Field label="Purchase price">
                <input
                  type="number"
                  step="0.01"
                  value={form.purchase_price}
                  onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                />
              </Field>
              <Field label="Selling price">
                <input
                  type="number"
                  step="0.01"
                  value={form.selling_price}
                  onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                />
              </Field>
              <Field label="GST %">
                <input
                  type="number"
                  step="0.01"
                  value={form.gst_percent}
                  onChange={(e) => setForm({ ...form, gst_percent: e.target.value })}
                />
              </Field>
              <Field label="Quantity">
                <input
                  type="number"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </Field>
              <Field label="Minimum stock">
                <input
                  type="number"
                  step="0.01"
                  value={form.minimum_stock}
                  onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })}
                />
              </Field>
              <Field label="Expiry date">
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit">Save product</button>
            </div>
          </form>
        )}
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Cost</th>
              <th>Price</th>
              <th>GST</th>
              <th>Expiry</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const expired = !!product.expiry_date && product.expiry_date < today;
              const low = product.quantity <= product.minimum_stock;
              return (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category}</td>
                  <td>
                    {product.quantity} {product.unit}
                  </td>
                  <td>{currency(product.purchase_price)}</td>
                  <td>{currency(product.selling_price)}</td>
                  <td>{product.gst_percent}%</td>
                  <td>{product.expiry_date ?? "—"}</td>
                  <td>
                    {expired ? (
                      <span className="badge expired">Expired</span>
                    ) : low ? (
                      <span className="badge low">Low stock</span>
                    ) : (
                      <span className="badge ok">OK</span>
                    )}
                  </td>
                  <td>
                    <button className="link" onClick={() => void addStock(product)}>
                      Add stock
                    </button>
                    <button className="link" onClick={() => void remove(product)}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
