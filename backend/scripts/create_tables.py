"""Create any missing tables in the database named by DATABASE_URL.

Run from the backend folder:   python -m scripts.create_tables
"""

from app.database import create_db_and_tables

if __name__ == "__main__":
    create_db_and_tables()
    print("Tables are ready.")
