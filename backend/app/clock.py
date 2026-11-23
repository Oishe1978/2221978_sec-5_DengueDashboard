from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current UTC time without tzinfo. The database stores naive UTC, so all comparisons use this."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
