import os

from dotenv import load_dotenv

load_dotenv()

IS_VERCEL = bool(os.getenv("VERCEL"))

JWT_SECRET = os.getenv("JWT_SECRET")
ADMIN_SIGNUP_CODE = os.getenv("ADMIN_SIGNUP_CODE")


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
    if not url:
        # On Vercel only /tmp is writable, and it is wiped between runs: set DATABASE_URL there.
        return "sqlite:////tmp/dengue.db" if IS_VERCEL else "sqlite:///./dengue.db"
    # Supabase gives postgres:// or postgresql://; SQLAlchemy needs the psycopg driver name.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = get_database_url()
