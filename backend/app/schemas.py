"""
Pydantic schemas: the shape of the JSON that goes IN and OUT of the API.

Why do we need these if we already have models.py?
    - models.py describes the DATABASE tables (SQLAlchemy).
    - schemas.py describes the JSON the API accepts and returns (Pydantic).

Keeping them separate lets us, for example, accept a `password` when someone
registers but never send `hashed_password` back in a response.

Pydantic also VALIDATES the incoming data for us. If a request breaks a rule
below (bad email, negative amount, ...), FastAPI rejects it before our code
runs, and main.py turns that into a clear 400 error message.

Naming convention used here:
    ...Create  -> data the client sends to create something
    ...Out     -> data the API sends back
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# The only two values allowed for a transaction's type
TransactionType = Literal["income", "expense"]


# ---------------------------------------------------------------- users / auth


class UserCreate(BaseModel):
    """Body of POST /api/auth/register."""

    email: EmailStr  # EmailStr checks that it really looks like an email
    password: str = Field(min_length=8, max_length=72)
    # max 72 because bcrypt only uses the first 72 bytes of a password


class UserLogin(BaseModel):
    """Body of POST /api/auth/login."""

    email: EmailStr
    password: str


class UserOut(BaseModel):
    """A user as returned by the API. Note: no password field at all."""

    # from_attributes=True lets Pydantic read the data straight from an
    # SQLAlchemy object (user.id, user.email, ...) instead of a dict
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    created_at: datetime


class TokenOut(BaseModel):
    """What login returns: the JWT plus the user it belongs to."""

    token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------- transactions


class TransactionCreate(BaseModel):
    """Body of POST /api/transactions and PUT /api/transactions/{id}."""

    type: TransactionType
    # gt=0 -> must be greater than 0; max 2 decimals, max 10 digits in total
    amount: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    category: str = Field(min_length=1, max_length=50)
    date: date
    description: Optional[str] = Field(default=None, max_length=255)

    # field_validator runs extra code on a field. Here we remove spaces from
    # the start/end, so "  Food " is saved as "Food" and "   " is rejected.
    @field_validator("category")
    @classmethod
    def category_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Category cannot be empty")
        return value

    @field_validator("description")
    @classmethod
    def empty_description_becomes_none(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None


class TransactionOut(BaseModel):
    """A transaction as returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    type: TransactionType
    # float in the response so the frontend gets a normal JSON number (12.5)
    # instead of a string ("12.50"), which is how Decimal would be sent
    amount: float
    category: str
    date: date
    description: Optional[str]
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------- summary


class CategoryTotal(BaseModel):
    """How much was spent (or earned) in one category."""

    category: str
    type: TransactionType
    total: float


class SummaryOut(BaseModel):
    """Body returned by GET /api/summary (the dashboard numbers)."""

    total_income: float
    total_expenses: float
    balance: float  # total_income - total_expenses
    transaction_count: int
    by_category: list[CategoryTotal]  # handy for charts on the frontend
