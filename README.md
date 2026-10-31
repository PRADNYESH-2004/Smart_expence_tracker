# Smart Expense Tracker

A full-stack expense management application built with React, FastAPI, PostgreSQL, SQLAlchemy and JWT authentication.

## Features
- User registration and login with hashed passwords and JWT access tokens
- Create, read, update and delete personal expenses
- Expense categories, date, amount and optional notes
- Search expenses by title/note and filter by category
- Dashboard with total spending, current-month spending and transaction count
- Responsive layout for desktop and mobile
- Each user can access only their own expenses

## Tech stack
**Frontend:** React, Vite, CSS, Lucide icons  
**Backend:** Python, FastAPI, SQLAlchemy, Pydantic  
**Database:** PostgreSQL  
**Security:** JWT, bcrypt password hashing

## Run locally

### 1. Requirements
Install Python 3.10+ and Node.js 18+. Install PostgreSQL or use the included Docker Compose setup.

### 2. Start PostgreSQL (Docker)
From the project root:
```bash
docker compose up -d db
```
This starts PostgreSQL on port 5432 with database `expense_tracker`, username `postgres`, password `postgres`.

### 3. Start the backend
Open a terminal:
```bash
cd backend
python -m venv venv
```
Windows PowerShell:
```powershell
.\venv\Scripts\Activate.ps1
```
macOS/Linux:
```bash
source venv/bin/activate
```
Install packages and configure environment:
```bash
pip install -r requirements.txt
```
Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` if needed. Then run:
```bash
uvicorn app.main:app --reload
```
API: http://localhost:8000  
Interactive API docs: http://localhost:8000/docs

### 4. Start the frontend
Open another terminal:
```bash
cd frontend
npm install
```
Copy `.env.example` to `.env` (default API URL is localhost:8000), then:
```bash
npm run dev
```
Open the Vite URL shown in the terminal (normally http://localhost:5173).

## Deploy

### Database — Neon
1. Create a PostgreSQL project at https://neon.tech.
2. Copy its connection string. Use the pooled or direct connection string as appropriate.
3. Ensure it begins with `postgresql://` (the backend also converts `postgres://`).

### Backend — Render
1. Push this repository to GitHub.
2. In Render, create **New → Web Service** and connect the repository.
3. Set **Root Directory** to `backend`.
4. Choose **Docker** as the runtime (uses `backend/Dockerfile`).
5. Add environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `SECRET_KEY` = a long random secret (do not use the example value)
   - `FRONTEND_URL` = your deployed Vercel URL, e.g. `https://your-app.vercel.app`
6. Deploy. Test `https://YOUR-RENDER-SERVICE.onrender.com/health`.

### Frontend — Vercel
1. In Vercel, import the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Framework preset: Vite.
4. Add environment variable `VITE_API_URL` = your Render backend URL (no trailing slash).
5. Deploy. Add the final Vercel URL to the backend's `FRONTEND_URL` environment variable and redeploy the backend if needed.

## API routes

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Sign in (OAuth2 form: username=email) |
| GET | `/auth/me` | Current user |
| GET | `/expenses` | List expenses; optional `category` and `search` |
| POST | `/expenses` | Create expense |
| PUT | `/expenses/{id}` | Update expense |
| DELETE | `/expenses/{id}` | Delete expense |
| GET | `/expenses/summary` | Dashboard totals |

## Security notes
- Passwords are stored as bcrypt hashes, never as plain text.
- Expense routes require a valid JWT bearer token.
- User ID is taken from the verified token; users cannot request another user's expense records.
- Set a strong, unique `SECRET_KEY` in production.
- For a production deployment, add database migrations (Alembic), rate limiting, HTTPS-only cookie/token strategy, and automated tests before handling real financial data.

## Suggested GitHub description
A responsive full-stack expense tracker with JWT authentication, REST APIs, PostgreSQL persistence, category filters, and spending summaries.
