"""
Transaction routes (CRUD = Create, Read, Update, Delete).

    GET    /api/transactions         list my transactions (newest first, with filters)
    GET    /api/transactions/{id}    one of my transactions
    POST   /api/transactions         add a transaction          -> 201
    PUT    /api/transactions/{id}    change a transaction
    DELETE /api/transactions/{id}    delete a transaction       -> 204 (empty body)

THE MOST IMPORTANT RULE HERE: a user can only see and change THEIR OWN
transactions. That's why every route depends on get_current_user, and every
database query filters on `Transaction.user_id == current_user.id`.

If someone asks for a transaction that belongs to another user, we answer
404 "not found" (not 403 "forbidden"), so they can't even find out that the
id exists.
"""

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Transaction, User
from app.schemas import TransactionCreate, TransactionOut, TransactionType
from app.security import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def get_own_transaction(transaction_id: int, user: User, db: Session) -> Transaction:
    """Load a transaction by id, but only if it belongs to `user`; otherwise 404."""
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == user.id)
        .first()
    )
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found."
        )
    return transaction


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    # All of these are optional "query parameters", e.g.
    #   /api/transactions?type=expense&category=Food&from=2026-11-01&to=2026-11-30
    type: Optional[TransactionType] = None,
    category: Optional[str] = None,
    # "from" is a reserved word in Python, so the variable is date_from and
    # alias="from" keeps the nice name in the URL
    date_from: Optional[date] = Query(default=None, alias="from"),
    date_to: Optional[date] = Query(default=None, alias="to"),
    sort: Literal["newest", "oldest"] = "newest",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Transaction history of the logged-in user, in chronological order."""
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    # Each filter is only added if the client sent it
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        # Compare in lowercase, so "food" also finds "Food"
        query = query.filter(
            func.lower(Transaction.category) == category.strip().lower()
        )
    if date_from:
        query = query.filter(Transaction.date >= date_from)
    if date_to:
        query = query.filter(Transaction.date <= date_to)

    # Sort by date; for the same date, the one added later comes first (by id)
    if sort == "newest":
        query = query.order_by(Transaction.date.desc(), Transaction.id.desc())
    else:
        query = query.order_by(Transaction.date.asc(), Transaction.id.asc())

    return query.all()


@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """One transaction (used by the 'edit transaction' form)."""
    return get_own_transaction(transaction_id, current_user, db)


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new income or expense for the logged-in user."""
    # **data.model_dump() unpacks the validated fields: type=..., amount=..., ...
    # user_id comes from the TOKEN, never from the request body, so nobody
    # can create transactions for someone else
    transaction = Transaction(**data.model_dump(), user_id=current_user.id)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace all fields of an existing transaction (PUT = full update)."""
    transaction = get_own_transaction(transaction_id, current_user, db)

    # Copy every field from the request onto the database object
    for field, value in data.model_dump().items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a transaction. 204 = success, with nothing in the response body."""
    transaction = get_own_transaction(transaction_id, current_user, db)
    db.delete(transaction)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
