from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from ..db import get_session
from ..models import Customer, Product, Sale, SaleItem
from ..schemas import SaleCreate, SaleItemRead, SaleRead

router = APIRouter(prefix="/api/sales", tags=["sales"])


def _next_invoice_number(session: Session) -> str:
    count = session.exec(select(func.count(Sale.id))).one()
    return f"INV-{datetime.utcnow():%Y%m%d}-{count + 1:04d}"


def _to_read(sale: Sale, customer_name: str | None) -> SaleRead:
    return SaleRead(
        id=sale.id,
        invoice_number=sale.invoice_number,
        customer_id=sale.customer_id,
        customer_name=customer_name,
        payment_method=sale.payment_method,
        subtotal=sale.subtotal,
        discount=sale.discount,
        tax=sale.tax,
        total=sale.total,
        profit=sale.profit,
        created_at=sale.created_at,
        items=[
            SaleItemRead(
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
                gst_percent=item.gst_percent,
                discount=item.discount,
                line_total=item.line_total,
            )
            for item in sale.items
        ],
    )


@router.post("", response_model=SaleRead, status_code=201)
def create_sale(payload: SaleCreate, session: Session = Depends(get_session)) -> SaleRead:
    if not payload.items:
        raise HTTPException(status_code=400, detail="Sale must contain at least one item")

    customer_name = None
    if payload.customer_id is not None:
        customer = session.get(Customer, payload.customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        customer_name = customer.name

    sale = Sale(
        invoice_number=_next_invoice_number(session),
        customer_id=payload.customer_id,
        payment_method=payload.payment_method,
    )

    subtotal = 0.0
    tax_total = 0.0
    cost_total = 0.0
    item_discounts = 0.0

    for line in payload.items:
        product = session.get(Product, line.product_id)
        if not product:
            raise HTTPException(
                status_code=404, detail=f"Product {line.product_id} not found"
            )
        if product.quantity < line.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product.name} (available {product.quantity})",
            )

        gross = product.selling_price * line.quantity
        net = max(gross - line.discount, 0.0)
        tax = net * product.gst_percent / 100.0

        subtotal += gross
        item_discounts += line.discount
        tax_total += tax
        cost_total += product.purchase_price * line.quantity

        product.quantity -= line.quantity
        session.add(product)
        sale.items.append(
            SaleItem(
                product_id=product.id,
                product_name=product.name,
                quantity=line.quantity,
                unit_price=product.selling_price,
                purchase_price=product.purchase_price,
                gst_percent=product.gst_percent,
                discount=line.discount,
                line_total=round(net + tax, 2),
            )
        )

    total_discount = item_discounts + payload.discount
    net_revenue = max(subtotal - total_discount, 0.0)
    sale.subtotal = round(subtotal, 2)
    sale.discount = round(total_discount, 2)
    sale.tax = round(tax_total, 2)
    sale.total = round(net_revenue + tax_total, 2)
    sale.profit = round(net_revenue - cost_total, 2)

    session.add(sale)
    session.commit()
    session.refresh(sale)
    return _to_read(sale, customer_name)


@router.get("", response_model=list[SaleRead])
def list_sales(limit: int = 50, session: Session = Depends(get_session)) -> list[SaleRead]:
    sales = session.exec(
        select(Sale).order_by(Sale.created_at.desc()).limit(limit)
    ).all()
    return [_to_read(s, s.customer.name if s.customer else None) for s in sales]


@router.get("/{sale_id}", response_model=SaleRead)
def get_sale(sale_id: int, session: Session = Depends(get_session)) -> SaleRead:
    sale = session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return _to_read(sale, sale.customer.name if sale.customer else None)
