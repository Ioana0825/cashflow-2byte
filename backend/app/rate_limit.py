"""
Login rate limiting: stop people from guessing passwords.

Without a limit, an attacker could try thousands of passwords per minute for
one email ("brute force"). Here we count FAILED logins and, after too many,
answer 429 "Too Many Requests" for a while.

We count failures in two ways:
    - per email + IP address  -> protects one account (5 tries / 15 min)
    - per IP address          -> stops one machine from trying many
                                 different emails (20 tries / 15 min)

A successful login clears the counter for that email + IP.

Note: the counters live in the server's memory, so they reset when the server
restarts and are not shared between several server processes. That is fine
for this project; a big real app would keep them in Redis or the database.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

WINDOW_SECONDS = 15 * 60  # we look at the last 15 minutes
MAX_FAILS_PER_ACCOUNT = 5
MAX_FAILS_PER_IP = 20

# key -> times (in seconds) of the recent failed attempts.
# deque is a list that is fast to remove items from the front.
_failures: dict[str, deque] = defaultdict(deque)

# FastAPI runs normal "def" routes in several threads at the same time, so
# two requests could change _failures at once. The lock lets only one in.
_lock = Lock()


def _keys(request: Request, email: str) -> tuple[str, str]:
    """The two counters a login attempt belongs to."""
    ip = request.client.host if request.client else "unknown"
    return f"account:{ip}:{email.lower()}", f"ip:{ip}"


def _recent(key: str, now: float) -> deque:
    """Drop attempts older than the window and return what is left."""
    attempts = _failures[key]
    while attempts and attempts[0] <= now - WINDOW_SECONDS:
        attempts.popleft()
    return attempts


def check_login_allowed(request: Request, email: str) -> None:
    """Raise 429 if this email/IP failed too many times recently."""
    account_key, ip_key = _keys(request, email)
    now = time.time()
    with _lock:
        account = _recent(account_key, now)
        ip = _recent(ip_key, now)
        blocked = None
        if len(account) >= MAX_FAILS_PER_ACCOUNT:
            blocked = account
        elif len(ip) >= MAX_FAILS_PER_IP:
            blocked = ip
        if blocked is None:
            return
        # The block ends when the oldest counted failure leaves the window
        retry_after = int(blocked[0] + WINDOW_SECONDS - now) + 1

    minutes = max(1, round(retry_after / 60))
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Too many failed login attempts. Try again in about {minutes} minute(s).",
        # Standard header that tells clients how many seconds to wait
        headers={"Retry-After": str(retry_after)},
    )


def record_failed_login(request: Request, email: str) -> None:
    """Remember one failed attempt."""
    now = time.time()
    with _lock:
        for key in _keys(request, email):
            _failures[key].append(now)


def reset_login_failures(request: Request, email: str) -> None:
    """After a successful login, forget the failures for that account."""
    account_key, _ = _keys(request, email)
    with _lock:
        _failures.pop(account_key, None)
