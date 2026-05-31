from datetime import datetime

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    email: str | None = None
    notes: str | None = None


class CustomerResponse(BaseModel):
    id: str
    tenant_id: str
    shop_id: str
    name: str
    phone: str
    email: str | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True
