"""
Security helpers: password hashing, JWT tokens and "who is logged in?".

1) PASSWORD HASHING (bcrypt)
   We never save the real password. bcrypt turns it into a "hash", a scrambled
   string that cannot be turned back into the password. At login we hash the
   password the user typed again and compare. bcrypt also adds a random "salt",
   so two users with the same password still get different hashes.

2) JWT (JSON Web Token)
   After a successful login we give the user a token: a signed string that
   says "this is user 5, valid until 18:30". The frontend sends it back on
   every request in the header:
       Authorization: Bearer <token>
   Only the server knows JWT_SECRET, so nobody can forge or edit a token
   without the signature breaking. This is what makes the API "stateless":
   the server does not need to remember who is logged in.

3) get_current_user
   A FastAPI "dependency". Any route that adds
       current_user: User = Depends(get_current_user)
   automatically requires a valid token and receives the logged-in user.
   This is the "auth middleware" from the architecture diagram.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET
from app.database import get_db
from app.models import User

# Stop right away with a clear message instead of failing later in a confusing way
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is missing. Add it to backend/.env (see .env.example).")


# ---------------------------------------------------------------- passwords


def hash_password(password: str) -> str:
    """Turn a plain password into a bcrypt hash we can store in the database."""
    # bcrypt works with bytes, so we encode the text to bytes and back
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check whether a typed password matches the stored hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


# ---------------------------------------------------------------- JWT tokens


def create_access_token(user_id: int) -> str:
    """Create a signed JWT for this user, valid for JWT_EXPIRE_MINUTES."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),  # "subject": who the token is about (must be a string)
        "exp": expire,  # "expiry": jose rejects the token after this moment
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Return the user id inside a token, or None if the token is invalid/expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


# ---------------------------------------------------------------- current user

# HTTPBearer reads the "Authorization: Bearer <token>" header for us.
# auto_error=False means: if the header is missing, give us None so we can
# return our own 401 message. It also adds the "Authorize" button in /docs.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that returns the logged-in User, or answers 401 if there is none."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise unauthorized

    # The token could belong to a user that was deleted since it was issued
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized

    return user
