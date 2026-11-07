"""Pure calculation helpers for the dashboard (standard library only, no database code).

Every function works on "daily totals": a list of (report_date, admitted, deaths) tuples,
one per day, already summed over the divisions the caller asked for.
"""

from datetime import date, timedelta
from typing import Optional

Daily = tuple[date, int, int]

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def pct_change(current: float, previous: float) -> Optional[float]:
    """Percentage change; None when there is nothing to compare with."""
    if previous <= 0:
        return None
    return round((current - previous) / previous * 100, 1)


def fatality_rate(deaths: int, admitted: int) -> float:
    return round(deaths / admitted * 100, 2) if admitted else 0.0


def summarize(daily: list[Daily], date_from: date, date_to: date, previous: list[Daily]) -> dict:
    days = (date_to - date_from).days + 1
    admitted = sum(a for _, a, _ in daily)
    deaths = sum(x for _, _, x in daily)
    prev_admitted = sum(a for _, a, _ in previous)
    prev_deaths = sum(x for _, _, x in previous)
    peak = max(daily, key=lambda row: row[1], default=None)
    return {
        "date_from": date_from,
        "date_to": date_to,
        "days": days,
        "admitted": admitted,
        "deaths": deaths,
        "fatality_rate": fatality_rate(deaths, admitted),
        "avg_daily": round(admitted / days, 1),
        "peak_date": peak[0] if peak else None,
        "peak_admitted": peak[1] if peak else 0,
        "previous_admitted": prev_admitted,
        "previous_deaths": prev_deaths,
        "admitted_change_pct": pct_change(admitted, prev_admitted),
        "deaths_change_pct": pct_change(deaths, prev_deaths),
    }


def bucket_start(day: date, granularity: str) -> date:
    if granularity == "week":
        return day - timedelta(days=day.weekday())  # weeks start on Monday
    if granularity == "month":
        return day.replace(day=1)
    if granularity == "year":
        return day.replace(month=1, day=1)
    return day


def timeseries(daily: list[Daily], granularity: str, date_from: date) -> list[dict]:
    """Group daily totals into days, weeks, months or years.

    For "day" the input may start up to 6 days before date_from; those extra days are only
    used to give the first points a full 7-day average and are not returned.
    """
    if granularity == "day":
        by_date = {d: a for d, a, _ in daily}
        points = []
        for d, a, x in daily:
            if d < date_from:
                continue
            window = [by_date[d - timedelta(days=k)] for k in range(7) if (d - timedelta(days=k)) in by_date]
            points.append({
                "period_start": d, "admitted": a, "deaths": x, "days": 1,
                "admitted_avg7": round(sum(window) / len(window), 1),
            })
        return points

    buckets: dict[date, list[int]] = {}
    for d, a, x in daily:
        if d < date_from:
            continue
        b = buckets.setdefault(bucket_start(d, granularity), [0, 0, 0])
        b[0] += a
        b[1] += x
        b[2] += 1
    return [
        {"period_start": k, "admitted": v[0], "deaths": v[1], "days": v[2], "admitted_avg7": None}
        for k, v in sorted(buckets.items())
    ]


def by_division(rows: list[tuple[str, int, int]]) -> list[dict]:
    total = sum(a for _, a, _ in rows)
    out = [
        {
            "division": name, "admitted": a, "deaths": x,
            "fatality_rate": fatality_rate(x, a),
            "share_pct": round(a / total * 100, 1) if total else 0.0,
        }
        for name, a, x in rows
    ]
    return sorted(out, key=lambda r: r["admitted"], reverse=True)


def monthly_by_year(daily: list[Daily]) -> list[dict]:
    """Admissions per month for each year (None = no data for that month)."""
    years: dict[int, list[Optional[int]]] = {}
    for d, a, _ in daily:
        months = years.setdefault(d.year, [None] * 12)
        months[d.month - 1] = (months[d.month - 1] or 0) + a
    return [
        {"year": y, "months": m, "total": sum(v for v in m if v)}
        for y, m in sorted(years.items())
    ]


def weekday_stats(daily: list[Daily]) -> list[dict]:
    sums = [[0, 0, 0] for _ in range(7)]
    for d, a, x in daily:
        s = sums[d.weekday()]
        s[0] += a
        s[1] += x
        s[2] += 1
    return [
        {
            "weekday": WEEKDAYS[i],
            "admitted_avg": round(s[0] / s[2], 1) if s[2] else 0.0,
            "deaths_avg": round(s[1] / s[2], 2) if s[2] else 0.0,
            "days": s[2],
        }
        for i, s in enumerate(sums)
    ]


def day_report(day: date, division_rows: list[tuple[str, int, int]], division: Optional[str],
               previous_days: list[Daily]) -> dict:
    """One date: the chosen division (or all of them) compared with the 7 days before."""
    selected = [r for r in division_rows if division is None or r[0] == division]
    admitted = sum(a for _, a, _ in selected)
    deaths = sum(x for _, _, x in selected)
    prev_values = [a for _, a, _ in previous_days]
    avg7 = sum(prev_values) / len(prev_values) if prev_values else None
    yesterday = next((a for d, a, _ in previous_days if d == day - timedelta(days=1)), None)
    return {
        "report_date": day,
        "division": division,
        "admitted": admitted,
        "deaths": deaths,
        "fatality_rate": fatality_rate(deaths, admitted),
        "avg_prev_7_days": round(avg7, 1) if avg7 is not None else None,
        "change_vs_avg_pct": pct_change(admitted, avg7) if avg7 is not None else None,
        "prev_day_admitted": yesterday,
        "change_vs_prev_day_pct": pct_change(admitted, yesterday) if yesterday is not None else None,
        "divisions": sorted(
            [{"division": n, "admitted": a, "deaths": x} for n, a, x in division_rows],
            key=lambda r: r["admitted"], reverse=True,
        ),
    }
