from datetime import datetime

from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    order_id: str
    amount: float = Field(gt=0)
    method: str = Field(default="cash", pattern="^(cash|mpesa)$")
    mpesa_ref: str | None = None
    notes: str | None = None


class PaymentResponse(BaseModel):
    id: str
    tenant_id: str
    shop_id: str
    order_id: str
    amount: float
    method: str
    mpesa_ref: str | None
    citapay_reference: str | None = None
    notes: str | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
