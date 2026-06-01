from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import get_platform_identity
from ..models import Membership, MembershipRole, Order, Shop, Tenant, User
from ..schemas.platform import (
    PlatformDashboardResponse,
    PlatformOrderRow,
    PlatformOrdersResponse,
    PlatformPlanStat,
    PlatformPlansResponse,
    PlatformRevenueResponse,
    PlatformTenantDetail,
    PlatformTenantsResponse,
    PlatformUserRow,
    PlatformUsersResponse,
    TenantPlanUpdate,
    TenantStatusUpdate,
)

router = APIRouter()


@router.get('/dashboard', response_model=PlatformDashboardResponse)
def get_platform_dashboard(_=Depends(get_platform_identity), db: Session = Depends(get_db)) -> PlatformDashboardResponse:
    total_tenants = db.query(func.count(Tenant.id)).scalar() or 0
    total_shops = db.query(func.count(Shop.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0

    active_workers = (
        db.query(func.count(Membership.id))
        .filter(Membership.role == MembershipRole.WORKER.value)
        .scalar()
        or 0
    )

    recent_rows = db.query(Tenant).order_by(Tenant.created_at.desc()).limit(5).all()
    recent_tenants = [{"id": row.id, "name": row.name, "slug": row.slug} for row in recent_rows]

    return PlatformDashboardResponse(
        total_tenants=total_tenants,
        total_shops=total_shops,
        total_users=total_users,
        total_orders=total_orders,
        active_workers=active_workers,
        recent_tenants=recent_tenants,
    )


@router.get('/tenants', response_model=PlatformTenantsResponse)
def list_tenants(
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PlatformTenantsResponse:
    base = db.query(Tenant).order_by(Tenant.created_at.desc())
    total = base.count()
    rows = base.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for t in rows:
        shops_count = db.query(func.count(Shop.id)).filter(Shop.tenant_id == t.id).scalar() or 0
        users_count = (
            db.query(func.count(Membership.id.distinct()))
            .filter(Membership.tenant_id == t.id)
            .scalar()
            or 0
        )
        orders_count = db.query(func.count(Order.id)).filter(Order.tenant_id == t.id).scalar() or 0
        revenue = (
            db.query(func.coalesce(func.sum(Order.total_amount), 0))
            .filter(Order.tenant_id == t.id, Order.payment_status == "paid")
            .scalar()
            or 0
        )
        items.append(PlatformTenantDetail(
            id=t.id,
            name=t.name,
            slug=t.slug,
            status=t.status,
            plan=t.plan,
            created_at=t.created_at.isoformat(),
            shops_count=shops_count,
            users_count=users_count,
            orders_count=orders_count,
            revenue=float(revenue),
        ))

    return PlatformTenantsResponse(items=items, total=total, page=page, page_size=page_size)


@router.patch('/tenants/{tenant_id}/status', response_model=PlatformTenantDetail)
def update_tenant_status(
    tenant_id: str,
    payload: TenantStatusUpdate,
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
) -> PlatformTenantDetail:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    tenant.status = payload.status
    db.commit()
    db.refresh(tenant)
    shops_count = db.query(func.count(Shop.id)).filter(Shop.tenant_id == tenant.id).scalar() or 0
    users_count = db.query(func.count(Membership.id.distinct())).filter(Membership.tenant_id == tenant.id).scalar() or 0
    orders_count = db.query(func.count(Order.id)).filter(Order.tenant_id == tenant.id).scalar() or 0
    revenue = float(db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(Order.tenant_id == tenant.id, Order.payment_status == "paid").scalar() or 0)
    return PlatformTenantDetail(id=tenant.id, name=tenant.name, slug=tenant.slug, status=tenant.status, plan=tenant.plan, created_at=tenant.created_at.isoformat(), shops_count=shops_count, users_count=users_count, orders_count=orders_count, revenue=revenue)


@router.patch('/tenants/{tenant_id}/plan', response_model=PlatformTenantDetail)
def update_tenant_plan(
    tenant_id: str,
    payload: TenantPlanUpdate,
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
) -> PlatformTenantDetail:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    tenant.plan = payload.plan
    db.commit()
    db.refresh(tenant)
    shops_count = db.query(func.count(Shop.id)).filter(Shop.tenant_id == tenant.id).scalar() or 0
    users_count = db.query(func.count(Membership.id.distinct())).filter(Membership.tenant_id == tenant.id).scalar() or 0
    orders_count = db.query(func.count(Order.id)).filter(Order.tenant_id == tenant.id).scalar() or 0
    revenue = float(db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(Order.tenant_id == tenant.id, Order.payment_status == "paid").scalar() or 0)
    return PlatformTenantDetail(id=tenant.id, name=tenant.name, slug=tenant.slug, status=tenant.status, plan=tenant.plan, created_at=tenant.created_at.isoformat(), shops_count=shops_count, users_count=users_count, orders_count=orders_count, revenue=revenue)


@router.delete('/tenants/{tenant_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_tenant(
    tenant_id: str,
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
) -> None:
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    db.delete(tenant)
    db.commit()


@router.get('/revenue', response_model=PlatformRevenueResponse)
def get_revenue(
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
) -> PlatformRevenueResponse:
    total = float(
        db.query(func.coalesce(func.sum(Order.total_amount), 0))
        .filter(Order.payment_status == "paid")
        .scalar()
        or 0
    )

    rows = (
        db.query(Tenant.id, Tenant.name, Tenant.slug, Tenant.plan,
                 func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
                 func.count(Order.id).label("paid_orders"))
        .outerjoin(Order, (Order.tenant_id == Tenant.id) & (Order.payment_status == "paid"))
        .group_by(Tenant.id)
        .order_by(func.sum(Order.total_amount).desc().nullslast())
        .all()
    )

    breakdown = [
        {"id": r.id, "name": r.name, "slug": r.slug, "plan": r.plan, "revenue": float(r.revenue), "paid_orders": r.paid_orders}
        for r in rows
    ]

    return PlatformRevenueResponse(total_revenue=total, breakdown=breakdown)


@router.get('/orders', response_model=PlatformOrdersResponse)
def list_all_orders(
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    search: str = Query("", alias="q"),
    tenant_id: str = Query(""),
) -> PlatformOrdersResponse:
    base = db.query(Order, Tenant.name.label("tenant_name")).join(Tenant, Tenant.id == Order.tenant_id)
    if tenant_id:
        base = base.filter(Order.tenant_id == tenant_id)
    if search:
        base = base.filter(Order.id.ilike(f"%{search}%"))
    total = base.count()
    rows = base.order_by(Order.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        PlatformOrderRow(
            id=o.id,
            tenant_id=o.tenant_id,
            tenant_name=tenant_name,
            status=o.status,
            payment_status=o.payment_status,
            total_amount=float(o.total_amount),
            created_at=o.created_at.isoformat(),
        )
        for o, tenant_name in rows
    ]
    return PlatformOrdersResponse(items=items, total=total, page=page, page_size=page_size)


@router.get('/users', response_model=PlatformUsersResponse)
def list_all_users(
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    search: str = Query("", alias="q"),
) -> PlatformUsersResponse:
    base = db.query(User)
    if search:
        base = base.filter(
            User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    total = base.count()
    users = base.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for u in users:
        memberships = db.query(Membership, Tenant.name.label("tenant_name")).join(Tenant, Tenant.id == Membership.tenant_id).filter(Membership.user_id == u.id).all()
        tenant_names = [m.tenant_name for m, _ in memberships] if memberships else []
        roles = list({m.role for m, _ in memberships}) if memberships else []
        items.append(PlatformUserRow(
            id=u.id,
            name=u.name,
            email=u.email,
            is_platform_owner=u.is_platform_owner,
            is_active=u.is_active,
            tenants=tenant_names,
            roles=roles,
            created_at=u.created_at.isoformat(),
        ))

    return PlatformUsersResponse(items=items, total=total, page=page, page_size=page_size)


PLAN_CONFIG: dict[str, dict] = {
    "free":       {"label": "Free",       "price_kes": 0,     "shops": 1,  "users": 3,  "orders_per_month": 50},
    "starter":    {"label": "Starter",    "price_kes": 1500,  "shops": 2,  "users": 10, "orders_per_month": 300},
    "pro":        {"label": "Pro",        "price_kes": 4500,  "shops": 5,  "users": 30, "orders_per_month": 1000},
    "enterprise": {"label": "Enterprise", "price_kes": 12000, "shops": -1, "users": -1, "orders_per_month": -1},
}


@router.get('/plans', response_model=PlatformPlansResponse)
def get_plans(
    _=Depends(get_platform_identity),
    db: Session = Depends(get_db),
) -> PlatformPlansResponse:
    counts_raw = db.query(Tenant.plan, func.count(Tenant.id)).group_by(Tenant.plan).all()
    counts: dict[str, int] = {plan: cnt for plan, cnt in counts_raw}

    plans = [
        PlatformPlanStat(
            key=key,
            label=cfg["label"],
            price_kes=cfg["price_kes"],
            shops=cfg["shops"],
            users=cfg["users"],
            orders_per_month=cfg["orders_per_month"],
            tenant_count=counts.get(key, 0),
        )
        for key, cfg in PLAN_CONFIG.items()
    ]
    return PlatformPlansResponse(plans=plans)
