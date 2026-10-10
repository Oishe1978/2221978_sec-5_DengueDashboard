Technical Design Document (TDD)

1. System Architecture Overview
The system follows a modern decoupled Client-Server architecture (Monorepo setup).

+------------------------------------+
|   React + TypeScript Frontend      |
|           (Vite + UI)              |
+------------------------------------+
|
HTTP / JSON API
v
+------------------------------------+
|    FastAPI Python Backend          |
|      (REST API Services)           |
+------------------------------------+


2. Tech Stack Specification
- Frontend Stack:
  - Framework: React (v18+)
  - Language: TypeScript
  - Build Tool: Vite
- Backend Stack:
  - Framework: FastAPI
  - Language: Python 3.10+
  - ASGI Server: Uvicorn

3. Directory Structure
2221978_sec-5_DengueDashboard/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── docs/
│   ├── PRD.md
│   ├── SRS.md
│   └── TDD.md
└── frontend/
├── src/
├── package.json
└── tsconfig.json


4. API Endpoints Specification

GET `/`
- Description: Health check root endpoint.
- Response: `{"message": "FastAPI backend is running"}`

GET `/api/v1/dengue-stats`
- Description: Fetches summary of overall dengue statistics.
- Response Format:
  ```json
  {
    "total_cases": 12500,
    "active_cases": 1200,
    "recovered": 11150,
    "deaths": 150
  }
