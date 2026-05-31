from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import hash_password
from ..deps import Identity, require_owner_or_admin
from ..models import Membership, MembershipRole, MembershipScope, Shop, User
from ..schemas.team import TeamMemberCreate, TeamMemberResponse

router = APIRouter()


@router.get("", response_model=list[TeamMemberResponse])
def list_members(identity: Identity = Depends(require_owner_or_admin), db: Session = Depends(get_db)) -> list[TeamMemberResponse]:
    memberships = (
        db.query(Membership)
        .filter(Membership.tenant_id == identity.tenant_id)
        .order_by(Membership.created_at.desc())
        .all()
    )

    user_ids = [m.user_id for m in memberships]
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    users_map = {u.id: u for u in users}

    response: list[TeamMemberResponse] = []
    for membership in memberships:
        user = users_map.get(membership.user_id)
        if not user:
            continue
        response.append(
            TeamMemberResponse(
                user_id=user.id,
                name=user.name,
                email=user.email,
                role=membership.role,
                scope=membership.scope,
                shop_id=membership.shop_id,
                created_at=membership.created_at,
            )
        )

    return response


@router.post("", response_model=TeamMemberResponse)
def create_member(
    payload: TeamMemberCreate,
    identity: Identity = Depends(require_owner_or_admin),
    db: Session = Depends(get_db),
) -> TeamMemberResponse:
    if payload.role == MembershipRole.OWNER.value:
        raise HTTPException(status_code=400, detail='Owner role cannot be assigned here')

    if identity.role == MembershipRole.ADMIN.value and payload.role == MembershipRole.ADMIN.value:
        raise HTTPException(status_code=403, detail='Admins cannot create other admins')

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail='User email already exists')

    if payload.shop_id:
        shop = db.query(Shop).filter(Shop.id == payload.shop_id, Shop.tenant_id == identity.tenant_id).first()
        if not shop:
            raise HTTPException(status_code=404, detail='Shop not found')

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )

    membership = Membership(
        user=user,
        tenant_id=identity.tenant_id,
        role=payload.role,
        scope=MembershipScope.SINGLE_SHOP.value if payload.shop_id else MembershipScope.ALL_SHOPS.value,
        shop_id=payload.shop_id,
    )

    db.add_all([user, membership])
    db.commit()
    db.refresh(user)
    db.refresh(membership)

    return TeamMemberResponse(
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=membership.role,
        scope=membership.scope,
        shop_id=membership.shop_id,
        created_at=membership.created_at,
    )


@router.delete("/{user_id}", status_code=204)
def remove_member(
    user_id: str,
    identity: Identity = Depends(require_owner_or_admin),
    db: Session = Depends(get_db),
) -> None:
    membership = db.query(Membership).filter(
        Membership.user_id == user_id,
        Membership.tenant_id == identity.tenant_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Team member not found")

    if membership.role == MembershipRole.OWNER.value:
        raise HTTPException(status_code=403, detail="Cannot remove the owner")

    if identity.role == MembershipRole.ADMIN.value and membership.role == MembershipRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Admins cannot remove other admins")

    db.delete(membership)
    db.commit()
