"""BigQuery client and query helpers for GA4 validation data."""

import os
import re
from datetime import datetime
from typing import Any

from google.cloud import bigquery
from google.oauth2 import service_account


PROJECT_ID = os.environ.get("BIGQUERY_PROJECT", "mimetic-perigee-290610")
DATASET = os.environ.get("BIGQUERY_DATASET", "obs_layer_northern_europe")
LOCATION = os.environ.get("BIGQUERY_LOCATION", "europe-north1")
TABLE_VALIDATION = f"{PROJECT_ID}.{DATASET}.fct_ga4_validation"
TABLE_INT_EVENT_PARAM_STATUS = f"{PROJECT_ID}.{DATASET}.int_moomin__event_param_status"
TABLE_SESSIONS_PURCHASES_DAILY = f"{PROJECT_ID}.{DATASET}.fct_moomin_sessions_purchases_daily"

# Optional: raw GA4 export datasets (for showing raw event volumes alongside deduped models).
RAW_GA4_DATASET_BY_PROPERTY: dict[str, str] = {
    "moomin_client": os.environ.get("RAW_GA4_DATASET_MOOMIN_CLIENT", "analytics_411471848"),
    "moomin_server": os.environ.get("RAW_GA4_DATASET_MOOMIN_SERVER", ""),
}

EVENTS = [
    "session_start",
    "page_view",
    "view_item",
    "add_to_cart",
    "begin_checkout",
    "purchase",
]

GA4_PROPERTIES = ["moomin_client", "moomin_server"]


def _parse_ga4_properties(value: str | None) -> list[str]:
    """Parse ga4_property query param (comma-separated). Default: both properties."""
    if not value or not value.strip():
        return list(GA4_PROPERTIES)
    parts = [p.strip().lower() for p in value.split(",") if p.strip()]
    valid = [p for p in parts if p in GA4_PROPERTIES]
    return valid if valid else list(GA4_PROPERTIES)


