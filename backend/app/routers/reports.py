import csv
import io
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlmodel import Session, func, select

from ..db import get_session
from ..models import Customer, Product, Sale, SaleItem
from ..schemas import DashboardSummary

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    return datetime.combine(day, time.min), datetime.combine(day, time.max)


def _sum_between(session: Session, start: datetime, end: datetime) -> tuple[float, float]:
    row = session.exec(
        select(
            func.coalesce(func.sum(Sale.total), 0.0),
            func.coalesce(func.sum(Sale.profit), 0.0),
        ).where(Sale.created_at >= start, Sale.created_at <= end)
    ).one()
    return float(row[0]), float(row[1])


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(session: Session = Depends(get_session)) -> DashboardSummary:
    today = date.today()
    start_today, end_today = _day_bounds(today)
    today_sales, today_profit = _sum_between(session, start_today, end_today)
    month_start = datetime.combine(today.replace(day=1), time.min)
    month_revenue, month_profit = _sum_between(session, month_start, end_today)

    products = session.exec(select(Product)).all()
    low_stock = [p for p in products if p.quantity <= p.minimum_stock]
    expired = [p for p in products if p.expiry_date and p.expiry_date < today]
    expiring = [
        p
        for p in products
        if p.expiry_date and today <= p.expiry_date <= today + timedelta(days=30)
    ]

    daily_sales = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        start, end = _day_bounds(day)
        revenue, profit = _sum_between(session, start, end)
        daily_sales.append({"date": day.isoformat(), "revenue": revenue, "profit": profit})

    best_rows = session.exec(
        select(
            SaleItem.product_name,
            func.sum(SaleItem.quantity),
            func.sum(SaleItem.line_total),
        )
        .group_by(SaleItem.product_name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
    ).all()

    return DashboardSummary(
        today_sales=round(today_sales, 2),
        today_profit=round(today_profit, 2),
        month_revenue=round(month_revenue, 2),
        month_profit=round(month_profit, 2),
        total_products=len(products),
        low_stock_count=len(low_stock),
        expiring_soon_count=len(expiring),
        expired_count=len(expired),
        total_customers=session.exec(select(func.count(Customer.id))).one(),
        daily_sales=daily_sales,
        best_sellers=[
            {"product_name": r[0], "quantity": float(r[1]), "revenue": round(float(r[2]), 2)}
            for r in best_rows
        ],
    )


@router.get("/sales")
def sales_report(
    start: date | None = None,
    end: date | None = None,
    session: Session = Depends(get_session),
) -> dict:
    end = end or date.today()
    start = start or end - timedelta(days=29)
    start_dt, end_dt = datetime.combine(start, time.min), datetime.combine(end, time.max)
    sales = session.exec(
        select(Sale).where(Sale.created_at >= start_dt, Sale.created_at <= end_dt)
    ).all()
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "invoice_count": len(sales),
        "revenue": round(sum(s.total for s in sales), 2),
        "tax": round(sum(s.tax for s in sales), 2),
        "discount": round(sum(s.discount for s in sales), 2),
        "profit": round(sum(s.profit for s in sales), 2),
        "rows": [
            {
                "invoice_number": s.invoice_number,
                "created_at": s.created_at.isoformat(),
                "payment_method": s.payment_method,
                "total": s.total,
                "profit": s.profit,
            }
            for s in sorted(sales, key=lambda s: s.created_at, reverse=True)
        ],
    }


@router.get("/sales.csv")
def sales_report_csv(
    start: date | None = None,
    end: date | None = None,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    report = sales_report(start=start, end=end, session=session)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Invoice", "Date", "Payment", "Total", "Profit"])
    for row in report["rows"]:
        writer.writerow(
            [
                row["invoice_number"],
                row["created_at"],
                row["payment_method"],
                row["total"],
                row["profit"],
            ]
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sales-report.csv"},
    )


@router.get("/inventory")
def inventory_report(session: Session = Depends(get_session)) -> dict:
    products = session.exec(select(Product)).all()
    stock_value = sum(p.purchase_price * p.quantity for p in products)
    retail_value = sum(p.selling_price * p.quantity for p in products)
    return {
        "total_products": len(products),
        "stock_value": round(stock_value, 2),
        "retail_value": round(retail_value, 2),
        "potential_profit": round(retail_value - stock_value, 2),
        "rows": [
            {
                "name": p.name,
                "category": p.category,
                "quantity": p.quantity,
                "minimum_stock": p.minimum_stock,
                "stock_value": round(p.purchase_price * p.quantity, 2),
                "expiry_date": p.expiry_date.isoformat() if p.expiry_date else None,
            }
            for p in products
        ],
    }
