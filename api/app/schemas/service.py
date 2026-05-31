from datetime import datetime

from pydantic import BaseModel, Field


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = Field(default="general", max_length=60)
    unit: str = Field(default="item", max_length=30)
    price_per_unit: float = Field(ge=0)
    shop_id: str | None = None  # None = all shops


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    category: str | None = Field(default=None, max_length=60)
    unit: str | None = Field(default=None, max_length=30)
    price_per_unit: float | None = Field(default=None, ge=0)
    shop_id: str | None = None
    is_active: bool | None = None


class ServiceResponse(BaseModel):
    id: str
    tenant_id: str
    shop_id: str | None
    name: str
    category: str
    unit: str
    price_per_unit: float
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