def query_raw_event_counts(
    date_from: str,
    date_to: str,
    event_name: str,
    ga4_properties: list[str] | None = None,
) -> dict[str, int]:
    """Return raw GA4 event counts per ga4_property for date range (inclusive).

    Reads directly from GA4 export tables: `<project>.<analytics_dataset>.events_*` using _TABLE_SUFFIX.
    Raw datasets are configured via RAW_GA4_DATASET_MOOMIN_CLIENT / RAW_GA4_DATASET_MOOMIN_SERVER.
    """
    if not ga4_properties:
        ga4_properties = GA4_PROPERTIES

    # Validate dates and normalize event_name
    for d, label in [(date_from, "date_from"), (date_to, "date_to")]:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", d):
            raise ValueError(f"Invalid {label} format: use YYYY-MM-DD.")
        datetime.strptime(d, "%Y-%m-%d")
    event_name = _normalize_event_name(event_name)
    if event_name not in EVENTS:
        raise ValueError(
            f"Invalid event_name: '{event_name}'. Must be one of: {', '.join(EVENTS)}"
        )

    suffix_from = date_from.replace("-", "")
    suffix_to = date_to.replace("-", "")

    client = get_client()
    counts: dict[str, int] = {}
    for prop in ga4_properties:
        ds = RAW_GA4_DATASET_BY_PROPERTY.get(prop, "")
        if not ds:
            continue
        query = f"""
        SELECT COUNT(*) AS event_count
        FROM `{PROJECT_ID}.{ds}.events_*`
        WHERE _TABLE_SUFFIX BETWEEN @suffix_from AND @suffix_to
          AND event_name = @event_name
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("suffix_from", "STRING", suffix_from),
                bigquery.ScalarQueryParameter("suffix_to", "STRING", suffix_to),
                bigquery.ScalarQueryParameter("event_name", "STRING", event_name),
            ]
        )
        rows = list(client.query(query, job_config=job_config))
        counts[prop] = int(rows[0].event_count or 0) if rows else 0
    return counts


def _normalize_event_name(raw: str) -> str:
    """Normalize event name: replace spaces with underscores, lowercase."""
    if not raw or not isinstance(raw, str):
        return ""
    return raw.strip().lower().replace(" ", "_")


def _validate_drilldown_inputs(date_str: str, event_name: str) -> None:
    """Validate date and event_name for drilldown query. Raises ValueError if invalid."""
    normalized = _normalize_event_name(event_name)
    if normalized not in EVENTS:
        raise ValueError(
            f"Invalid event_name: '{event_name}'. Must be one of: {', '.join(EVENTS)}"
        )
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        raise ValueError(f"Invalid date format: '{date_str}'. Use YYYY-MM-DD.")
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError as e:
        raise ValueError(f"Invalid date: '{date_str}'. {e}") from e


def get_client() -> bigquery.Client:
    """Create BigQuery client with optional service account credentials."""
    credentials = None
    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    key_content = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")

    if key_content:
        import json

        try:
            key_info = json.loads(key_content)
            credentials = service_account.Credentials.from_service_account_info(key_info)
        except (json.JSONDecodeError, ValueError) as e:
            raise ValueError(f"Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON: {e}") from e
    elif key_path and os.path.exists(key_path):
        credentials = service_account.Credentials.from_service_account_file(key_path)
    else:
        # Will use Application Default Credentials (ADC) if set
        pass

    return bigquery.Client(
        project=PROJECT_ID,
        location=LOCATION,
        credentials=credentials,
    )


def query_event_quality_range(
    date_from: str, date_to: str, ga4_properties: list[str] | None = None
) -> list[dict[str, Any]]:
    """Fetch average parameter quality per (date, event) from fct_ga4_validation.
    Returns rows in SummaryRow format: { date, {event}_overall_score, ... }.
    When multiple ga4_properties, averages quality per (date, event)."""
    if not ga4_properties:
        ga4_properties = GA4_PROPERTIES
    client = get_client()
    query = f"""
    SELECT date, event_name, ga4_property,
      AVG(100.0 * (event_count - invalid_count) / NULLIF(event_count, 0)) AS avg_param_quality
    FROM `{TABLE_VALIDATION}`
    WHERE date >= @date_from AND date <= @date_to
      AND ga4_property IN UNNEST(@ga4_properties)
    GROUP BY date, event_name, ga4_property
    ORDER BY date, event_name, ga4_property
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date_from", "DATE", date_from),
            bigquery.ScalarQueryParameter("date_to", "DATE", date_to),
            bigquery.ArrayQueryParameter("ga4_properties", "STRING", ga4_properties),
        ]
    )
    result = client.query(query, job_config=job_config)
    # Build date -> { event -> [qualities] } then average
    by_date: dict[str, dict[str, list[float]]] = {}
    for row in result:
        dt = str(row.date)
        ev = str(row.event_name or "")
        val = float(row.avg_param_quality or 0)
        if dt not in by_date:
            by_date[dt] = {}
        if ev not in by_date[dt]:
            by_date[dt][ev] = []
        by_date[dt][ev].append(val)
    rows = []
    for dt in sorted(by_date.keys()):
        d: dict[str, Any] = {"date": dt}
        for ev in EVENTS:
            vals = by_date[dt].get(ev, [])
            d[f"{ev}_overall_score"] = round(sum(vals) / len(vals) * 10) / 10 if vals else 0
        rows.append(d)
    return rows


