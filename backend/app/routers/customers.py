from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

from ..db import get_session
from ..models import Customer, Sale
from ..schemas import CustomerCreate

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[Customer])
def list_customers(session: Session = Depends(get_session)) -> list[Customer]:
    return list(session.exec(select(Customer).order_by(Customer.name)).all())


@router.post("", response_model=Customer, status_code=201)
def create_customer(
    payload: CustomerCreate, session: Session = Depends(get_session)
) -> Customer:
    customer = Customer(**payload.model_dump())
    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer


@router.get("/{customer_id}")
def get_customer(customer_id: int, session: Session = Depends(get_session)) -> dict:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    totals = session.exec(
        select(func.count(Sale.id), func.coalesce(func.sum(Sale.total), 0.0)).where(
            Sale.customer_id == customer_id
        )
    ).one()
    return {
        "customer": customer,
        "purchase_count": totals[0],
        "total_spent": float(totals[1]),
    }


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: int, session: Session = Depends(get_session)) -> None:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    session.delete(customer)
    session.commit()
