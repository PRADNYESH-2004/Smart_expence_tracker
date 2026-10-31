import os
from datetime import date
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from .database import Base, engine, get_db
from . import models, schemas
from .security import hash_password, verify_password, create_access_token, read_token

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Smart Expense Tracker API", version="1.0.0")

origins = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins] + ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    try:
        user_id = read_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired login. Please sign in again.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.get("/")
def home():
    return {"message": "Smart Expense Tracker API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/auth/register", response_model=schemas.Token, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = models.User(name=payload.name.strip(), email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(str(user.id)), "user": user}

@app.post("/auth/login", response_model=schemas.Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username.lower()).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": create_access_token(str(user.id)), "user": user}

@app.get("/auth/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(current_user)):
    return user

@app.get("/expenses", response_model=list[schemas.ExpenseOut])
def list_expenses(
    user: models.User = Depends(current_user),
    db: Session = Depends(get_db),
    category: str | None = None,
    search: str | None = None,
):
    query = db.query(models.Expense).filter(models.Expense.user_id == user.id)
    if category and category != "All":
        query = query.filter(models.Expense.category == category)
    if search:
        query = query.filter(models.Expense.title.ilike(f"%{search}%"))
    return query.order_by(models.Expense.expense_date.desc(), models.Expense.id.desc()).all()

@app.post("/expenses", response_model=schemas.ExpenseOut, status_code=201)
def create_expense(payload: schemas.ExpenseCreate, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    expense = models.Expense(**payload.model_dump(), user_id=user.id)
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense

@app.put("/expenses/{expense_id}", response_model=schemas.ExpenseOut)
def update_expense(expense_id: int, payload: schemas.ExpenseCreate, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_id == user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for key, value in payload.model_dump().items():
        setattr(expense, key, value)
    db.commit()
    db.refresh(expense)
    return expense

@app.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_id == user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return None

@app.get("/expenses/summary", response_model=schemas.SummaryOut)
def expense_summary(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    today = date.today()
    base = db.query(models.Expense).filter(models.Expense.user_id == user.id)
    total = base.with_entities(func.coalesce(func.sum(models.Expense.amount), 0)).scalar()
    count = base.with_entities(func.count(models.Expense.id)).scalar()
    monthly = base.filter(
        extract("month", models.Expense.expense_date) == today.month,
        extract("year", models.Expense.expense_date) == today.year
    ).with_entities(func.coalesce(func.sum(models.Expense.amount), 0)).scalar()
    rows = base.with_entities(models.Expense.category, func.sum(models.Expense.amount)).group_by(models.Expense.category).all()
    return {"total": float(total), "count": count, "monthly_total": float(monthly), "category_totals": {name: float(value) for name, value in rows}}
