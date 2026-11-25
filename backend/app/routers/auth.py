"""
Authentication routes: register, login and "who am I".

    POST /api/auth/register   create an account          -> 201 {token, user}
    POST /api/auth/login      log in with email+password -> 200 {token, user}
    GET  /api/auth/me         the logged-in user          -> 200 user

What about LOGOUT? With JWT the server does not keep a list of logged-in
users, so there is nothing to delete on the server. The frontend logs out by
simply deleting the token it saved (e.g. from localStorage). The token also
expires by itself after JWT_EXPIRE_MINUTES.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import TokenOut, UserCreate, UserLogin, UserOut
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

# Every route in this file starts with /api/auth and is grouped under
# "auth" in the /docs page
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    """Create a new account. Returns a token too, so the user is logged in right away."""
    # Save emails in lowercase so "Ana@Mail.com" and "ana@mail.com" are the same account
    email = data.email.lower()

    # 409 Conflict = the request is fine, but it clashes with existing data
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(email=email, hashed_password=hash_password(data.password))
    db.add(user)  # prepare the INSERT
    db.commit()  # actually save it in PostgreSQL
    db.refresh(user)  # reload it so we get the new id and created_at

    return TokenOut(token=create_access_token(user.id), user=user)


@router.post("/login", response_model=TokenOut)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Check email + password and return a JWT."""
    user = db.query(User).filter(User.email == data.email.lower()).first()

    # Same message whether the email or the password is wrong, so nobody can
    # use this endpoint to find out which emails have an account
    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    return TokenOut(token=create_access_token(user.id), user=user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the user the token belongs to (the frontend uses this on page refresh)."""
    return current_user
