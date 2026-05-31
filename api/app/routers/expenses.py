from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..deps import Identity, get_current_identity
from ..models.expense import Expense
from ..models.shop import Shop
from ..schemas.expense import ExpenseCreate, ExpenseResponse

router = APIRouter()

VALID_CATEGORIES = {"supplies", "utilities", "maintenance", "equipment", "staff", "other"}


@router.get("", response_model=list[ExpenseResponse])
def list_expenses(
    shop_id: str | None = Query(default=None),
    category: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> list[ExpenseResponse]:
    q = db.query(Expense, Shop.name).outerjoin(Shop, Expense.shop_id == Shop.id).filter(
        Expense.tenant_id == identity.tenant_id
    )
    if shop_id:
        q = q.filter(Expense.shop_id == shop_id)
    elif identity.shop_id:
        q = q.filter(Expense.shop_id == identity.shop_id)
    if category and category in VALID_CATEGORIES:
        q = q.filter(Expense.category == category)
    if from_date:
        q = q.filter(Expense.expense_date >= from_date)
    if to_date:
        q = q.filter(Expense.expense_date <= to_date)
    q = q.order_by(Expense.expense_date.desc(), Expense.created_at.desc())

    results = []
    for exp, shop_name in q.all():
        results.append(ExpenseResponse(
            id=exp.id,
            amount=float(exp.amount),
            category=exp.category,
            description=exp.description,
            reference=exp.reference,
            expense_date=exp.expense_date,
            shop_id=exp.shop_id,
            shop_name=shop_name,
            created_at=exp.created_at.isoformat(),
        ))
    return results


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> ExpenseResponse:
    if payload.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")

    shop_name: str | None = None
    if payload.shop_id:
        shop = db.query(Shop).filter(Shop.id == payload.shop_id, Shop.tenant_id == identity.tenant_id).first()
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")
        shop_name = shop.name

    exp = Expense(
        tenant_id=identity.tenant_id,
        shop_id=payload.shop_id or identity.shop_id,
        amount=payload.amount,
        category=payload.category,
        description=payload.description,
        reference=payload.reference,
        expense_date=payload.expense_date,
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    return ExpenseResponse(
        id=exp.id,
        amount=float(exp.amount),
        category=exp.category,
        description=exp.description,
        reference=exp.reference,
        expense_date=exp.expense_date,
        shop_id=exp.shop_id,
        shop_name=shop_name,
        created_at=exp.created_at.isoformat(),
    )


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str,
    identity: Identity = Depends(get_current_identity),
    db: Session = Depends(get_db),
) -> None:
    exp = db.query(Expense).filter(Expense.id == expense_id, Expense.tenant_id == identity.tenant_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(exp)
    db.commit()
