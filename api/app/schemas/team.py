from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class TeamMemberCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(pattern='^(admin|worker)$')
    shop_id: str | None = None


class TeamMemberResponse(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    role: str
    scope: str
    shop_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
