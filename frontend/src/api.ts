export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface Product {
  id: number;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  brand?: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  gst_percent: number;
  quantity: number;
  minimum_stock: number;
  expiry_date?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  gst_number?: string | null;
}

export interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  discount: number;
  line_total: number;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string | null;
  payment_method: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  profit: number;
  created_at: string;
  items: SaleItem[];
}

export interface DashboardSummary {
  today_sales: number;
  today_profit: number;
  month_revenue: number;
  month_profit: number;
  total_products: number;
  low_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
  total_customers: number;
  daily_sales: { date: string; revenue: number; profit: number }[];
  best_sellers: { product_name: string; quantity: number; revenue: number }[];
}

export interface Alerts {
  low_stock: Product[];
  expired: Product[];
  expiring_soon: Product[];
}

export interface SalesReport {
  start: string;
  end: string;
  invoice_count: number;
  revenue: number;
  tax: number;
  discount: number;
  profit: number;
  rows: {
    invoice_number: string;
    created_at: string;
    payment_method: string;
    total: number;
    profit: number;
  }[];
}

export interface InventoryReport {
  total_products: number;
  stock_value: number;
  retail_value: number;
  potential_profit: number;
  rows: {
    name: string;
    category: string | null;
    quantity: number;
    minimum_stock: number;
    stock_value: number;
    expiry_date: string | null;
  }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const api = {
  products: (search = "") =>
    request<Product[]>(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createProduct: (payload: Partial<Product>) =>
    request<Product>("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id: number, payload: Partial<Product>) =>
    request<Product>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProduct: (id: number) =>
    request<void>(`/api/products/${id}`, { method: "DELETE" }),
  alerts: () => request<Alerts>("/api/products/alerts"),
  customers: () => request<Customer[]>("/api/customers"),
  createCustomer: (payload: Partial<Customer>) =>
    request<Customer>("/api/customers", { method: "POST", body: JSON.stringify(payload) }),
  sales: () => request<Sale[]>("/api/sales"),
  createSale: (payload: {
    customer_id: number | null;
    payment_method: string;
    discount: number;
    items: { product_id: number; quantity: number; discount: number }[];
  }) => request<Sale>("/api/sales", { method: "POST", body: JSON.stringify(payload) }),
  dashboard: () => request<DashboardSummary>("/api/reports/dashboard"),
  salesReport: () => request<SalesReport>("/api/reports/sales"),
  inventoryReport: () => request<InventoryReport>("/api/reports/inventory"),
};

export const currency = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
