from pydantic import BaseModel


class ShopRevenue(BaseModel):
    shop_id: str
    shop_name: str
    revenue: float
    orders: int


class DailyRevenue(BaseModel):
    date: str
    revenue: float
    orders: int


class ReportsSummary(BaseModel):
    period_days: int
    total_revenue: float
    total_orders: int
    orders_by_status: dict[str, int]
    shop_breakdown: list[ShopRevenue]
    daily_revenue: list[DailyRevenue]
