from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    sales: list["Sale"] = Relationship(back_populates="customer")


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    sku: Optional[str] = Field(default=None, index=True)
    barcode: Optional[str] = Field(default=None, index=True)
    category: Optional[str] = None
    brand: Optional[str] = None
    unit: str = "pcs"
    purchase_price: float = 0.0
    selling_price: float = 0.0
    gst_percent: float = 0.0
    quantity: float = 0.0
    minimum_stock: float = 0.0
    expiry_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    items: list["SaleItem"] = Relationship(back_populates="product")


class Sale(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_number: str = Field(index=True, unique=True)
    customer_id: Optional[int] = Field(default=None, foreign_key="customer.id")
    payment_method: str = "cash"
    subtotal: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    profit: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    customer: Optional[Customer] = Relationship(back_populates="sales")
    items: list["SaleItem"] = Relationship(
        back_populates="sale",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class SaleItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sale_id: int = Field(foreign_key="sale.id")
    product_id: int = Field(foreign_key="product.id")
    product_name: str
    quantity: float
    unit_price: float
    purchase_price: float
    gst_percent: float
    discount: float = 0.0
    line_total: float = 0.0

    sale: Optional[Sale] = Relationship(back_populates="items")
    product: Optional[Product] = Relationship(back_populates="items")
