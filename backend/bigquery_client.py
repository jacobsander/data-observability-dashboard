"""BigQuery client and query helpers for GA4 validation data."""

import os
import re
from datetime import datetime
from typing import Any

from google.cloud import bigquery
from google.oauth2 import service_account


PROJECT_ID = os.environ.get("BIGQUERY_PROJECT", "mimetic-perigee-290610")
DATASET = os.environ.get("BIGQUERY_DATASET", "obs_layer_poc_moomin")
LOCATION = "EU"
TABLE_SUMMARY = f"{PROJECT_ID}.{DATASET}.fct_ga4_validation_summary_daily"
TABLE_VALIDATION = f"{PROJECT_ID}.{DATASET}.fct_ga4_validation"
TABLE_INT_EVENT_PARAM_STATUS = f"{PROJECT_ID}.{DATASET}.int_moomin__event_param_status"

EVENTS = [
    "session_start",
    "page_view",
    "view_item",
    "add_to_cart",
    "begin_checkout",
    "purchase",
]


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


def query_summary_range(date_from: str, date_to: str) -> list[dict[str, Any]]:
    """Fetch summary rows for date range from fct_ga4_validation_summary_daily."""
    client = get_client()
    query = f"""
    SELECT date,
           session_start_overall_score, page_view_overall_score, view_item_overall_score,
           add_to_cart_overall_score, begin_checkout_overall_score, purchase_overall_score
    FROM `{TABLE_SUMMARY}`
    WHERE date >= @date_from AND date <= @date_to
    ORDER BY date
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date_from", "DATE", date_from),
            bigquery.ScalarQueryParameter("date_to", "DATE", date_to),
        ]
    )
    result = client.query(query, job_config=job_config)
    rows = []
    for row in result:
        d = {"date": str(row.date)}
        for ev in EVENTS:
            d[f"{ev}_overall_score"] = float(row.get(f"{ev}_overall_score") or 0)
        rows.append(d)
    return rows


def query_summary_latest() -> dict[str, Any] | None:
    """Fetch latest single row from fct_ga4_validation_summary_daily."""
    client = get_client()
    query = f"""
    SELECT *
    FROM `{TABLE_SUMMARY}`
    ORDER BY date DESC
    LIMIT 1
    """
    result = client.query(query)
    rows = list(result)
    if not rows:
        return None
    row = rows[0]
    d = {"date": str(row.date)}
    for ev in EVENTS:
        d[f"{ev}_overall_score"] = float(row.get(f"{ev}_overall_score") or 0)
    return d


def query_event_quality_range(date_from: str, date_to: str) -> list[dict[str, Any]]:
    """Fetch average parameter quality per (date, event) from fct_ga4_validation.
    Returns rows in SummaryRow format: { date, {event}_overall_score, ... }.
    Matches drill-down 'Average Parameter Quality' = mean of % with parameter across params."""
    client = get_client()
    query = f"""
    SELECT date, event_name,
      AVG(100.0 * (event_count - invalid_count) / NULLIF(event_count, 0)) AS avg_param_quality
    FROM `{TABLE_VALIDATION}`
    WHERE date >= @date_from AND date <= @date_to
    GROUP BY date, event_name
    ORDER BY date, event_name
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date_from", "DATE", date_from),
            bigquery.ScalarQueryParameter("date_to", "DATE", date_to),
        ]
    )
    result = client.query(query, job_config=job_config)
    # Build date -> { event -> avg_param_quality }
    by_date: dict[str, dict[str, float]] = {}
    for row in result:
        dt = str(row.date)
        ev = str(row.event_name or "")
        val = float(row.avg_param_quality or 0)
        if dt not in by_date:
            by_date[dt] = {}
        by_date[dt][ev] = val
    # Reshape into SummaryRow format
    rows = []
    for dt in sorted(by_date.keys()):
        d: dict[str, Any] = {"date": dt}
        for ev in EVENTS:
            d[f"{ev}_overall_score"] = by_date[dt].get(ev, 0)
        rows.append(d)
    return rows


def query_drilldown(date: str, event_name: str) -> list[dict[str, Any]]:
    """Fetch drill-down rows for one event from fct_ga4_validation."""
    _validate_drilldown_inputs(date, event_name)
    normalized_event = _normalize_event_name(event_name)
    client = get_client()
    query = f"""
    SELECT date, event_name, param_name, qa_status, event_count, invalid_count
    FROM `{TABLE_VALIDATION}`
    WHERE date = @date AND event_name = @event_name
    ORDER BY param_name
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date", "DATE", date),
            bigquery.ScalarQueryParameter("event_name", "STRING", normalized_event),
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


def query_top_missing_params(date: str, limit: int = 3) -> list[dict[str, Any]]:
    """Fetch top N (event_name, param_name) pairs with highest % missing for a date.
    Returns rows with pct_missing = 100 * invalid_count / event_count, ordered descending."""
    limit = max(1, min(100, limit))
    client = get_client()
    query = f"""
    SELECT date, event_name, param_name, event_count, invalid_count,
           100.0 * invalid_count / NULLIF(event_count, 0) AS pct_missing
    FROM `{TABLE_VALIDATION}`
    WHERE date = @date
    ORDER BY pct_missing DESC
    LIMIT {limit}
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("date", "DATE", date)]
    )
    result = client.query(query, job_config=job_config)
    return [
        {
            "date": str(row.date),
            "event_name": str(row.event_name or ""),
            "param_name": str(row.param_name or ""),
            "event_count": int(row.event_count or 0),
            "invalid_count": int(row.invalid_count or 0),
            "pct_missing": round(float(row.pct_missing or 0), 1),
        }
        for row in result
    ]


def query_param_detail(event_name: str, param_name: str, limit: int = 20) -> list[dict[str, Any]]:
    """Fetch most recent actual_value rows for one (event_name, param_name) from int_moomin__event_param_status."""
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
    limit = max(1, min(100, limit))
    client = get_client()
    query = f"""
    SELECT date, event_timestamp, event_name, param_name, qa_status, actual_value
    FROM `{TABLE_INT_EVENT_PARAM_STATUS}`
    WHERE event_name = @event_name AND param_name = @param_name
    ORDER BY date DESC, event_timestamp DESC
    LIMIT @limit
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("event_name", "STRING", normalized_event),
            bigquery.ScalarQueryParameter("param_name", "STRING", param_name),
            bigquery.ScalarQueryParameter("limit", "INT64", limit),
        ]
    )
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


def query_issues(date: str) -> list[dict[str, Any]]:
    """Fetch non-VALID rows for a date (alerts view)."""
    client = get_client()
    query = f"""
    SELECT date, event_name, param_name, qa_status, event_count, invalid_count
    FROM `{TABLE_VALIDATION}`
    WHERE date = @date AND qa_status != 'VALID'
    ORDER BY event_name, param_name
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("date", "DATE", date)]
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
