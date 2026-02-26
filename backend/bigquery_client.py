"""BigQuery client and query helpers for GA4 validation data."""

import os
from typing import Any

from google.cloud import bigquery
from google.oauth2 import service_account


PROJECT_ID = os.environ.get("BIGQUERY_PROJECT", "mimetic-perigee-290610")
DATASET = os.environ.get("BIGQUERY_DATASET", "obs_layer_poc_moomin")
LOCATION = "EU"
TABLE_SUMMARY = f"{PROJECT_ID}.{DATASET}.fct_ga4_validation_summary_daily"
TABLE_VALIDATION = f"{PROJECT_ID}.{DATASET}.fct_ga4_validation"

EVENTS = [
    "session_start",
    "page_view",
    "view_item",
    "add_to_cart",
    "begin_checkout",
    "purchase",
]


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


def query_drilldown(date: str, event_name: str) -> list[dict[str, Any]]:
    """Fetch drill-down rows for one event from fct_ga4_validation."""
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
            bigquery.ScalarQueryParameter("event_name", "STRING", event_name),
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
