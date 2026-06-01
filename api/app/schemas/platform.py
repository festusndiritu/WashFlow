from pydantic import BaseModel


class PlatformDashboardResponse(BaseModel):
    total_tenants: int
    total_shops: int
    total_users: int
    total_orders: int
    active_workers: int
    recent_tenants: list[dict[str, str]]


class PlatformTenantDetail(BaseModel):
    id: str
    name: str
    slug: str
    status: str
    plan: str
    created_at: str
    shops_count: int
    users_count: int
    orders_count: int
    revenue: float


class PlatformTenantsResponse(BaseModel):
    items: list[PlatformTenantDetail]
    total: int
    page: int
    page_size: int


class TenantStatusUpdate(BaseModel):
    status: str  # active | suspended


class TenantPlanUpdate(BaseModel):
    plan: str  # free | starter | pro | enterprise


class PlatformRevenueResponse(BaseModel):
    total_revenue: float
    breakdown: list[dict]


class PlatformOrderRow(BaseModel):
    id: str
    tenant_id: str
    tenant_name: str
    status: str
    payment_status: str
    total_amount: float
    created_at: str


class PlatformOrdersResponse(BaseModel):
    items: list[PlatformOrderRow]
    total: int
    page: int
    page_size: int


class PlatformUserRow(BaseModel):
    id: str
    name: str
    email: str
    is_platform_owner: bool
    is_active: bool
    tenants: list[str]
    roles: list[str]
    created_at: str


class PlatformUsersResponse(BaseModel):
    items: list[PlatformUserRow]
    total: int
    page: int
    page_size: int


class PlatformPlanStat(BaseModel):
    key: str
    label: str
    price_kes: int
    shops: int        # -1 = unlimited
    users: int        # -1 = unlimited
    orders_per_month: int  # -1 = unlimited
    tenant_count: int


class PlatformPlansResponse(BaseModel):
    plans: list[PlatformPlanStat]
