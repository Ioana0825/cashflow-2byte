CashFlow

A simple budgeting web app where users can track their income and expenses.

Features

- Register, log in and log out
- Add, edit and delete transactions (income or expense)
- See total income, total expenses and current balance on a dashboard
- View transaction history, newest first and grouped by month
- Works on desktop, tablet and phone

Technologies

- **Frontend:** React 19 + Vite, React Router
- **Backend:** Python + FastAPI, SQLAlchemy
- **Database:** PostgreSQL
- **Authentication:** JWT (PyJWT) in an httpOnly cookie + bcrypt

Project Structure

```
cashflow-2byte/
├── frontend/                 # React app
│   ├── vite.config.js        # dev server + proxy that forwards /api to the backend
│   └── src/
│       ├── main.jsx          # starting point, loads fonts and global CSS
│       ├── App.jsx           # the routes (which page for which URL)
│       ├── index.css         # design system: colours, fonts, buttons, inputs
│       ├── api/              # every call to the backend (client.js, auth.js, transactions.js)
│       ├── context/          # AuthContext (who is logged in), ToastContext (pop-up messages)
│       ├── components/       # layout, forms, list, cards, modal, icons, logo
│       ├── pages/            # Login, Register, Dashboard, Transactions
│       └── utils/            # validation, formatting (money, dates), categories
└── backend/                  # FastAPI REST API
    ├── requirements.txt
    ├── .env.example          # copy to .env and fill in
    └── app/
        ├── main.py           # creates the app, CORS, security headers, plugs in the routers
        ├── config.py         # settings read from .env
        ├── database.py       # connection to PostgreSQL
        ├── models.py         # database tables (User, Transaction)
        ├── schemas.py        # JSON shapes + input validation (Pydantic)
        ├── security.py       # bcrypt hashing, JWT, login cookie, current user
        ├── rate_limit.py     # blocks password guessing on login
        ├── errors.py         # one error format for the whole API
        └── routers/
            ├── auth.py          # /api/auth/...
            ├── transactions.py  # /api/transactions/...
            └── summary.py       # /api/summary/...
```

Running the app

You need two terminals: one for the backend, one for the frontend.

**1. Backend** (http://localhost:8000)

1. Create a PostgreSQL database named `cashflow`.
2. In `backend/`, copy `.env.example` to `.env` and fill in your database password and a random `JWT_SECRET` (at least 32 characters).
3. Install and start:

```
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --reload
```

The tables are created automatically on startup. Open http://localhost:8000/docs to try every endpoint (use the **Authorize** button with the token you get from login).

**2. Frontend** (http://localhost:5173)

Needs Node.js 20 or newer.

```
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server forwards every `/api/...` request to the backend on port 8000, so the browser only ever talks to one address.

API endpoints

The React app is logged in through an httpOnly cookie that the server sets on register/login. For Postman or `/docs` you can instead send the header `Authorization: Bearer <token>` with the token from the login response. All routes except health, register, login and logout need one of the two.

| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/health | Check that the server runs |
| POST | /api/auth/register | Create an account, returns `{token, user}` (201) and sets the login cookie |
| POST | /api/auth/login | Log in, returns `{token, user}` and sets the login cookie |
| POST | /api/auth/logout | Delete the login cookie (204) |
| GET | /api/auth/me | The logged-in user |
| GET | /api/transactions | My transactions, newest first. Optional filters: `type`, `category`, `from`, `to`, `sort=newest/oldest` |
| GET | /api/transactions/{id} | One transaction |
| POST | /api/transactions | Add a transaction (201) |
| PUT | /api/transactions/{id} | Edit a transaction |
| DELETE | /api/transactions/{id} | Delete a transaction (204) |
| GET | /api/summary | Total income, total expenses, balance, totals per category. Optional `month=YYYY-MM` |
| GET | /api/summary/monthly | Income and expenses per month |

A transaction looks like:

```json
{ "type": "expense", "amount": 45.5, "category": "Food", "date": "2026-11-20", "description": "Groceries" }
```

Errors always look like `{ "error": "message", "field": "amount" }`, with status 400 (invalid input), 401 (not logged in), 404 (not found or not yours), 409 (email already registered), 429 (too many failed logins) or 500.

Security

What the app does to protect users:

- **Passwords** are hashed with bcrypt and never stored or returned. At least 8 characters with a letter and a number.
- **Login token in an httpOnly cookie**, not in localStorage: JavaScript can't read it, so an XSS bug could not steal it. The cookie is `SameSite=Strict` (blocks CSRF) and limited to `/api`. Set `COOKIE_SECURE=true` when the app runs on HTTPS.
- **Every user only sees their own data**: each query filters on the logged-in user, and someone else's transaction answers 404, as if it didn't exist.
- **Brute-force protection**: after 5 wrong passwords for one account (or 20 from one IP) within 15 minutes, login answers 429.
- **No user enumeration on login**: the same message and the same timing whether the email exists or not.
- **Validation on both sides**: the React forms check input for quick feedback, and the backend checks everything again (Pydantic), because the frontend can be bypassed.
- **Safe errors**: crashes return a generic message; details only go to the server log.
- **XSS**: React escapes all text it displays, and the app never inserts raw HTML.
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Cache-Control: no-store` on API answers.
- **Secrets** live in `backend/.env`, which is not committed.

Known limits (fine for a school project, to fix before a real launch):

- A token stays valid until it expires (60 minutes) even after logout; logout only deletes the cookie.
- Login attempt counters are kept in memory, so they reset when the server restarts.
- `/docs` is public; turn it off on a public server.
- On a real server, serve everything over HTTPS and add a Content-Security-Policy header.
