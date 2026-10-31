from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=60)
    expense_date: date
    note: str | None = Field(default=None, max_length=500)

class ExpenseOut(ExpenseCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SummaryOut(BaseModel):
    total: float
    count: int
    monthly_total: float
    category_totals: dict[str, float]
