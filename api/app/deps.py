from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .core.db import get_db
from .core.security import TokenDecodeError, decode_access_token
from .models import Membership, MembershipRole, MembershipScope

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@dataclass
class Identity:
    user_id: str
    tenant_id: str
    role: str
    shop_id: str | None = None


@dataclass
class PlatformIdentity:
    user_id: str


def get_membership_for_identity(db: Session, identity: Identity) -> Membership:
    membership = (
        db.query(Membership)
        .filter(Membership.user_id == identity.user_id, Membership.tenant_id == identity.tenant_id)
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return membership


def get_current_identity(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Identity:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )

    try:
        payload = decode_access_token(token)
    except TokenDecodeError:
        raise credentials_error

    user_id = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    role = payload.get("role")
    shop_id = payload.get("shop_id")
    if not user_id or not tenant_id or not role:
        raise credentials_error

    membership = get_membership_for_identity(db, Identity(user_id=user_id, tenant_id=tenant_id, role=role))

    if shop_id and not can_access_shop(Identity(user_id=user_id, tenant_id=tenant_id, role=role), membership, shop_id):
        raise credentials_error

    return Identity(user_id=user_id, tenant_id=tenant_id, role=role, shop_id=shop_id)


def require_owner(identity: Identity = Depends(get_current_identity)) -> Identity:
    if identity.role != MembershipRole.OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")
    return identity


def require_owner_or_admin(identity: Identity = Depends(get_current_identity)) -> Identity:
    if identity.role not in {MembershipRole.OWNER.value, MembershipRole.ADMIN.value}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner or admin access required")
    return identity


def get_platform_identity(token: str = Depends(oauth2_scheme)) -> PlatformIdentity:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Platform access denied",
    )
    try:
        payload = decode_access_token(token)
    except TokenDecodeError:
        raise credentials_error

    user_id = payload.get("sub")
    is_platform_owner = payload.get("platform_owner")
    if not user_id or not is_platform_owner:
        raise credentials_error

    return PlatformIdentity(user_id=user_id)


def can_access_shop(identity: Identity, membership: Membership, shop_id: str) -> bool:
    if identity.role == MembershipRole.OWNER.value:
        return True
    if membership.scope == MembershipScope.ALL_SHOPS.value:
        return True
    return membership.shop_id == shop_id
