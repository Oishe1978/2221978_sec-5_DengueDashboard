"""Load data/dengue_daily_seed.csv into the database.

Run from the backend folder:
    python -m scripts.import_seed            # add rows that are missing (safe to repeat)
    python -m scripts.import_seed --reset    # delete ALL existing daily reports first
"""

import csv
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import delete
from sqlmodel import Session, select

from app.database import create_db_and_tables, engine
from app.reports.models import DailyReport
from app.reports.schemas import DIVISIONS

SEED_CSV = Path(__file__).resolve().parent.parent / "data" / "dengue_daily_seed.csv"


def read_seed() -> list[dict]:
    rows = []
    with SEED_CSV.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["division"] not in DIVISIONS:
                raise ValueError(f"Unknown division in seed file: {r['division']}")
            rows.append({
                "report_date": date.fromisoformat(r["report_date"]),
                "division": r["division"],
                "admitted": int(r["admitted"]),
                "deaths": int(r["deaths"]),
                "source": r["source"],
            })
    return rows


def main() -> None:
    reset = "--reset" in sys.argv
    create_db_and_tables()
    rows = read_seed()

    with Session(engine) as session:
        if reset:
            session.exec(delete(DailyReport))
            session.commit()
            print("Deleted all existing daily reports.")

        existing = set(session.exec(select(DailyReport.division, DailyReport.report_date)).all())
        added = 0
        for row in rows:
            if (row["division"], row["report_date"]) in existing:
                continue
            session.add(DailyReport(**row))
            added += 1
        session.commit()

    print(f"Imported {added} rows (the file has {len(rows)}).")


if __name__ == "__main__":
    main()
