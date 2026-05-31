from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import Identity, get_current_identity, get_membership_for_identity
from ..models import Customer, MembershipRole, Order
from ..schemas.customer import CustomerCreate, CustomerResponse
from ..schemas.order import OrderResponse
from ..services.citapay import localize_phone

router = APIRouter()


@router.get("", response_model=list[CustomerResponse])
def list_customers(
    shop_id: str | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> list[Customer]:
    membership = get_membership_for_identity(db, identity)
    query = db.query(Customer).filter(Customer.tenant_id == identity.tenant_id)

    if identity.role == MembershipRole.OWNER.value:
        if shop_id:
            query = query.filter(Customer.shop_id == shop_id)
        return query.order_by(Customer.created_at.desc()).all()

    effective_shop_id = shop_id or identity.shop_id or membership.shop_id
    if not effective_shop_id:
        return []

    return query.filter(Customer.shop_id == effective_shop_id).order_by(Customer.created_at.desc()).all()


@router.post("", response_model=CustomerResponse)
def create_customer(
    payload: CustomerCreate,
    shop_id: str | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Customer:
    membership = get_membership_for_identity(db, identity)

    effective_shop_id = shop_id or identity.shop_id or membership.shop_id
    if not effective_shop_id:
        raise HTTPException(status_code=400, detail="No active shop selected")

    if identity.role != MembershipRole.OWNER.value and membership.shop_id and membership.shop_id != effective_shop_id:
        raise HTTPException(status_code=403, detail="Cannot create customer for this shop")

    customer = Customer(
        tenant_id=identity.tenant_id,
        shop_id=effective_shop_id,
        name=payload.name,
        phone=localize_phone(payload.phone) if payload.phone else payload.phone,
        email=payload.email,
        notes=payload.notes,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}/orders", response_model=list[OrderResponse])
def get_customer_orders(
    customer_id: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> list[Order]:
    customer = db.query(Customer).filter(
        Customer.id == customer_id, Customer.tenant_id == identity.tenant_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return (
        db.query(Order)
        .filter(Order.customer_id == customer_id, Order.tenant_id == identity.tenant_id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> None:
    if identity.role not in (MembershipRole.OWNER.value, MembershipRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only owners and admins can delete customers")

    customer = db.query(Customer).filter(
        Customer.id == customer_id, Customer.tenant_id == identity.tenant_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    db.delete(customer)
    db.commit()
