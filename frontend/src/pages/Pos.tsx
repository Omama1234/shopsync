import { useEffect, useMemo, useState } from "react";

import { api, currency, type Customer, type Product, type Sale } from "../api";

interface CartLine {
  product: Product;
  quantity: number;
  discount: number;
}

const PAYMENT_METHODS = ["cash", "upi", "credit card", "debit card", "wallet", "credit"];

export default function Pos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [billDiscount, setBillDiscount] = useState("0");
  const [invoice, setInvoice] = useState<Sale | null>(null);
  const [error, setError] = useState("");

  const reload = async () => {
    const [prods, custs] = await Promise.all([api.products(), api.customers()]);
    setProducts(prods);
    setCustomers(custs);
  };

  useEffect(() => {
    void reload().catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.barcode ?? "").toLowerCase().includes(term) ||
          (p.sku ?? "").toLowerCase().includes(term),
      )
      .slice(0, 12);
  }, [products, search]);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { product, quantity: 1, discount: 0 }];
    });
    setSearch("");
  };

  const updateLine = (productId: number, patch: Partial<CartLine>) =>
    setCart((current) =>
      current.map((line) => (line.product.id === productId ? { ...line, ...patch } : line)),
    );

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let lineDiscounts = 0;
    for (const line of cart) {
      const gross = line.product.selling_price * line.quantity;
      const net = Math.max(gross - line.discount, 0);
      subtotal += gross;
      lineDiscounts += line.discount;
      tax += (net * line.product.gst_percent) / 100;
    }
    const discount = lineDiscounts + Number(billDiscount || 0);
    const total = Math.max(subtotal - discount, 0) + tax;
    return { subtotal, discount, tax, total };
  }, [cart, billDiscount]);

  const checkout = async () => {
    try {
      const sale = await api.createSale({
        customer_id: customerId ? Number(customerId) : null,
        payment_method: paymentMethod,
        discount: Number(billDiscount || 0),
        items: cart.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          discount: line.discount,
        })),
      });
      setInvoice(sale);
      setCart([]);
      setBillDiscount("0");
      setError("");
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <h2 className="page-title">Billing (POS)</h2>
      {error && <p className="error">{error}</p>}
      <div className="pos">
        <div>
          <div className="panel">
            <h3>Find products</h3>
            <input
              placeholder="Scan barcode or type product name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <table style={{ marginTop: 12 }}>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{currency(product.selling_price)}</td>
                    <td>
                      {product.quantity} {product.unit}
                    </td>
                    <td>
                      <button
                        className="link"
                        disabled={product.quantity <= 0}
                        onClick={() => addToCart(product)}
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>Cart</h3>
            {cart.length === 0 ? (
              <p className="muted">Cart is empty.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Discount</th>
                    <th>Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.product.id}>
                      <td>
                        {line.product.name}
                        <div className="muted">
                          {currency(line.product.selling_price)} · GST{" "}
                          {line.product.gst_percent}%
                        </div>
                      </td>
                      <td>
                        <input
                          className="qty-input"
                          type="number"
                          min={1}
                          max={line.product.quantity}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.product.id, {
                              quantity: Math.max(1, Number(e.target.value)),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="qty-input"
                          type="number"
                          min={0}
                          value={line.discount}
                          onChange={(e) =>
                            updateLine(line.product.id, {
                              discount: Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                      </td>
                      <td>
                        {currency(
                          Math.max(
                            line.product.selling_price * line.quantity - line.discount,
                            0,
                          ),
                        )}
                      </td>
                      <td>
                        <button
                          className="link"
                          onClick={() =>
                            setCart((c) => c.filter((l) => l.product.id !== line.product.id))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            <h3>Checkout</h3>
            <div className="field">
              <label>Customer</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in (no customer)</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label>Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label>Bill discount (₹)</label>
              <input
                type="number"
                min={0}
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
              />
            </div>
            <div className="totals" style={{ marginTop: 14 }}>
              <div>
                <span>Subtotal</span>
                <span>{currency(totals.subtotal)}</span>
              </div>
              <div>
                <span>Discount</span>
                <span>-{currency(totals.discount)}</span>
              </div>
              <div>
                <span>GST</span>
                <span>{currency(totals.tax)}</span>
              </div>
              <div className="grand">
                <span>Total</span>
                <span>{currency(totals.total)}</span>
              </div>
            </div>
            <button
              style={{ marginTop: 14, width: "100%" }}
              disabled={cart.length === 0}
              onClick={() => void checkout()}
            >
              Generate invoice
            </button>
          </div>

          {invoice && (
            <div className="panel">
              <h3>Invoice {invoice.invoice_number}</h3>
              <p className="muted">
                {invoice.customer_name ?? "Walk-in customer"} ·{" "}
                {invoice.payment_method.toUpperCase()} ·{" "}
                {new Date(invoice.created_at).toLocaleString()}
              </p>
              <table>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.product_id}>
                      <td>
                        {item.product_name} × {item.quantity}
                      </td>
                      <td>{currency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="totals">
                <div>
                  <span>Tax</span>
                  <span>{currency(invoice.tax)}</span>
                </div>
                <div>
                  <span>Profit</span>
                  <span>{currency(invoice.profit)}</span>
                </div>
                <div className="grand">
                  <span>Paid</span>
                  <span>{currency(invoice.total)}</span>
                </div>
              </div>
              <button
                className="secondary"
                style={{ marginTop: 10 }}
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
