"""
Entry point of the CashFlow API.

Run it from the backend/ folder with:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs to see and try every endpoint.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (importing registers the tables on Base)
from app.config import CORS_ORIGINS
from app.database import Base, engine
from app.errors import register_error_handlers
from app.routers import auth, summary, transactions

# Create the tables (users, transactions) if they don't exist yet.
# Note: this only CREATES missing tables; it does not change existing ones.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CashFlow API")

# All errors are returned as {"error": "...", "field": ...} (see errors.py)
register_error_handlers(app)

# CORS (Cross-Origin Resource Sharing).
# The React app runs on http://localhost:5173 and the API on
# http://localhost:8000. For the browser those are two different "origins",
# and by default it BLOCKS JavaScript from reading responses of another
# origin. This middleware adds headers that tell the browser:
# "requests from these frontend addresses are allowed".
#
# Note: in development the React app reaches the API through the Vite proxy
# (see frontend/vite.config.js), so for the browser it's the SAME origin and
# CORS isn't even used. This setup matters if the frontend calls the API
# directly from another address.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # from config.py / .env, never "*"
    # Cross-origin requests may NOT carry our login cookie. The React app is
    # served from the same origin as the API, so it doesn't need this.
    allow_credentials=False,
    # Only what the API really uses (smaller list = smaller attack surface)
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add a few HTTP headers that tell the browser to be extra careful.

    A "middleware" is code that runs around EVERY request: here we let the
    route produce its response, then add headers to it.
    """
    response = await call_next(request)
    # Don't guess the file type: a JSON answer is never run as a script/page
    response.headers["X-Content-Type-Options"] = "nosniff"
    # No other website may show our pages inside an <iframe> (clickjacking)
    response.headers["X-Frame-Options"] = "DENY"
    # Don't send our URLs to other websites in the Referer header
    response.headers["Referrer-Policy"] = "no-referrer"
    # Financial data should not be stored in the browser's or a proxy's cache
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response

# Plug in the groups of routes defined in app/routers/
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(summary.router)


@app.get("/api/health")
def health():
    """Simple check that the server is running."""
    return {"status": "ok"}
