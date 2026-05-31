import secrets

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import Identity, get_current_identity, require_owner
from ..models import Membership, MembershipRole, MembershipScope, Shop
from ..schemas.shop import ShopCreate, ShopResponse

router = APIRouter()


def make_shop_code(name: str) -> str:
    base = "".join(ch for ch in name.upper() if ch.isalnum())[:6]
    if len(base) < 3:
        base = (base + "SHOP")[:4]
    return f"{base}-{secrets.token_hex(2).upper()}"


@router.get("", response_model=list[ShopResponse])
def list_shops(identity: Identity = Depends(get_current_identity), db: Session = Depends(get_db)) -> list[Shop]:
    membership = (
        db.query(Membership)
        .filter(Membership.user_id == identity.user_id, Membership.tenant_id == identity.tenant_id)
        .first()
    )
    if membership and (
        membership.role == MembershipRole.OWNER.value or membership.scope == MembershipScope.ALL_SHOPS.value
    ):
        return db.query(Shop).filter(Shop.tenant_id == identity.tenant_id).order_by(Shop.created_at.asc()).all()

    if membership and membership.shop_id:
        return db.query(Shop).filter(Shop.id == membership.shop_id).all()

    return []


@router.post("", response_model=ShopResponse)
def create_shop(
    payload: ShopCreate,
    identity: Identity = Depends(require_owner),
    db: Session = Depends(get_db),
) -> Shop:
    shop = Shop(
        tenant_id=identity.tenant_id,
        name=payload.name,
        timezone=payload.timezone,
        code=make_shop_code(payload.name),
    )
    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop
