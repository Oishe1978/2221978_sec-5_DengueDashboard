
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select, SQLModel

from app.database import get_session
from app.cases.models import DengueCase

router = APIRouter(prefix="/cases", tags=["cases"])


# Schema for updating patient information
class DengueCaseUpdate(SQLModel):
    patient_name: Optional[str] = None
    age: Optional[int] = None
    district: Optional[str] = None
    hospital_name: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    date: Optional[int] = None
    month: Optional[str] = None
    year: Optional[int] = None


def seed_sample_data(session: Session):
    existing = session.exec(select(DengueCase)).first()

    if not existing:
        sample_cases = [
            DengueCase(
                patient_name="Rahim Ali",
                age=28,
                district="Dhaka",
                hospital_name="DMC",
                severity="High",
                status="Admitted",
                date=5,
                month="November",
                year=2026
            ),
            DengueCase(
                patient_name="Fatema Begum",
                age=35,
                district="Chittagong",
                hospital_name="CMC",
                severity="Medium",
                status="Recovered",
                date=4,
                month="November",
                year=2026
            ),
        ]

        for case in sample_cases:
            session.add(case)

        session.commit()


# READ: Get all dengue cases
@router.get("", response_model=List[DengueCase])
def get_cases(
    district: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    seed_sample_data(session)

    statement = select(DengueCase)

    if district and district.lower() != "all":
        statement = statement.where(DengueCase.district == district)

    return session.exec(statement).all()


# CREATE: Add a new dengue case
@router.post("", response_model=DengueCase)
def create_case(
    case: DengueCase,
    session: Session = Depends(get_session)
):
    session.add(case)
    session.commit()
    session.refresh(case)

    return case


# READ SINGLE: Get one dengue case by ID
@router.get("/{case_id}", response_model=DengueCase)
def get_case(
    case_id: int,
    session: Session = Depends(get_session)
):
    case = session.get(DengueCase, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Dengue case not found"
        )

    return case


# UPDATE: Update an existing dengue case
@router.patch("/{case_id}", response_model=DengueCase)
def update_case(
    case_id: int,
    case_data: DengueCaseUpdate,
    session: Session = Depends(get_session)
):
    case = session.get(DengueCase, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Dengue case not found"
        )

    update_data = case_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(case, key, value)

    session.add(case)
    session.commit()
    session.refresh(case)

    return case


# DELETE: Delete an existing dengue case
@router.delete("/{case_id}")
def delete_case(
    case_id: int,
    session: Session = Depends(get_session)
):
    case = session.get(DengueCase, case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Dengue case not found"
        )

    session.delete(case)
    session.commit()

    return {
        "message": "Dengue case deleted successfully"
    }

