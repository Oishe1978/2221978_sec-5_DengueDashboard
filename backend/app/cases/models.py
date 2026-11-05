from typing import Optional
from sqlmodel import Field, SQLModel

class DengueCase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    patient_name: str
    age: int
    district: str
    hospital_name: str
    severity: str
    status: str
    date: Optional[int] = Field(default=5)
    month: Optional[str] = Field(default="November")
    year: Optional[int] = Field(default=2026)
