"""
Entry point of the CashFlow API.

Run it from the backend/ folder with:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs to see and try every endpoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (importing registers the tables on Base)
from app.database import Base, engine
from app.errors import register_error_handlers
from app.routers import auth, transactions

# Create the tables (users, transactions) if they don't exist yet.
# Note: this only CREATES missing tables; it does not change existing ones.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CashFlow API")

# All errors are returned as {"error": "...", "field": ...} (see errors.py)
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Plug in the groups of routes defined in app/routers/
app.include_router(auth.router)
app.include_router(transactions.router)


@app.get("/api/health")
def health():
    """Simple check that the server is running."""
    return {"status": "ok"}
