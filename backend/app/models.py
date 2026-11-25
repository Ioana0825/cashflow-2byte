"""
Database models (the tables of our PostgreSQL database).

Each class below is an SQLAlchemy "model": a Python class that maps to one
table. Each `Column(...)` becomes one column in that table. When the app
starts, `Base.metadata.create_all()` (in main.py) creates any tables that do
not exist yet.

We have two tables:
    users         -> the people who have an account
    transactions  -> incomes and expenses; every row belongs to one user
"""

from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    """Current time in UTC, used as the default for created_at / updated_at.

    datetime.utcnow() is deprecated in new Python versions, so we use
    datetime.now(timezone.utc). Our columns store times without a time zone,
    so we drop the zone info (.replace(tzinfo=None)); the value is still UTC.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    # Primary key: a number PostgreSQL increases automatically (1, 2, 3, ...)
    id = Column(Integer, primary_key=True, index=True)

    # unique=True -> two accounts can never have the same email
    email = Column(String, unique=True, index=True, nullable=False)

    # We NEVER store the real password, only its bcrypt hash (see security.py)
    hashed_password = Column(String, nullable=False)

    # Filled in automatically when the row is created
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Lets us write `user.transactions` to get all of a user's transactions.
    # cascade="all, delete-orphan" -> deleting a user also deletes their transactions.
    transactions = relationship(
        "Transaction", back_populates="owner", cascade="all, delete-orphan"
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign key: links each transaction to the user who owns it.
    # ondelete="CASCADE" does the same clean-up at the database level.
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Numeric(10, 2) = exact decimal number, up to 10 digits, 2 after the point.
    # We use Numeric instead of Float for money because floats make rounding
    # errors (0.1 + 0.2 = 0.30000000000000004).
    amount = Column(Numeric(10, 2), nullable=False)

    type = Column(String, nullable=False)  # "income" or "expense"
    category = Column(String, nullable=False)  # e.g. "Food", "Salary"
    description = Column(String, nullable=True)  # optional note
    date = Column(Date, nullable=False)  # the day the money moved

    created_at = Column(DateTime, default=utc_now, nullable=False)
    # onupdate -> SQLAlchemy refreshes this every time the row is edited
    updated_at = Column(
        DateTime, default=utc_now, onupdate=utc_now, nullable=False
    )

    # Lets us write `transaction.owner` to get the User object
    owner = relationship("User", back_populates="transactions")

    # Extra rules enforced by PostgreSQL itself, as a safety net behind the
    # validation we already do in schemas.py
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("type IN ('income', 'expense')", name="type_valid"),
        # Speeds up the most common query: "this user's transactions by date"
        Index("ix_transactions_user_date", "user_id", "date"),
    )
