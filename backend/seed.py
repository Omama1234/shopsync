"""Populate the database with demo shop data."""

from datetime import date, timedelta

from sqlmodel import Session, select

from app.db import engine, init_db
from app.models import Customer, Product

PRODUCTS = [
    ("Basmati Rice 5kg", "Grocery", "8901234567890", 420.0, 520.0, 5.0, 24, 10, 400),
    ("Toned Milk 1L", "Dairy", "8901234567891", 48.0, 58.0, 0.0, 6, 12, 2),
    ("Brown Bread", "Bakery", "8901234567892", 32.0, 45.0, 5.0, 15, 5, 3),
    ("Paracetamol 500mg", "Medicines", "8901234567893", 18.0, 30.0, 12.0, 80, 20, 240),
    ("USB-C Cable 1m", "Mobile Accessories", "8901234567894", 90.0, 199.0, 18.0, 40, 10, None),
    ("Notebook A4 200p", "Stationery", "8901234567895", 45.0, 70.0, 12.0, 3, 15, None),
    ("Face Cream 50g", "Cosmetics", "8901234567896", 130.0, 220.0, 18.0, 18, 6, 120),
    ("LED Bulb 9W", "Electronics", "8901234567897", 65.0, 120.0, 18.0, 30, 8, None),
]

CUSTOMERS = [
    ("Rahul Sharma", "9876543210", "rahul@example.com"),
    ("Priya Nair", "9812345678", "priya@example.com"),
    ("Walk-in Customer", None, None),
]


def main() -> None:
    init_db()
    with Session(engine) as session:
        if session.exec(select(Product)).first():
            print("Database already seeded.")
            return
        today = date.today()
        for name, category, barcode, cost, price, gst, qty, minimum, expiry_days in PRODUCTS:
            session.add(
                Product(
                    name=name,
                    category=category,
                    barcode=barcode,
                    sku=barcode[-6:],
                    purchase_price=cost,
                    selling_price=price,
                    gst_percent=gst,
                    quantity=qty,
                    minimum_stock=minimum,
                    expiry_date=today + timedelta(days=expiry_days) if expiry_days else None,
                )
            )
        for name, mobile, email in CUSTOMERS:
            session.add(Customer(name=name, mobile=mobile, email=email))
        session.commit()
        print(f"Seeded {len(PRODUCTS)} products and {len(CUSTOMERS)} customers.")


if __name__ == "__main__":
    main()
