from datetime import datetime

from pydantic import BaseModel, Field


class ShopCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    timezone: str = Field(default="Africa/Nairobi", min_length=3, max_length=50)


class ShopResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    code: str
    timezone: str
    created_at: datetime

    class Config:
        from_attributes = True
