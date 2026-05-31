from datetime import datetime

from pydantic import BaseModel, Field


class TenantSettingsResponse(BaseModel):
    tenant_id: str
    name: str
    slug: str
    created_at: datetime

    class Config:
        from_attributes = True


class TenantUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
