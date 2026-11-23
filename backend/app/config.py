import os

from dotenv import load_dotenv

load_dotenv()

IS_VERCEL = bool(os.getenv("VERCEL"))

# --- secrets (environment variables only, never in the repository) ---
JWT_SECRET = os.getenv("JWT_SECRET")              # signs the access tokens
PASSWORD_PEPPER = os.getenv("PASSWORD_PEPPER")    # secret mixed into every password before hashing
ADMIN_SIGNUP_CODE = os.getenv("ADMIN_SIGNUP_CODE")

# --- session settings ---
ACCESS_MINUTES = int(os.getenv("JWT_ACCESS_MINUTES", "15"))   # short-lived access token
REFRESH_DAYS = int(os.getenv("JWT_REFRESH_DAYS", "7"))        # refresh cookie lifetime
COOKIE_SECURE = IS_VERCEL or os.getenv("COOKIE_SECURE", "").lower() == "true"

# --- brute-force protection ---
MAX_FAILED_LOGINS = int(os.getenv("MAX_FAILED_LOGINS", "5"))
LOCK_MINUTES = int(os.getenv("LOCK_MINUTES", "15"))


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
