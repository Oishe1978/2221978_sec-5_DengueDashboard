"""Password hashing: Argon2id with a secret pepper.

1. pepper:  HMAC-SHA256(PASSWORD_PEPPER, password)   (the pepper lives only in the environment)
2. hash:    Argon2id(peppered password)              (random salt, memory-hard)

A database leak alone is therefore not enough to crack passwords.
Older accounts were hashed with scrypt; they still log in and are upgraded on that login.
"""

import base64
import hashlib
import hmac

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.config import IS_VERCEL, PASSWORD_PEPPER

_hasher = PasswordHasher()  # Argon2id with the library's recommended parameters


def _pepper() -> bytes:
    if PASSWORD_PEPPER:
        return PASSWORD_PEPPER.encode("utf-8")
    if IS_VERCEL:
        raise RuntimeError("PASSWORD_PEPPER is not set in the Vercel environment variables")
    return b"dev-only-pepper-change-me"  # local development only


def _peppered(password: str) -> str:
    digest = hmac.new(_pepper(), password.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")  # fixed length, safe for any hasher


def hash_password(password: str) -> str:
    return _hasher.hash(_peppered(password))


def verify_password(password: str, stored: str) -> bool:
    if stored.startswith("scrypt$"):
        return _verify_legacy_scrypt(password, stored)
    try:
        return _hasher.verify(stored, _peppered(password))
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(stored: str) -> bool:
    """True for old scrypt hashes and for Argon2 hashes made with outdated settings."""
    return stored.startswith("scrypt$") or _hasher.check_needs_rehash(stored)


def _verify_legacy_scrypt(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt_b64, key_b64 = stored.split("$")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(key_b64)
        key = hashlib.scrypt(
            password.encode("utf-8"), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(key, expected)