def query_drilldown(
    date: str, event_name: str, ga4_properties: list[str] | None = None
) -> list[dict[str, Any]]:
    """Fetch drill-down rows for one event from fct_ga4_validation. Sums counts across selected properties."""
    _validate_drilldown_inputs(date, event_name)
    if not ga4_properties:
        ga4_properties = GA4_PROPERTIES
    normalized_event = _normalize_event_name(event_name)
    client = get_client()
    query = f"""
    SELECT date, event_name, param_name, qa_status, ga4_property, event_count, invalid_count
    FROM `{TABLE_VALIDATION}`
    WHERE date = @date AND event_name = @event_name
      AND ga4_property IN UNNEST(@ga4_properties)
    ORDER BY param_name, ga4_property
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date", "DATE", date),
            bigquery.ScalarQueryParameter("event_name", "STRING", normalized_event),
            bigquery.ArrayQueryParameter("ga4_properties", "STRING", ga4_properties),
        ]
    )
    result = client.query(query, job_config=job_config)
    # Aggregate by param_name (sum event_count, invalid_count); keep first qa_status
    by_param: dict[str, dict[str, Any]] = {}
    for row in result:
        p = str(row.param_name or "")
        if p not in by_param:
            by_param[p] = {
                "date": str(row.date),
                "event_name": row.event_name,
                "param_name": p,
                "qa_status": row.qa_status,
                "event_count": 0,
                "invalid_count": 0,
            }
        by_param[p]["event_count"] += int(row.event_count or 0)
        by_param[p]["invalid_count"] += int(row.invalid_count or 0)
    return list(by_param.values())


def query_top_missing_params(
    date: str, limit: int = 3, ga4_properties: list[str] | None = None
) -> list[dict[str, Any]]:
    """Fetch top N (event_name, param_name) pairs with highest % missing for a date.
    Sums counts across selected properties, then computes pct_missing."""
    if not ga4_properties:
        ga4_properties = GA4_PROPERTIES
    limit = max(1, min(100, limit))
    client = get_client()
    query = f"""
    SELECT date, event_name, param_name, ga4_property, event_count, invalid_count
    FROM `{TABLE_VALIDATION}`
    WHERE date = @date AND ga4_property IN UNNEST(@ga4_properties)
    ORDER BY event_name, param_name, ga4_property
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date", "DATE", date),
            bigquery.ArrayQueryParameter("ga4_properties", "STRING", ga4_properties),
        ]
    )
    result = client.query(query, job_config=job_config)
    by_key: dict[tuple[str, str], dict[str, Any]] = {}
    for row in result:
        ev = str(row.event_name or "")
        p = str(row.param_name or "")
        key = (ev, p)
        if key not in by_key:
            by_key[key] = {
                "date": str(row.date),
                "event_name": ev,
                "param_name": p,
                "event_count": 0,
                "invalid_count": 0,
            }
        by_key[key]["event_count"] += int(row.event_count or 0)
        by_key[key]["invalid_count"] += int(row.invalid_count or 0)
    rows = []
    for (ev, p), d in by_key.items():
        ec = d["event_count"] or 1
        pct = 100.0 * (d["invalid_count"] or 0) / ec
        rows.append({**d, "pct_missing": round(pct, 1)})
    rows.sort(key=lambda r: r["pct_missing"], reverse=True)
    return rows[:limit]


