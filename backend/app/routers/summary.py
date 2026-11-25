"""
Summary routes: the numbers shown on the dashboard.

    GET /api/summary                  totals for ALL of my transactions
    GET /api/summary?month=2026-11    totals for one month only
    GET /api/summary/monthly          income/expenses per month (for a chart)

The sums are calculated by PostgreSQL (SUM ... GROUP BY), not by looping in
Python. The database is built for this and it stays fast even with many rows.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction, User
from app.schemas import CategoryTotal, MonthlyTotal, SummaryOut
from app.security import get_current_user

router = APIRouter(prefix="/api/summary", tags=["summary"])


def month_range(month: str) -> tuple[date, date]:
    """'2026-11' -> (2026-11-01, 2026-12-01). The end date is NOT included."""
    try:
        # "2026-11" -> year=2026, mon=11. Anything else ("nov", "2026",
        # "2026-13") raises ValueError, which we turn into a 400 error.
        year, mon = (int(part) for part in month.split("-"))
        start = date(year, mon, 1)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="month must look like YYYY-MM, e.g. 2026-11",
        )
    end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return start, end


@router.get("", response_model=SummaryOut)
def get_summary(
    # Checked by month_range() below, which gives a friendlier error message
    month: Optional[str] = Query(default=None, description="Optional, e.g. 2026-11"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Total income, total expenses and balance of the logged-in user."""
    # Start with "only my transactions", then optionally narrow to one month
    filters = [Transaction.user_id == current_user.id]
    if month:
        start, end = month_range(month)
        filters += [Transaction.date >= start, Transaction.date < end]

    # One query that computes both totals at once. In SQL it is:
    #   SELECT SUM(CASE WHEN type='income'  THEN amount ELSE 0 END),
    #          SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),
    #          COUNT(id)
    #   FROM transactions WHERE user_id = :me
    # coalesce(..., 0) turns "no rows" (NULL) into 0
    income_sum = func.coalesce(
        func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)), 0
    )
    expense_sum = func.coalesce(
        func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)), 0
    )
    total_income, total_expenses, count = (
        db.query(income_sum, expense_sum, func.count(Transaction.id))
        .filter(*filters)
        .one()
    )

    # Totals per category, e.g. Food/expense 450, Salary/income 3000.
    # Biggest amounts first, which is the natural order for a chart.
    category_rows = (
        db.query(
            Transaction.category,
            Transaction.type,
            func.sum(Transaction.amount).label("total"),
        )
        .filter(*filters)
        .group_by(Transaction.category, Transaction.type)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )

    return SummaryOut(
        total_income=float(total_income),
        total_expenses=float(total_expenses),
        balance=float(total_income - total_expenses),
        transaction_count=count,
        by_category=[
            CategoryTotal(category=row.category, type=row.type, total=float(row.total))
            for row in category_rows
        ],
    )


@router.get("/monthly", response_model=list[MonthlyTotal])
def get_monthly_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Income and expenses for every month that has transactions (oldest first)."""
    # date_trunc('month', date) turns 2026-11-20 into 2026-11-01, so all the
    # transactions of one month land in the same group
    month_col = func.date_trunc("month", Transaction.date).label("month")
    rows = (
        db.query(
            month_col,
            func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)),
            func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)),
        )
        .filter(Transaction.user_id == current_user.id)
        .group_by(month_col)
        .order_by(month_col)
        .all()
    )

    return [
        MonthlyTotal(
            month=month.strftime("%Y-%m"),
            income=float(income),
            expenses=float(expenses),
            balance=float(income - expenses),
        )
        for month, income, expenses in rows
    ]
