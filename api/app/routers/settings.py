from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import hash_password, verify_password
from ..deps import Identity, get_current_identity
from ..models import Tenant, User
from ..schemas.settings import PasswordChange, TenantSettingsResponse, TenantUpdate

router = APIRouter()


@router.get("", response_model=TenantSettingsResponse)
def get_settings(
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> TenantSettingsResponse:
    tenant = db.query(Tenant).filter(Tenant.id == identity.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantSettingsResponse(
        tenant_id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        created_at=tenant.created_at,
    )


@router.put("", response_model=TenantSettingsResponse)
def update_settings(
    payload: TenantUpdate,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> TenantSettingsResponse:
    from ..models import MembershipRole
    if identity.role != MembershipRole.OWNER.value:
        raise HTTPException(status_code=403, detail="Only the owner can update organization settings")

    tenant = db.query(Tenant).filter(Tenant.id == identity.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.name = payload.name
    db.commit()
    db.refresh(tenant)
    return TenantSettingsResponse(
        tenant_id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        created_at=tenant.created_at,
    )


@router.put("/password", status_code=204)
def change_password(
    payload: PasswordChange,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> None:
    user = db.query(User).filter(User.id == identity.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
