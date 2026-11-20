from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="Dengue Surveillance & Monitoring API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS Setup so Frontend can communicate smoothly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serverless-safe persistent in-memory store with initial seed data
reports_db = [
    {
        "id": 1,
        "patient_name": "Rahim Ali",
        "age": 28,
        "district": "Dhaka",
        "hospital_name": "Dhaka Medical College",
        "severity": "High",
        "status": "Admitted"
    },
    {
        "id": 2,
        "patient_name": "Fatema Begum",
        "age": 35,
        "district": "Chittagong",
        "hospital_name": "Chittagong Medical College",
        "severity": "Medium",
        "status": "Recovered"
    }
]

class ReportCreate(BaseModel):
    patient_name: str
    age: int
    district: str
    hospital_name: str
    severity: str
    status: str

class ReportUpdate(BaseModel):
    patient_name: Optional[str] = None
    age: Optional[int] = None
    district: Optional[str] = None
    hospital_name: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None

@app.get("/api")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Dengue Dashboard API is running"}

# 1. READ LIST (Supports both /api/v1/reports and /api/cases)
@app.get("/api/v1/reports")
@app.get("/api/cases")
def get_reports(district: Optional[str] = None):
    if district and district != "All":
        return [r for r in reports_db if r["district"].lower() == district.lower()]
    return reports_db

# 2. READ SINGLE
@app.get("/api/v1/reports/{report_id}")
@app.get("/api/cases/{report_id}")
def get_single_report(report_id: int):
    for report in reports_db:
        if report["id"] == report_id:
            return report
    raise HTTPException(status_code=404, detail="Report not found")

# 3. CREATE (POST)
@app.post("/api/v1/reports", status_code=201)
@app.post("/api/cases", status_code=201)
def create_report(payload: ReportCreate):
    new_id = max([r["id"] for r in reports_db], default=0) + 1
    new_report = {
        "id": new_id,
        "patient_name": payload.patient_name,
        "age": payload.age,
        "district": payload.district,
        "hospital_name": payload.hospital_name,
        "severity": payload.severity,
        "status": payload.status
    }
    reports_db.append(new_report)
    return new_report

# 4. UPDATE (PATCH & PUT)
@app.patch("/api/v1/reports/{report_id}")
@app.put("/api/v1/reports/{report_id}")
@app.patch("/api/cases/{report_id}")
@app.put("/api/cases/{report_id}")
def update_report(report_id: int, payload: ReportUpdate):
    for report in reports_db:
        if report["id"] == report_id:
            update_data = payload.model_dump(exclude_unset=True)
            report.update(update_data)
            return report
    raise HTTPException(status_code=404, detail="Report not found")

# 5. DELETE
@app.delete("/api/v1/reports/{report_id}")
@app.delete("/api/cases/{report_id}")
def delete_report(report_id: int):
    for index, report in enumerate(reports_db):
        if report["id"] == report_id:
            reports_db.pop(index)
            return {"message": f"Report #{report_id} deleted successfully"}
    raise HTTPException(status_code=404, detail="Report not found")
