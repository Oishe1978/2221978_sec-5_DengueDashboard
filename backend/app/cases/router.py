from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from app.database import get_session
from app.cases.models import DengueCase

router = APIRouter(prefix="/cases", tags=["cases"])

def seed_sample_data(session: Session):
    existing = session.exec(select(DengueCase)).first()
    if not existing:
        sample_cases = [
            DengueCase(patient_name="Rahim Ali", age=28, district="Dhaka", hospital_name="DMC", severity="High", status="Admitted", date=5, month="November", year=2026),
            DengueCase(patient_name="Fatema Begum", age=35, district="Chittagong", hospital_name="CMC", severity="Medium", status="Recovered", date=4, month="November", year=2026),
        ]
        for case in sample_cases:
            session.add(case)
        session.commit()

@router.get("", response_model=List[DengueCase])
def get_cases(district: Optional[str] = Query(None), session: Session = Depends(get_session)):
    seed_sample_data(session)
    statement = select(DengueCase)
    if district and district.lower() != "all":
        statement = statement.where(DengueCase.district == district)
    return session.exec(statement).all()

@router.post("", response_model=DengueCase)
def create_case(case: DengueCase, session: Session = Depends(get_session)):
    session.add(case)
    session.commit()
    session.refresh(case)
    return case




