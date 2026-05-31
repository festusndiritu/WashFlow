from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import Identity, get_current_identity, require_owner_or_admin
from ..models import Shop
from ..models.service import Service
from ..schemas.service import ServiceCreate, ServiceResponse, ServiceUpdate

router = APIRouter()


@router.get("", response_model=list[ServiceResponse])
def list_services(
    shop_id: str | None = None,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> list[Service]:
    """Return active services for this tenant.

    If shop_id is provided, return services scoped to that shop OR scoped to all shops (shop_id IS NULL).
    Otherwise return all services for the tenant.
    """
    q = db.query(Service).filter(
        Service.tenant_id == identity.tenant_id,
        Service.is_active == True,  # noqa: E712
    )
    if shop_id:
        q = q.filter((Service.shop_id == shop_id) | (Service.shop_id == None))  # noqa: E711
    return q.order_by(Service.category, Service.name).all()


@router.post("", response_model=ServiceResponse, status_code=201)
def create_service(
    payload: ServiceCreate,
    identity: Identity = Depends(require_owner_or_admin),
    db: Session = Depends(get_db),
) -> Service:
    if payload.shop_id:
        shop = db.query(Shop).filter(Shop.id == payload.shop_id, Shop.tenant_id == identity.tenant_id).first()
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")

    svc = Service(
        tenant_id=identity.tenant_id,
        shop_id=payload.shop_id,
        name=payload.name,
        category=payload.category,
        unit=payload.unit,
        price_per_unit=payload.price_per_unit,
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.put("/{service_id}", response_model=ServiceResponse)
def update_service(
    service_id: str,
    payload: ServiceUpdate,
    identity: Identity = Depends(require_owner_or_admin),
    db: Session = Depends(get_db),
) -> Service:
    svc = db.query(Service).filter(Service.id == service_id, Service.tenant_id == identity.tenant_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    if payload.name is not None:
        svc.name = payload.name
    if payload.category is not None:
        svc.category = payload.category
    if payload.unit is not None:
        svc.unit = payload.unit
    if payload.price_per_unit is not None:
        svc.price_per_unit = payload.price_per_unit
    if payload.is_active is not None:
        svc.is_active = payload.is_active
    if "shop_id" in payload.model_fields_set:
        svc.shop_id = payload.shop_id

    db.commit()
    db.refresh(svc)
    return svc


@router.delete("/{service_id}", status_code=204)
def delete_service(
    service_id: str,
    identity: Identity = Depends(require_owner_or_admin),
    db: Session = Depends(get_db),
) -> None:
    svc = db.query(Service).filter(Service.id == service_id, Service.tenant_id == identity.tenant_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(svc)
    db.commit()
