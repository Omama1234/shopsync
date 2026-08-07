from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, or_, select

from ..db import get_session
from ..models import Product
from ..schemas import ProductCreate, ProductUpdate

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[Product])
def list_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: bool = False,
    session: Session = Depends(get_session),
) -> list[Product]:
    statement = select(Product)
    if search:
        pattern = f"%{search}%"
        statement = statement.where(
            or_(
                Product.name.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.barcode.ilike(pattern),
            )
        )
    if category:
        statement = statement.where(Product.category == category)
    if low_stock:
        statement = statement.where(Product.quantity <= Product.minimum_stock)
    return list(session.exec(statement.order_by(Product.name)).all())


@router.post("", response_model=Product, status_code=201)
def create_product(payload: ProductCreate, session: Session = Depends(get_session)) -> Product:
    if payload.barcode:
        existing = session.exec(select(Product).where(Product.barcode == payload.barcode)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Barcode already exists")
    product = Product(**payload.model_dump())
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.get("/alerts")
def alerts(
    days: int = Query(30, ge=1, le=365), session: Session = Depends(get_session)
) -> dict:
    today = date.today()
    horizon = today + timedelta(days=days)
    products = session.exec(select(Product)).all()
    low_stock = [p for p in products if p.quantity <= p.minimum_stock]
    expired = [p for p in products if p.expiry_date and p.expiry_date < today]
    expiring = [
        p for p in products if p.expiry_date and today <= p.expiry_date <= horizon
    ]
    return {
        "low_stock": low_stock,
        "expired": expired,
        "expiring_soon": sorted(expiring, key=lambda p: p.expiry_date),
    }


@router.get("/{product_id}", response_model=Product)
def get_product(product_id: int, session: Session = Depends(get_session)) -> Product:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=Product)
def update_product(
    product_id: int, payload: ProductUpdate, session: Session = Depends(get_session)
) -> Product:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, session: Session = Depends(get_session)) -> None:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(product)
    session.commit()
