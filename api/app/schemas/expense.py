from datetime import date

from pydantic import BaseModel, Field


class ExpenseCreate(BaseModel):
    amount: float = Field(gt=0)
    category: str = Field(default="other")
    description: str = Field(min_length=1, max_length=500)
    reference: str | None = None
    expense_date: date
    shop_id: str | None = None


class ExpenseResponse(BaseModel):
    id: str
    amount: float
    category: str
    description: str
    reference: str | None
    expense_date: date
    shop_id: str | None
    shop_name: str | None = None
    created_at: str

    model_config = {"from_attributes": True}
