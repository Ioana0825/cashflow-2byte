"""
Entry point of the CashFlow API.

Run it from the backend/ folder with:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs to see and try every endpoint.
"""

from fastapi import FastAPI
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # from config.py / .env
    # We send the JWT in the Authorization header, not in cookies, so we
    # don't need cookies ("credentials") to be shared
    allow_credentials=False,
    allow_methods=["*"],  # GET, POST, PUT, DELETE, ...
    allow_headers=["*"],  # including Authorization and Content-Type
)

# Plug in the groups of routes defined in app/routers/
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(summary.router)


@app.get("/api/health")
def health():
    """Simple check that the server is running."""
    return {"status": "ok"}
