from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    owner_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    business_name: str = Field(min_length=2, max_length=120)
    first_shop_name: str = Field(min_length=2, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SwitchShopRequest(BaseModel):
    shop_id: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google RS256 ID token
    business_name: str | None = None
    first_shop_name: str | None = None


class PlatformBootstrapRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ShopSummary(BaseModel):
    id: str
    name: str
    code: str


class AuthUserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    is_platform_owner: bool


class TenantSummary(BaseModel):
    id: str
    name: str
    slug: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserResponse
    tenant: TenantSummary | None
    shops: list[ShopSummary]
    active_shop_id: str | None = None
