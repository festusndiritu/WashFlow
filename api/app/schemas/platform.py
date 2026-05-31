from pydantic import BaseModel


class PlatformDashboardResponse(BaseModel):
    total_tenants: int
    total_shops: int
    total_users: int
    total_orders: int
    active_workers: int
    recent_tenants: list[dict[str, str]]
