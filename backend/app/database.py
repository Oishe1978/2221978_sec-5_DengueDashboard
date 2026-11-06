
from sqlmodel import SQLModel, create_engine, Session
from app.config import DATABASE_URL


# Configure database connection
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )


# Create database tables
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


# Provide database session
def get_session():
    with Session(engine) as session:
        yield session
