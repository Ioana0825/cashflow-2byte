"""
Settings of the app, read from the backend/.env file.

Secrets (database password, JWT secret) live in .env, which is NOT committed
to Git. .env.example shows which values are needed, without the real secrets.
"""

import os

from dotenv import load_dotenv

# Reads backend/.env and puts its lines into os.environ
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Secret key used to sign JWT tokens. Anyone who knows it could create valid
# tokens, so it must be long, random and private.
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# ---------------------------------------------------------------- login cookie
# After login the token is ALSO saved in a cookie that JavaScript cannot read
# ("httpOnly"). The React app uses that cookie instead of keeping the token in
# localStorage, so even if an attacker managed to run JavaScript in our page
# (an XSS attack), they could not steal the token. See security.py.
AUTH_COOKIE_NAME = "cashflow_token"

# Secure=True means "only send this cookie over HTTPS". Keep it false while
# developing on http://localhost and set COOKIE_SECURE=true on a real server.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# Websites allowed to call this API from the browser (see CORS in main.py).
# Comma-separated; the default is the Vite dev server of our React frontend.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
