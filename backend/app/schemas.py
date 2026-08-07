from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    unit: str = "pcs"
    purchase_price: float = 0.0
    selling_price: float = 0.0
    gst_percent: float = 0.0
    quantity: float = 0.0
    minimum_stock: float = 0.0
    expiry_date: Optional[date] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    unit: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    gst_percent: Optional[float] = None
    quantity: Optional[float] = None
    minimum_stock: Optional[float] = None
    expiry_date: Optional[date] = None


class CustomerCreate(BaseModel):
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class SaleItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(gt=0)
    discount: float = 0.0


class SaleCreate(BaseModel):
    customer_id: Optional[int] = None
    payment_method: str = "cash"
    discount: float = 0.0
    items: list[SaleItemCreate]


class SaleItemRead(BaseModel):
    product_id: int
    product_name: str
    quantity: float
    unit_price: float
    gst_percent: float
    discount: float
    line_total: float


class SaleRead(BaseModel):
    id: int
    invoice_number: str
    customer_id: Optional[int]
    customer_name: Optional[str] = None
    payment_method: str
    subtotal: float
    discount: float
    tax: float
    total: float
    profit: float
    created_at: datetime
    items: list[SaleItemRead]


class DashboardSummary(BaseModel):
    today_sales: float
    today_profit: float
    month_revenue: float
    month_profit: float
    total_products: int
    low_stock_count: int
    expiring_soon_count: int
    expired_count: int
    total_customers: int
    daily_sales: list[dict]
    best_sellers: list[dict]
