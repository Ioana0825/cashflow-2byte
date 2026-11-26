"""
Authentication routes: register, login, logout and "who am I".

    POST /api/auth/register   create an account          -> 201 {token, user}
    POST /api/auth/login      log in with email+password -> 200 {token, user}
    POST /api/auth/logout     log out                    -> 204
    GET  /api/auth/me         the logged-in user          -> 200 user

Register and login put the token in an httpOnly cookie (that's what the React
app uses) AND return it in the JSON body (handy for Postman and /docs).

LOGOUT: with JWT the server does not keep a list of logged-in users, so
logging out means deleting the cookie. Because JavaScript can't touch an
httpOnly cookie, the frontend has to ask the server to delete it, which is
what /logout does. (The token itself would stay valid until it expires; see
the security notes in the README.)
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.rate_limit import (
    check_login_allowed,
    record_failed_login,
    reset_login_failures,
)
from app.schemas import TokenOut, UserCreate, UserLogin, UserOut
from app.security import (
    DUMMY_PASSWORD_HASH,
    clear_auth_cookie,
    create_access_token,
    get_current_user,
    hash_password,
    set_auth_cookie,
    verify_password,
)

# Every route in this file starts with /api/auth and is grouped under
# "auth" in the /docs page
router = APIRouter(prefix="/api/auth", tags=["auth"])


def login_response(user: User, response: Response) -> TokenOut:
    """Create a token for `user`, put it in the cookie and build the JSON answer."""
    token = create_access_token(user.id)
    set_auth_cookie(response, token)
    return TokenOut(token=token, user=user)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, response: Response, db: Session = Depends(get_db)):
    """Create a new account. The user is logged in right away."""
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

    return login_response(user, response)


@router.post("/login", response_model=TokenOut)
def login(
    data: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)
):
    """Check email + password, then log the user in."""
    # 429 if there were too many failed attempts recently (see rate_limit.py)
    check_login_allowed(request, data.email)

    user = db.query(User).filter(User.email == data.email.lower()).first()

    # Always run ONE bcrypt check, even when the email doesn't exist (against a
    # dummy hash). Otherwise "unknown email" would answer faster than "wrong
    # password", and an attacker could time it to discover registered emails.
    hashed = user.hashed_password if user else DUMMY_PASSWORD_HASH
    password_ok = verify_password(data.password, hashed)

    # Same message whether the email or the password is wrong, so nobody can
    # use this endpoint to find out which emails have an account
    if user is None or not password_ok:
        record_failed_login(request, data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    reset_login_failures(request, data.email)
    return login_response(user, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    """Delete the login cookie. Works even if the user is already logged out."""
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_auth_cookie(response)
    return response


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the logged-in user (the frontend calls this when the page loads)."""
    return current_user
