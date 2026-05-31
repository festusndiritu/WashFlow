from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import get_platform_identity
from ..models import Membership, MembershipRole, Order, Shop, Tenant, User
from ..schemas.platform import PlatformDashboardResponse

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
