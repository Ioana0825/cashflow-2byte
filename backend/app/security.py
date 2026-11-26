"""
Security helpers: password hashing, JWT tokens and "who is logged in?".

1) PASSWORD HASHING (bcrypt)
   We never save the real password. bcrypt turns it into a "hash", a scrambled
   string that cannot be turned back into the password. At login we hash the
   password the user typed again and compare. bcrypt also adds a random "salt",
   so two users with the same password still get different hashes.

2) JWT (JSON Web Token)
   After a successful login we give the user a token: a signed string that
   says "this is user 5, valid until 18:30". Only the server knows JWT_SECRET,
   so nobody can forge or edit a token without the signature breaking. This
   is what makes the API "stateless": the server does not need to remember
   who is logged in.

   The token can reach us in two ways:
     a) an httpOnly COOKIE  -> used by our React app (the browser sends it
        automatically; JavaScript can't read it, so XSS can't steal it)
     b) the header "Authorization: Bearer <token>" -> handy for Postman and
        the /docs page

3) get_current_user
   A FastAPI "dependency". Any route that adds
       current_user: User = Depends(get_current_user)
   automatically requires a valid token and receives the logged-in user.
   This is the "auth middleware" from the architecture diagram.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import (
    AUTH_COOKIE_NAME,
    COOKIE_SECURE,
    JWT_ALGORITHM,
    JWT_EXPIRE_MINUTES,
    JWT_SECRET,
)
from app.database import get_db
from app.models import User

# Stop right away with a clear message instead of failing later in a confusing way
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is missing. Add it to backend/.env (see .env.example).")

# A short secret can be guessed by trying many values ("brute force"), and
# then anyone could create valid tokens. 32+ random characters is a safe minimum.
if len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET is too short. Generate one with: "
        'python -c "import secrets; print(secrets.token_hex(32))"'
    )


# ---------------------------------------------------------------- passwords

# bcrypt only looks at the first 72 BYTES of a password (not characters:
# letters like "ă" or emojis take 2-4 bytes each). bcrypt 5 even raises an
# error for longer input, so we check this ourselves.
BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    """Turn a plain password into a bcrypt hash we can store in the database."""
    # bcrypt works with bytes, so we encode the text to bytes and back
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check whether a typed password matches the stored hash."""
    password_bytes = plain_password.encode("utf-8")
    # Too long to ever have been accepted at register -> can't be right
    if len(password_bytes) > BCRYPT_MAX_BYTES:
        return False
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


# A real bcrypt hash of a random password, used by login when the email does
# not exist. Checking a password takes ~0.2 s on purpose; if we skipped that
# work for unknown emails, an attacker could measure the response time and
# find out which emails have an account. See routers/auth.py.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-password-just-for-timing")


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
        # algorithms=[...] is important: it stops an attacker from sending a
        # token that claims a different (e.g. "none") algorithm
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        return None


# ---------------------------------------------------------------- login cookie


def set_auth_cookie(response: Response, token: str) -> None:
    """Save the token in the browser as an httpOnly cookie."""
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=token,
        # The browser deletes the cookie when the token expires anyway
        max_age=JWT_EXPIRE_MINUTES * 60,
        # httponly -> JavaScript (document.cookie) can NOT read it. This is the
        # whole point: an XSS bug could not steal the token.
        httponly=True,
        # samesite="strict" -> the browser only sends the cookie when the
        # request comes from our own site. That blocks CSRF attacks, where an
        # evil website makes your browser call our API with your cookie.
        samesite="strict",
        # secure -> only over HTTPS (switch on in production, see config.py)
        secure=COOKIE_SECURE,
        # Only needed by the API routes, so don't send it anywhere else
        path="/api",
    )


def clear_auth_cookie(response: Response) -> None:
    """Delete the login cookie (used by logout). Same options as when it was set."""
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/api",
        httponly=True,
        samesite="strict",
        secure=COOKIE_SECURE,
    )


# ---------------------------------------------------------------- current user

# HTTPBearer reads the "Authorization: Bearer <token>" header for us.
# auto_error=False means: if the header is missing, give us None so we can
# try the cookie instead. It also adds the "Authorize" button in /docs.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that returns the logged-in User, or answers 401 if there is none."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1) Authorization header (Postman, /docs), otherwise 2) the cookie (React app)
    if credentials is not None:
        token = credentials.credentials
    else:
        token = request.cookies.get(AUTH_COOKIE_NAME)

    if not token:
        raise unauthorized

    user_id = decode_access_token(token)
    if user_id is None:
        raise unauthorized

    # The token could belong to a user that was deleted since it was issued
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized

    return user
