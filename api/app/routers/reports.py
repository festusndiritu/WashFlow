from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Date, cast, func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import Identity, get_current_identity, get_membership_for_identity
from ..models import MembershipRole, Order, Shop
from ..schemas.reports import DailyRevenue, ReportsSummary, ShopRevenue

router = APIRouter()


@router.get("/summary", response_model=ReportsSummary)
def get_summary(
    days: int = Query(default=30, ge=1, le=365),
    shop_id: str | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> ReportsSummary:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    base = db.query(Order).filter(
        Order.tenant_id == identity.tenant_id,
        Order.created_at >= since,
    )

    is_owner = identity.role == MembershipRole.OWNER.value
    if is_owner:
        if shop_id:
            base = base.filter(Order.shop_id == shop_id)
    else:
        membership = get_membership_for_identity(db, identity)
        effective_shop_id = shop_id or identity.shop_id or membership.shop_id
        if effective_shop_id:
            base = base.filter(Order.shop_id == effective_shop_id)

    sub = base.subquery()

    # Aggregate totals
    agg = db.query(
        func.coalesce(func.sum(sub.c.total_amount), 0).label("revenue"),
        func.count(sub.c.id).label("orders"),
    ).one()

    # Orders by status
    status_rows = (
        db.query(sub.c.status, func.count(sub.c.id))
        .group_by(sub.c.status)
        .all()
    )
    orders_by_status = {s: c for s, c in status_rows}

    # Shop breakdown (owner only, cross-shop view)
    shop_breakdown: list[ShopRevenue] = []
    if is_owner and not shop_id:
        shop_rows = (
            db.query(
                Shop.id,
                Shop.name,
                func.coalesce(func.sum(sub.c.total_amount), 0).label("revenue"),
                func.count(sub.c.id).label("orders"),
            )
            .join(sub, sub.c.shop_id == Shop.id)
            .group_by(Shop.id, Shop.name)
            .order_by(func.sum(sub.c.total_amount).desc())
            .all()
        )
        shop_breakdown = [
            ShopRevenue(shop_id=r[0], shop_name=r[1], revenue=float(r[2]), orders=r[3])
            for r in shop_rows
        ]

    # Daily revenue (sorted ascending)
    day_col = cast(sub.c.created_at, Date).label("day")
    daily_rows = (
        db.query(
            day_col,
            func.coalesce(func.sum(sub.c.total_amount), 0).label("revenue"),
            func.count(sub.c.id).label("orders"),
        )
        .group_by(day_col)
        .order_by(day_col)
        .all()
    )
    daily_revenue = [
        DailyRevenue(date=str(r[0]), revenue=float(r[1]), orders=r[2])
        for r in daily_rows
    ]

    return ReportsSummary(
        period_days=days,
        total_revenue=float(agg.revenue),
        total_orders=int(agg.orders),
        orders_by_status=orders_by_status,
        shop_breakdown=shop_breakdown,
        daily_revenue=daily_revenue,
    )

