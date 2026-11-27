"""Google Analytics 4 Data API v1 (read-only) using the existing encrypted
Search Console OAuth tokens. No mock analytics, no write scopes, no PII."""
from __future__ import annotations

from datetime import date, timedelta

from ..config import settings
from . import oauth, service

API_BASE = "https://analyticsdata.googleapis.com/v1beta"


def property_id() -> str:
    return settings.GOOGLE_ANALYTICS_PROPERTY_ID.strip()


def available() -> tuple[bool, str]:
    if not property_id():
        return False, "GOOGLE_ANALYTICS_PROPERTY_ID is not configured."
    return True, "ok"


def report_url() -> str:
    return f"{API_BASE}/properties/{property_id()}:runReport"


def date_range(preset: str, custom_start: str = "", custom_end: str = "") -> tuple[str, str, str, str]:
    """GA4 data has ~2-day latency; never request future dates."""
    end = date.today() - timedelta(days=2)
    if preset == "custom" and custom_start and custom_end:
        start = date.fromisoformat(custom_start); end = date.fromisoformat(custom_end)
    else:
        days = {"7d": 7, "28d": 28, "90d": 90, "180d": 180}.get(preset, 28)
        start = end - timedelta(days=days - 1)
    span = (end - start).days + 1
    return str(start), str(end), str(start - timedelta(days=span)), str(start - timedelta(days=1))


def _run(db, metrics: list[str], dimensions: list[str], start: str, end: str,
         organic_only: bool = False, limit: int = 500) -> list[dict]:
    body: dict = {
        "dateRanges": [{"startDate": start, "endDate": end}],
        "metrics": [{"name": m} for m in metrics],
        "dimensions": [{"name": d} for d in dimensions],
        "limit": str(limit),
    }
    if organic_only:
        body["dimensionFilter"] = {
            "filter": {"fieldName": "sessionDefaultChannelGroup",
                       "stringFilter": {"value": "Organic Search", "matchType": "EXACT"}}
        }
    data = service.gsc_request(db, "POST", report_url(), body)
    rows = []
    for row in data.get("rows", []) or []:
        dims = [d.get("value", "") for d in row.get("dimensionValues", []) or []]
        vals = []
        for m in row.get("metricValues", []) or []:
            raw = m.get("value", "0")
            try:
                vals.append(float(raw))
            except (TypeError, ValueError):
                vals.append(0.0)
        rows.append({"dimensions": dims, "metrics": vals})
    return rows


METRICS = ["totalUsers", "activeUsers", "newUsers", "sessions", "screenPageViews",
           "engagedSessions", "engagementRate", "averageSessionDuration"]

DIMENSIONS = {
    "country": "country",
    "channel": "sessionDefaultChannelGroup",
    "landingPage": "landingPage",
    "device": "deviceCategory",
    "date": "date",
    "eventName": "eventName",
}


def overview(db, start: str, end: str, organic_only: bool = False) -> dict:
    rows = _run(db, METRICS, [], start, end, organic_only)
    vals = rows[0]["metrics"] if rows else [0.0] * len(METRICS)
    return {
        "total_users": int(vals[0]), "active_users": int(vals[1]),
        "new_users": int(vals[2]), "sessions": int(vals[3]),
        "views": int(vals[4]), "engaged_sessions": int(vals[5]),
        "engagement_rate": vals[6], "average_engagement_time_seconds": vals[7],
        "period": {"start": start, "end": end},
        "source": "Google Analytics 4 Data API v1 (live)",
        "organic_only": organic_only,
    }


def dimension(db, name: str, start: str, end: str, organic_only: bool = False,
              limit: int = 50) -> dict:
    dim = DIMENSIONS.get(name)
    if not dim:
        raise oauth.GscError("Unknown GA4 dimension.")
    if name == "eventName":
        metrics = ["eventCount", "totalUsers"]
    elif name == "date":
        metrics = ["sessions", "totalUsers"]
    else:
        metrics = ["sessions", "totalUsers", "screenPageViews"]
    rows = _run(db, metrics, [dim], start, end, organic_only, limit)
    items = []
    for r in rows:
        item = {"value": (r["dimensions"][0] if r["dimensions"] else "(not set)"),
                "sessions": int(r["metrics"][0]), "users": int(r["metrics"][1]),
                "views": int(r["metrics"][2]) if len(r["metrics"]) > 2 else 0}
        if name == "eventName":
            item["count"] = int(r["metrics"][0])
        items.append(item)
    items.sort(key=lambda x: -x["sessions"])
    return {"items": items, "dimension": name, "period": {"start": start, "end": end},
            "organic_only": organic_only}
