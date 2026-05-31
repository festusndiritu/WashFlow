import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import Identity, get_current_identity, get_membership_for_identity
from ..models import Customer, MembershipRole, Order, OrderItem, User
from ..schemas.order import OrderAssignRequest, OrderCreate, OrderResponse, OrderStatusUpdate, OrderUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=list[OrderResponse])
def list_orders(
    shop_id: str | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> list[Order]:
    membership = get_membership_for_identity(db, identity)
    query = db.query(Order).filter(Order.tenant_id == identity.tenant_id)

    if identity.role == MembershipRole.WORKER.value:
        # Workers only see orders assigned to them
        return query.filter(Order.worker_id == identity.user_id).order_by(Order.created_at.desc()).all()

    if identity.role == MembershipRole.OWNER.value:
        if shop_id:
            query = query.filter(Order.shop_id == shop_id)
        return query.order_by(Order.created_at.desc()).all()

    effective_shop_id = shop_id or identity.shop_id or membership.shop_id
    if not effective_shop_id:
        return []

    return query.filter(Order.shop_id == effective_shop_id).order_by(Order.created_at.desc()).all()


@router.post("", response_model=OrderResponse)
def create_order(
    payload: OrderCreate,
    shop_id: str | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Order:
    membership = get_membership_for_identity(db, identity)
    if identity.role == MembershipRole.WORKER.value:
        raise HTTPException(status_code=403, detail="Workers cannot create orders")

    effective_shop_id = shop_id or identity.shop_id or membership.shop_id
    if not effective_shop_id:
        raise HTTPException(status_code=400, detail="No active shop selected")

    if identity.role != MembershipRole.OWNER.value and membership.shop_id and membership.shop_id != effective_shop_id:
        raise HTTPException(status_code=403, detail="Cannot create order for this shop")

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == payload.customer_id,
            Customer.tenant_id == identity.tenant_id,
            Customer.shop_id == effective_shop_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found in selected shop")

    if payload.items:
        total = sum(item.quantity * item.unit_price for item in payload.items)
    else:
        total = payload.total_amount

    order = Order(
        tenant_id=identity.tenant_id,
        shop_id=effective_shop_id,
        customer_id=payload.customer_id,
        status="received",
        notes=payload.notes,
        pickup_date=payload.pickup_date,
        delivery_date=payload.delivery_date,
        total_amount=total,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.flush()

    for item in payload.items:
        db.add(
            OrderItem(
                order_id=order.id,
                service_name=item.service_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
        )

    db.commit()
    db.refresh(order)
    return order


VALID_STATUSES = {"received", "washing", "ready", "delivered"}


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Order:
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}")

    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == identity.tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    membership = get_membership_for_identity(db, identity)
    if identity.role == MembershipRole.WORKER.value:
        if order.worker_id != identity.user_id:
            raise HTTPException(status_code=403, detail="Not assigned to this order")

    order.status = payload.status
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/assign", response_model=OrderResponse)
def assign_order(
    order_id: str,
    payload: OrderAssignRequest,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Order:
    if identity.role == MembershipRole.WORKER.value:
        raise HTTPException(status_code=403, detail="Workers cannot assign orders")

    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == identity.tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if payload.worker_id:
        worker = db.query(User).filter(
            User.id == payload.worker_id,
            User.is_platform_owner.is_(False),
        ).first()
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")

    order.worker_id = payload.worker_id
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    payload: OrderUpdate,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Order:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == identity.tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if identity.role == MembershipRole.WORKER.value:
        raise HTTPException(status_code=403, detail="Workers cannot edit order details")

    membership = get_membership_for_identity(db, identity)
    if identity.role not in (MembershipRole.OWNER.value, MembershipRole.ADMIN.value):
        if membership.shop_id and membership.shop_id != order.shop_id:
            raise HTTPException(status_code=403, detail="Not authorized for this shop")

    order.notes = payload.notes
    order.pickup_date = payload.pickup_date
    order.delivery_date = payload.delivery_date
    order.updated_at = datetime.now(timezone.utc)

    if payload.items:
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
        total = sum(item.quantity * item.unit_price for item in payload.items)
        order.total_amount = total
        for item in payload.items:
            db.add(OrderItem(
                order_id=order.id,
                service_name=item.service_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
            ))
    elif payload.total_amount > 0:
        order.total_amount = payload.total_amount

    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=204)
def delete_order(
    order_id: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> None:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == identity.tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if identity.role == MembershipRole.WORKER.value:
        raise HTTPException(status_code=403, detail="Workers cannot delete orders")

    membership = get_membership_for_identity(db, identity)
    if identity.role not in (MembershipRole.OWNER.value, MembershipRole.ADMIN.value):
        if membership.shop_id and membership.shop_id != order.shop_id:
            raise HTTPException(status_code=403, detail="Not authorized for this shop")

    db.delete(order)
    db.commit()

router = APIRouter()


@router.get("", response_model=list[OrderResponse])
def list_orders(
    shop_id: str | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> list[Order]:
    membership = get_membership_for_identity(db, identity)
    query = db.query(Order).filter(Order.tenant_id == identity.tenant_id)

    if identity.role == MembershipRole.OWNER.value:
        if shop_id:
            query = query.filter(Order.shop_id == shop_id)
        return query.order_by(Order.created_at.desc()).all()

    effective_shop_id = shop_id or identity.shop_id or membership.shop_id
    if not effective_shop_id:
        return []

    return query.filter(Order.shop_id == effective_shop_id).order_by(Order.created_at.desc()).all()


@router.post("", response_model=OrderResponse)
def create_order(
    payload: OrderCreate,
    shop_id: str | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Order:
    membership = get_membership_for_identity(db, identity)
    effective_shop_id = shop_id or identity.shop_id or membership.shop_id
    if not effective_shop_id:
        raise HTTPException(status_code=400, detail="No active shop selected")

    if identity.role != MembershipRole.OWNER.value and membership.shop_id and membership.shop_id != effective_shop_id:
        raise HTTPException(status_code=403, detail="Cannot create order for this shop")

    customer = (
        db.query(Customer)
        .filter(
            Customer.id == payload.customer_id,
            Customer.tenant_id == identity.tenant_id,
            Customer.shop_id == effective_shop_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found in selected shop")

    # If items provided, compute total from them; otherwise use the supplied total_amount.
    if payload.items:
        total = sum(item.quantity * item.unit_price for item in payload.items)
    else:
        total = payload.total_amount

    order = Order(
        tenant_id=identity.tenant_id,
        shop_id=effective_shop_id,
        customer_id=payload.customer_id,
        status="received",
        notes=payload.notes,
        total_amount=total,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(order)
    db.flush()  # get order.id before inserting items

    for item in payload.items:
        db.add(
            OrderItem(
                order_id=order.id,
                service_name=item.service_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
        )

    db.commit()
    db.refresh(order)
    return order


VALID_STATUSES = {"received", "washing", "ready", "delivered"}


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Order:
    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}")

    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == identity.tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    membership = get_membership_for_identity(db, identity)
    if identity.role not in (MembershipRole.OWNER.value, MembershipRole.ADMIN.value):
        if membership.shop_id and membership.shop_id != order.shop_id:
            raise HTTPException(status_code=403, detail="Not authorized for this shop")

    order.status = payload.status
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    payload: OrderUpdate,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> Order:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == identity.tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    membership = get_membership_for_identity(db, identity)
    if identity.role not in (MembershipRole.OWNER.value, MembershipRole.ADMIN.value):
        if membership.shop_id and membership.shop_id != order.shop_id:
            raise HTTPException(status_code=403, detail="Not authorized for this shop")

    order.notes = payload.notes
    order.updated_at = datetime.now(timezone.utc)

    if payload.items:
        # Replace all existing items
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
        total = sum(item.quantity * item.unit_price for item in payload.items)
        order.total_amount = total
        for item in payload.items:
            db.add(OrderItem(
                order_id=order.id,
                service_name=item.service_name,
                quantity=item.quantity,
                unit_price=item.unit_price,
            ))
    elif payload.total_amount > 0:
        order.total_amount = payload.total_amount

    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=204)
def delete_order(
    order_id: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> None:
    order = db.query(Order).filter(Order.id == order_id, Order.tenant_id == identity.tenant_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    membership = get_membership_for_identity(db, identity)
    if identity.role not in (MembershipRole.OWNER.value, MembershipRole.ADMIN.value):
        if membership.shop_id and membership.shop_id != order.shop_id:
            raise HTTPException(status_code=403, detail="Not authorized for this shop")

    db.delete(order)
    db.commit()