def query_param_detail(
    event_name: str,
    param_name: str,
    limit: int = 20,
    date_from: str | None = None,
    date_to: str | None = None,
    ga4_properties: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Fetch most recent actual_value rows for one (event_name, param_name) from int_moomin__event_param_status.
    Optional date_from/date_to filter by date range (YYYY-MM-DD). If both omitted, returns latest rows across all dates."""
    if not ga4_properties:
        ga4_properties = GA4_PROPERTIES
    normalized_event = _normalize_event_name(event_name)
    if normalized_event not in EVENTS:
        raise ValueError(
            f"Invalid event_name: '{event_name}'. Must be one of: {', '.join(EVENTS)}"
        )
    if not param_name or not isinstance(param_name, str):
        raise ValueError("param_name is required and must be a non-empty string.")
    param_name = param_name.strip()
    if not param_name:
        raise ValueError("param_name cannot be empty.")
    # Allow typical param names: alphanumeric, underscore
    if not re.match(r"^[a-zA-Z0-9_]+$", param_name):
        raise ValueError("param_name must contain only letters, numbers, and underscores.")
    if date_from is not None or date_to is not None:
        for d, label in [(date_from, "date_from"), (date_to, "date_to")]:
            if d is not None and not re.match(r"^\d{4}-\d{2}-\d{2}$", d):
                raise ValueError(f"Invalid {label} format: use YYYY-MM-DD.")
        if date_from is not None:
            datetime.strptime(date_from, "%Y-%m-%d")
        if date_to is not None:
            datetime.strptime(date_to, "%Y-%m-%d")
    limit = max(1, min(100, limit))
    client = get_client()
    where_parts = [
        "event_name = @event_name",
        "param_name = @param_name",
        "ga4_property IN UNNEST(@ga4_properties)",
    ]
    params = [
        bigquery.ScalarQueryParameter("event_name", "STRING", normalized_event),
        bigquery.ScalarQueryParameter("param_name", "STRING", param_name),
        bigquery.ScalarQueryParameter("limit", "INT64", limit),
        bigquery.ArrayQueryParameter("ga4_properties", "STRING", ga4_properties),
    ]
    if date_from is not None:
        where_parts.append("date >= @date_from")
        params.append(bigquery.ScalarQueryParameter("date_from", "DATE", date_from))
    if date_to is not None:
        where_parts.append("date <= @date_to")
        params.append(bigquery.ScalarQueryParameter("date_to", "DATE", date_to))
    where_clause = " AND ".join(where_parts)
    query = f"""
    SELECT date, event_timestamp, event_name, param_name, qa_status, actual_value
    FROM `{TABLE_INT_EVENT_PARAM_STATUS}`
    WHERE {where_clause}
    ORDER BY date DESC, event_timestamp DESC
    LIMIT @limit
    """
    job_config = bigquery.QueryJobConfig(query_parameters=params)
    result = client.query(query, job_config=job_config)
    return [
        {
            "date": str(row.date),
            "event_timestamp": int(row.event_timestamp or 0),
            "event_name": str(row.event_name or ""),
            "param_name": str(row.param_name or ""),
            "qa_status": str(row.qa_status or ""),
            "actual_value": str(row.actual_value) if row.actual_value is not None else "",
        }
        for row in result
    ]


def query_issues(date: str, ga4_properties: list[str] | None = None) -> list[dict[str, Any]]:
    """Fetch non-VALID rows for a date (alerts view)."""
    if not ga4_properties:
        ga4_properties = GA4_PROPERTIES
    client = get_client()
    query = f"""
    SELECT date, event_name, param_name, qa_status, event_count, invalid_count
    FROM `{TABLE_VALIDATION}`
    WHERE date = @date AND qa_status != 'VALID'
      AND ga4_property IN UNNEST(@ga4_properties)
    ORDER BY event_name, param_name
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date", "DATE", date),
            bigquery.ArrayQueryParameter("ga4_properties", "STRING", ga4_properties),
        ]
    )
    result = client.query(query, job_config=job_config)
    return [
        {
            "date": str(row.date),
            "event_name": row.event_name,
            "param_name": row.param_name,
            "qa_status": row.qa_status,
            "event_count": int(row.event_count or 0),
            "invalid_count": int(row.invalid_count or 0),
        }
        for row in result
    ]


def query_sessions_purchases_daily(
    date_from: str, date_to: str, ga4_properties: list[str] | None = None
) -> list[dict[str, Any]]:
    """Fetch daily session_count and purchase_count per ga4_property from fct_moomin_sessions_purchases_daily."""
    if not ga4_properties:
        ga4_properties = GA4_PROPERTIES
    client = get_client()
    query = f"""
    SELECT date, ga4_property, session_count, purchase_count
    FROM `{TABLE_SESSIONS_PURCHASES_DAILY}`
    WHERE date >= @date_from AND date <= @date_to
      AND ga4_property IN UNNEST(@ga4_properties)
    ORDER BY date, ga4_property
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date_from", "DATE", date_from),
            bigquery.ScalarQueryParameter("date_to", "DATE", date_to),
            bigquery.ArrayQueryParameter("ga4_properties", "STRING", ga4_properties),
        ]
    )
    result = client.query(query, job_config=job_config)
    return [
        {
            "date": str(row.date),
            "ga4_property": str(row.ga4_property or ""),
            "session_count": int(row.session_count or 0),
            "purchase_count": int(row.purchase_count or 0),
        }
        for row in result
    ]
