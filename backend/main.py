from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional
import uuid

app = FastAPI(
    title="Dengue Surveillance & Monitoring API",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-Memory Database (Serverless Safe for Vercel) ---
users_db = {
    "admin1@dengue.gov.bd": {
        "id": 1,
        "name": "System Admin",
        "email": "admin1@dengue.gov.bd",
        "password": "Admin@2026#1",
        "role": "admin",
        "is_banned": False
    },
    "doctor.rahim@dmc.gov.bd": {
        "id": 2,
        "name": "Dr. Rahim",
        "email": "doctor.rahim@dmc.gov.bd",
        "password": "User@2026#1",
        "role": "user",
        "is_banned": False
    }
}

active_tokens = {}  # token -> email

reports_db = [
    {
        "id": 1,
        "patient_name": "Rahim Ali",
        "age": 28,
        "district": "Dhaka",
        "hospital_name": "Dhaka Medical College",
        "severity": "High",
        "status": "Admitted",
        "owner_email": "doctor.rahim@dmc.gov.bd"
    },
    {
        "id": 2,
        "patient_name": "Fatema Begum",
        "age": 35,
        "district": "Chittagong",
        "hospital_name": "Chittagong Medical College",
        "severity": "Medium",
        "status": "Recovered",
        "owner_email": "admin1@dengue.gov.bd"
    }
]

audit_logs = [
    {"id": 1, "actor": "system", "action": "SYSTEM_INIT", "details": "Initial seed data loaded"}
]

# --- Schemas ---
class SignupSchema(BaseModel):
    name: str
    email: str
    password: str

class LoginSchema(BaseModel):
    email: str
    password: str

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

# --- Helper ---
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    token = authorization.split(" ")[1]
    email = active_tokens.get(token)
    if not email or email not in users_db:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user = users_db[email]
    if user["is_banned"]:
        raise HTTPException(status_code=403, detail="Your account has been banned by an Admin.")
    return user

@app.get("/api")
@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "Dengue Surveillance API"}

# --- Auth Endpoints ---
@app.post("/api/v1/auth/signup", status_code=201)
def signup(payload: SignupSchema):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    if payload.email in users_db:
        raise HTTPException(status_code=400, detail="Email already registered.")
    new_id = len(users_db) + 1
    users_db[payload.email] = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "password": payload.password,
        "role": "user",
        "is_banned": False
    }
    audit_logs.append({"id": len(audit_logs) + 1, "actor": payload.email, "action": "USER_SIGNUP", "details": "New user registered"})
    return {"message": "Signup successful! Please log in."}

@app.post("/api/v1/auth/login")
def login(payload: LoginSchema):
    user = users_db.get(payload.email)
    if not user or user["password"] != payload.password:
        audit_logs.append({"id": len(audit_logs) + 1, "actor": payload.email, "action": "FAILED_LOGIN", "details": "Invalid credentials"})
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["is_banned"]:
        raise HTTPException(status_code=403, detail="Account is banned.")
    token = f"jwt-{uuid.uuid4().hex}"
    active_tokens[token] = user["email"]
    audit_logs.append({"id": len(audit_logs) + 1, "actor": user["email"], "action": "USER_LOGIN", "details": "Logged in successfully"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}
    }

@app.post("/api/v1/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        active_tokens.pop(token, None)
    return {"message": "Logged out successfully"}

# --- Reports CRUD Endpoints ---
@app.get("/api/v1/reports")
@app.get("/api/cases")
def list_reports(district: Optional[str] = None):
    if district and district != "All":
        return [r for r in reports_db if r["district"].lower() == district.lower()]
    return reports_db

@app.get("/api/v1/reports/{report_id}")
@app.get("/api/cases/{report_id}")
def get_report(report_id: int):
    for r in reports_db:
        if r["id"] == report_id:
            return r
    raise HTTPException(status_code=404, detail="Report not found")

@app.post("/api/v1/reports", status_code=201)
@app.post("/api/cases", status_code=201)
def create_report(payload: ReportCreate, authorization: Optional[str] = Header(None)):
    owner = "guest@dengue.gov.bd"
    if authorization and authorization.startswith("Bearer "):
        user = get_current_user(authorization)
        owner = user["email"]
    new_id = max([r["id"] for r in reports_db], default=0) + 1
    new_report = {
        "id": new_id,
        "patient_name": payload.patient_name,
        "age": payload.age,
        "district": payload.district,
        "hospital_name": payload.hospital_name,
        "severity": payload.severity,
        "status": payload.status,
        "owner_email": owner
    }
    reports_db.append(new_report)
    audit_logs.append({"id": len(audit_logs) + 1, "actor": owner, "action": "CREATE_REPORT", "details": f"Created report #{new_id}"})
    return new_report

@app.patch("/api/v1/reports/{report_id}")
@app.put("/api/v1/reports/{report_id}")
@app.patch("/api/cases/{report_id}")
def update_report(report_id: int, payload: ReportUpdate, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    for r in reports_db:
        if r["id"] == report_id:
            if user["role"] != "admin" and r["owner_email"] != user["email"]:
                raise HTTPException(status_code=403, detail="RBAC Denied: You can only edit your own reports.")
            r.update(payload.model_dump(exclude_unset=True))
            audit_logs.append({"id": len(audit_logs) + 1, "actor": user["email"], "action": "UPDATE_REPORT", "details": f"Updated report #{report_id}"})
            return r
    raise HTTPException(status_code=404, detail="Report not found")

@app.delete("/api/v1/reports/{report_id}")
@app.delete("/api/cases/{report_id}")
def delete_report(report_id: int, authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    for idx, r in enumerate(reports_db):
        if r["id"] == report_id:
            if user["role"] != "admin" and r["owner_email"] != user["email"]:
                raise HTTPException(status_code=403, detail="RBAC Denied: You cannot delete another user's report.")
            reports_db.pop(idx)
            audit_logs.append({"id": len(audit_logs) + 1, "actor": user["email"], "action": "DELETE_REPORT", "details": f"Deleted report #{report_id}"})
            return {"message": f"Report #{report_id} deleted"}
    raise HTTPException(status_code=404, detail="Report not found")

# --- Admin Endpoints ---
@app.get("/api/v1/admin/users")
def admin_list_users(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return list(users_db.values())

@app.post("/api/v1/admin/users/{email}/toggle-ban")
def admin_toggle_ban(email: str, authorization: Optional[str] = Header(None)):
    admin = get_current_user(authorization)
    if admin["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    if email not in users_db:
        raise HTTPException(status_code=404, detail="User not found.")
    if users_db[email]["role"] == "admin":
        raise HTTPException(status_code=403, detail="Admin Rule: Cannot ban another admin.")
    users_db[email]["is_banned"] = not users_db[email]["is_banned"]
    state = "BANNED" if users_db[email]["is_banned"] else "UNBANNED"
    audit_logs.append({"id": len(audit_logs) + 1, "actor": admin["email"], "action": f"USER_{state}", "details": f"Target: {email}"})
    return {"message": f"User {email} is now {state}"}

@app.get("/api/v1/admin/audit-logs")
def admin_audit_logs(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return audit_logs

@app.get("/api/v1/admin/export-csv", response_class=PlainTextResponse)
def export_csv(authorization: Optional[str] = Header(None)):
    user = get_current_user(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    lines = ["ID,Patient Name,Age,District,Hospital,Severity,Status,Owner"]
    for r in reports_db:
        lines.append(f"{r['id']},{r['patient_name']},{r['age']},{r['district']},{r['hospital_name']},{r['severity']},{r['status']},{r['owner_email']}")
    return "\n".join(lines)
