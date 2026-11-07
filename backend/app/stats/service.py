from datetime import date, timedelta
from typing import Optional

from app.reports.schemas import today_in_dhaka
from app.stats import calc
from app.stats.repository import StatsRepository


class InvalidRangeError(Exception):
    pass


class NoDataError(Exception):
    pass


class StatsService:
    def __init__(self, repo: StatsRepository) -> None:
        self.repo = repo

    def _range(self, division: Optional[str], date_from: Optional[date], date_to: Optional[date]):
        """Defaults: end = latest day with data, start = 30 days before the end."""
        if date_from and date_to and date_from > date_to:
            raise InvalidRangeError("date_from must not be after date_to")
        _, latest = self.repo.date_bounds(division)
        end = date_to or latest or today_in_dhaka()
        start = date_from or end - timedelta(days=29)
        if start > end:
            raise InvalidRangeError("date_from is after the latest available data")
        return start, end

    def date_range(self, division: Optional[str]) -> dict:
        lowest, highest = self.repo.date_bounds(division)
        return {"min_date": lowest, "max_date": highest}

    def summary(self, division, date_from, date_to) -> dict:
        start, end = self._range(division, date_from, date_to)
        days = (end - start).days + 1
        current = self.repo.daily_totals(division, start, end)
        previous = self.repo.daily_totals(
            division, start - timedelta(days=days), start - timedelta(days=1)
        )
        return calc.summarize(current, start, end, previous)

    def timeseries(self, division, date_from, date_to, granularity: str) -> list[dict]:
        start, end = self._range(division, date_from, date_to)
        fetch_from = start - timedelta(days=6) if granularity == "day" else start
        daily = self.repo.daily_totals(division, fetch_from, end)
        return calc.timeseries(daily, granularity, start)

    def by_division(self, date_from, date_to) -> list[dict]:
        start, end = self._range(None, date_from, date_to)
        return calc.by_division(self.repo.division_totals(start, end))

    def monthly_by_year(self, division) -> list[dict]:
        return calc.monthly_by_year(self.repo.daily_totals(division, None, None))

    def weekday(self, division, date_from, date_to) -> list[dict]:
        start, end = self._range(division, date_from, date_to)
        return calc.weekday_stats(self.repo.daily_totals(division, start, end))

    def day_report(self, day: date, division: Optional[str]) -> dict:
        rows = self.repo.rows_for_date(day)
        if not rows:
            raise NoDataError
        previous = self.repo.daily_totals(division, day - timedelta(days=7), day - timedelta(days=1))
        return calc.day_report(day, rows, division, previous)
