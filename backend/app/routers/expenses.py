from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, func, select, text

from ..deps import DB, StaffUser
from ..models import Expense
from ..schemas import ExpenseCreate, ExpenseListOut, ExpenseOut, ExpenseUpdate

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=ExpenseListOut)
def list_expenses(
    db: DB,
    _: StaffUser,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    """List all expenses and discounts with total sum and count."""
    expenses = db.scalars(
        select(Expense).order_by(Expense.created_at.desc(), Expense.id.desc()).limit(limit).offset(offset)
    ).all()

    total_amount = db.scalar(select(func.coalesce(func.sum(Expense.amount), Decimal("0.00")))) or Decimal("0.00")
    count = db.scalar(select(func.count(Expense.id))) or 0

    return {
        "items": expenses,
        "total_amount": total_amount,
        "count": count,
    }


@router.get("/summary")
def get_expenses_summary(db: DB, _: StaffUser):
    """Get total expenses amount and count."""
    total_amount = db.scalar(select(func.coalesce(func.sum(Expense.amount), Decimal("0.00")))) or Decimal("0.00")
    count = db.scalar(select(func.count(Expense.id))) or 0
    return {
        "total_amount": float(total_amount),
        "count": count,
    }


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, db: DB, _: StaffUser):
    """Add a new expense or discount record."""
    expense = Expense(
        amount=data.amount,
        description=data.description.strip(),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(expense_id: int, db: DB, _: StaffUser):
    """Get a single expense record."""
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سجل المصروف غير موجود")
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, data: ExpenseUpdate, db: DB, _: StaffUser):
    """Update an existing expense record."""
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سجل المصروف غير موجود")

    if data.amount is not None:
        expense.amount = data.amount
    if data.description is not None:
        expense.description = data.description.strip()

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: DB, _: StaffUser):
    """Delete a specific expense record."""
    expense = db.get(Expense, expense_id)
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="سجل المصروف غير موجود")

    db.delete(expense)
    db.commit()
    return {"message": f"تم حذف سجل المصروف #{expense_id} بنجاح", "id": expense_id}


@router.delete("")
def clear_all_expenses(db: DB, _: StaffUser):
    """Clear all expenses history and reset sequence counter to 1."""
    db.execute(delete(Expense))
    db.commit()

    # Reset counter sequence
    # SQLite
    try:
        db.execute(text("DELETE FROM sqlite_sequence WHERE name = 'expenses'"))
        db.commit()
    except Exception:
        pass

    # PostgreSQL
    try:
        db.execute(text("ALTER SEQUENCE expenses_id_seq RESTART WITH 1"))
        db.commit()
    except Exception:
        pass

    return {"message": "تم مسح جميع سجلات المصروفات والخصومات وإعادة ترقيمها بنجاح"}
