from datetime import datetime

from pydantic import BaseModel, Field


class TenantSettingsResponse(BaseModel):
    tenant_id: str
    name: str
    slug: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True


class TenantUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


VALID_PLANS = {"free", "starter", "pro", "enterprise"}


class PlanUpdate(BaseModel):
    plan: str

    @classmethod
    def model_validator(cls, values: dict) -> dict:
        if values.get("plan") not in VALID_PLANS:
            raise ValueError(f"plan must be one of {', '.join(sorted(VALID_PLANS))}")
        return values
