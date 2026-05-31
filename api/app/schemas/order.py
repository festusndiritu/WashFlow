from datetime import date, datetime

from pydantic import BaseModel, Field


class OrderItemCreate(BaseModel):
    service_name: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)


class OrderItemResponse(BaseModel):
    id: str
    order_id: str
    service_name: str
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    customer_id: str
    notes: str | None = None
    pickup_date: date | None = None
    delivery_date: date | None = None
    total_amount: float = Field(ge=0, default=0)
    items: list[OrderItemCreate] = []


class OrderStatusUpdate(BaseModel):
    status: str


class OrderAssignRequest(BaseModel):
    worker_id: str | None = None


class OrderUpdate(BaseModel):
    notes: str | None = None
    pickup_date: date | None = None
    delivery_date: date | None = None
    total_amount: float = Field(ge=0, default=0)
    items: list[OrderItemCreate] = []


class OrderResponse(BaseModel):
    id: str
    tenant_id: str
    shop_id: str
    customer_id: str
    worker_id: str | None
    status: str
    payment_status: str = "unpaid"
    source: str = "manual"
    notes: str | None
    pickup_date: date | None
    delivery_date: date | None
    total_amount: float
    items: list[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
