CashFlow

A simple budgeting web app where users can track their income and expenses.

Features

- Register, log in and log out
- Add, edit and delete transactions (income or expense)
- See total income, total expenses and current balance on a dashboard
- View transaction history

Technologies

- **Frontend:** React (Vite)
- **Backend:** Python + FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Authentication:** JWT + bcrypt

Project Structure

```
cashflow-2byte/
├── frontend/   # React app
└── backend/    # FastAPI REST API
    ├── requirements.txt
    ├── .env.example        # copy to .env and fill in
    └── app/
        ├── main.py         # creates the app, CORS, plugs in the routers
        ├── config.py       # settings read from .env
        ├── database.py     # connection to PostgreSQL
        ├── models.py       # database tables (User, Transaction)
        ├── schemas.py      # JSON shapes + input validation (Pydantic)
        ├── security.py     # bcrypt hashing, JWT, current user
        ├── errors.py       # one error format for the whole API
        └── routers/
            ├── auth.py          # /api/auth/...
            ├── transactions.py  # /api/transactions/...
            └── summary.py       # /api/summary/...
```

Running the backend

1. Create a PostgreSQL database named `cashflow`.
2. In `backend/`, copy `.env.example` to `.env` and fill in your database password and a random `JWT_SECRET`.
3. Install and start:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload
```

The tables are created automatically on startup. Open http://localhost:8000/docs to try every endpoint (use the **Authorize** button with the token you get from login).

API endpoints

All routes except register and login need the header `Authorization: Bearer <token>`.

| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/health | Check that the server runs |
| POST | /api/auth/register | Create an account, returns `{token, user}` (201) |
| POST | /api/auth/login | Log in, returns `{token, user}` |
| GET | /api/auth/me | The logged-in user |
| GET | /api/transactions | My transactions, newest first. Optional filters: `type`, `category`, `from`, `to`, `sort=newest/oldest` |
| GET | /api/transactions/{id} | One transaction |
| POST | /api/transactions | Add a transaction (201) |
| PUT | /api/transactions/{id} | Edit a transaction |
| DELETE | /api/transactions/{id} | Delete a transaction (204) |
| GET | /api/summary | Total income, total expenses, balance, totals per category. Optional `month=YYYY-MM` |
| GET | /api/summary/monthly | Income and expenses per month (for charts) |

A transaction looks like:

```json
{ "type": "expense", "amount": 45.5, "category": "Food", "date": "2026-11-20", "description": "Groceries" }
```

Errors always look like `{ "error": "message", "field": "amount" }`, with status 400 (invalid input), 401 (not logged in), 404 (not found or not yours), 409 (email already registered) or 500.
