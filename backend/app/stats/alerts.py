from typing import Optional

from app.stats.repository import StatsRepository


def latest_status(stats: StatsRepository, division: str, threshold: int) -> dict:
    """Newest day with data for the division, its admissions, and whether that reached the alert level."""
    _, latest = stats.date_bounds(division)
    admitted: Optional[int] = None
    if latest is not None:
        rows = stats.daily_totals(division, latest, latest)
        admitted = rows[0][1] if rows else None
    return {
        "latest_date": latest,
        "latest_admitted": admitted,
        "alert": admitted is not None and admitted >= threshold,
    }
