"""Build data/dengue_daily_seed.csv from the official DGHS file.

Run from the backend folder:   python -m scripts.build_seed_csv

What it does
1. Dhaka: the official daily admissions/deaths (DNCC + DSCC + rest of the division merged
   into one number, because the official columns add up exactly).  source = "dghs".
2. Dhaka, from the day after the official data ends up to END_DATE: a seasonal simulation.
   source = "synthetic".
3. The other 7 divisions: the official file only has a nationwide total, so the national
   remainder (national - Dhaka) is split across the 7 divisions with fixed, made-up weights
   plus daily noise.  The split is NOT official.  source = "synthetic".
   Because of how it is built, the 8 divisions always add up to the national total.
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path
from statistics import mean

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RAW_CSV = DATA_DIR / "dghs_dengue_2024-2026_raw.csv"
OUT_CSV = DATA_DIR / "dengue_daily_seed.csv"
END_DATE = date(2026, 11, 7)   # fill up to this day (the day the seed was built)
SEED = 2026

DIVISIONS = ["Dhaka", "Chattogram", "Barishal", "Sylhet", "Rajshahi", "Rangpur", "Khulna", "Mymensingh"]

# Made-up shares of the non-Dhaka remainder (sum = 1.00). Not official figures.
OTHER_WEIGHTS = {
    "Chattogram": 0.30, "Khulna": 0.15, "Barishal": 0.14, "Sylhet": 0.13,
    "Rajshahi": 0.10, "Mymensingh": 0.10, "Rangpur": 0.08,
}

# Reporting is clearly weaker on Fridays in the official data (Mon=0 ... Sun=6).
WEEKDAY_FACTOR = {0: 1.14, 1: 1.12, 2: 1.07, 3: 1.05, 4: 0.51, 5: 0.93, 6: 1.19}
DAILY_DECAY = 0.985
NOISE_SIGMA = 0.18
DEATH_RATE = 0.0033
NATIONAL_SHARE = (0.36, 0.44)   # Dhaka's share of national admissions (recent average ~0.40)


def binomial(n: int, p: float, rng: random.Random) -> int:
    return sum(1 for _ in range(n) if rng.random() < p)


def read_official() -> list[dict]:
    rows = []
    with RAW_CSV.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append({
                "date": date.fromisoformat(r["date"]),
                "dhaka_admitted": int(r["dhaka_admitted"]),
                "dhaka_deaths": int(r["dhaka_death"]),
                "national_admitted": int(r["total_admitted"]),
                "national_deaths": int(r["total_death"]),
                "source": "dghs",
            })
    rows.sort(key=lambda r: r["date"])
    return rows


def extend_dhaka(history: list[dict], end: date, rng: random.Random) -> list[dict]:
    recent = history[-14:]
    base = mean(r["dhaka_admitted"] / WEEKDAY_FACTOR[r["date"].weekday()] for r in recent)
    out, day, step = [], history[-1]["date"] + timedelta(days=1), 0
    while day <= end:
        step += 1
        level = base * (DAILY_DECAY ** step) * WEEKDAY_FACTOR[day.weekday()]
        admitted = max(0, round(level * rng.lognormvariate(0, NOISE_SIGMA)))
        deaths = binomial(admitted, DEATH_RATE, rng)
        national = max(admitted, round(admitted / rng.uniform(*NATIONAL_SHARE)))
        national_deaths = deaths + binomial(national - admitted, DEATH_RATE, rng)
        out.append({"date": day, "dhaka_admitted": admitted, "dhaka_deaths": deaths,
                    "national_admitted": national, "national_deaths": national_deaths,
                    "source": "synthetic"})
        day += timedelta(days=1)
    return out


def split_remainder(total: int, weights: dict[str, float], rng: random.Random) -> dict[str, int]:
    """Split an integer total across divisions (daily-noisy weights, largest-remainder rounding)."""
    noisy = {k: w * rng.lognormvariate(0, 0.15) for k, w in weights.items()}
    s = sum(noisy.values())
    raw = {k: total * v / s for k, v in noisy.items()}
    out = {k: int(v) for k, v in raw.items()}
    left = total - sum(out.values())
    for k in sorted(raw, key=lambda k: raw[k] - out[k], reverse=True)[:left]:
        out[k] += 1
    return out


def split_deaths(total: int, admitted: dict[str, int], rng: random.Random) -> dict[str, int]:
    """Give each death to a division with spare capacity, in proportion to its admissions."""
    deaths = {k: 0 for k in admitted}
    for _ in range(total):
        spare = {k: admitted[k] - deaths[k] for k in admitted if admitted[k] - deaths[k] > 0}
        if not spare:
            break
        pick = rng.uniform(0, sum(spare.values()))
        acc = 0.0
        for k, w in spare.items():
            acc += w
            if pick <= acc:
                deaths[k] += 1
                break
    return deaths


def main() -> None:
    rng = random.Random(SEED)
    official = read_official()
    days = official + extend_dhaka(official, END_DATE, rng)

    out_rows = []
    for d in days:
        out_rows.append((d["date"], "Dhaka", d["dhaka_admitted"], d["dhaka_deaths"], d["source"]))
        rem_a = d["national_admitted"] - d["dhaka_admitted"]
        rem_d = d["national_deaths"] - d["dhaka_deaths"]
        adm = split_remainder(rem_a, OTHER_WEIGHTS, rng)
        dea = split_deaths(rem_d, adm, rng)
        for name in DIVISIONS[1:]:
            out_rows.append((d["date"], name, adm[name], dea[name], "synthetic"))

    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["report_date", "division", "admitted", "deaths", "source"])
        for r in out_rows:
            w.writerow([r[0].isoformat(), r[1], r[2], r[3], r[4]])
    print(f"Wrote {len(out_rows)} rows ({len(days)} days x {len(DIVISIONS)} divisions) to {OUT_CSV}")


if __name__ == "__main__":
    main()
