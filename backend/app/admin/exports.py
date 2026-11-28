"""CSV helpers. Cells that start with = + - @ are prefixed so Excel cannot run them as formulas."""

import csv
import io
from collections.abc import Iterable

from fastapi.responses import Response

from app.clock import utcnow


def _safe(value) -> str:
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


def csv_response(name: str, header: list[str], rows: Iterable[list]) -> Response:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    for row in rows:
        writer.writerow([_safe(v) for v in row])
    filename = f"{name}-{utcnow():%Y%m%d-%H%M%S}.csv"
    return Response(
        content="\ufeff" + buffer.getvalue(),  # BOM so Excel reads UTF-8
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
