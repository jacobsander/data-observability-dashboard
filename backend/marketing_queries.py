"""BigQuery query helpers for marketing audit data (stg_marketing_audit__unpacked)."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from google.cloud import bigquery

from backend.bigquery_client import DATASET, PROJECT_ID, get_client

TABLE_MARKETING_AUDIT = f"{PROJECT_ID}.{DATASET}.stg_marketing_audit__unpacked"

# Primary date: ingested_date (DATE) so UI date filters align with ingestion.
# Fallback: derive date from event_time (Unix seconds) or conversion_date_time (string YYYY-MM-DD...).
EVENT_DATE_EXPR = """COALESCE(
  ingested_date,
  DATE(TIMESTAMP_SECONDS(SAFE_CAST(event_time AS INT64))),
  SAFE.PARSE_DATE('%Y-%m-%d', SUBSTR(COALESCE(conversion_date_time, ''), 1, 10))
)"""

# Normalize platform for filtering (BQ may have 'Google Ads', 'Meta CAPI', 'google-ads', etc.)
PLATFORM_NORMALIZED = "LOWER(TRIM(COALESCE(platform, '')))"
# Accepted normalized values per platform (after LOWER(TRIM(platform)))
# BQ may store "google" for Google Ads rows.
PLATFORM_VARIANTS = {
    "meta-capi": ("meta-capi", "meta_capi", "meta capi"),
    "google-ads": ("google-ads", "google_ads", "google ads", "google"),
}

MARKETING_PLATFORMS = ["meta-capi", "google-ads"]

# (bq_column, param_key, category, description). BQ column presence = non-null and non-empty for strings.
META_CAPI_PARAMS = [
    ("event_id", "event_id", "critical", "UUID/ULID for Pixel/CAPI deduplication"),
    ("event_name", "event_name", "critical", "Must match Meta's standard naming"),
    ("event_time", "event_time", "critical", "Unix timestamp, loses power after 1 hour"),
    ("action_source", "action_source", "critical", "Where event occurred (website/app/store)"),
    ("email", "user_data.em", "warning", "Hashed Email, highest-priority matching key"),
    ("phone", "user_data.ph", "warning", "Hashed Phone, high-priority identifier"),
    ("fbc", "user_data.fbc", "warning", "Click ID from fbclid, Meta ad clicks only"),
    ("fbp", "user_data.fbp", "warning", "Browser ID, unique browser identifier"),
    ("client_ip_address", "user_data.client_ip_address", "warning", "User differentiation in server-to-server"),
    ("client_user_agent", "user_data.client_user_agent", "warning", "User differentiation in server-to-server"),
    ("custom_data_value", "custom_data.value", "optional", "Required for Purchase events ROAS calculation"),
    ("custom_data_currency", "custom_data.currency", "optional", "Required for Purchase events ROAS"),
    ("custom_data_content_ids", "custom_data.content_ids", "optional", "Required for Dynamic Product Ads"),
    ("custom_data_content_type", "custom_data.content_type", "optional", "Required for Dynamic Product Ads"),
    ("first_name", "user_data.fn", "optional", "First name, optional matching"),
    ("last_name", "user_data.ln", "optional", "Last name, optional matching"),
    ("city", "user_data.ct", "optional", "City, optional matching"),
    ("state", "user_data.st", "optional", "State, optional matching"),
    ("zipcode", "user_data.zp", "optional", "Zipcode, optional matching"),
    ("country", "user_data.country", "optional", "Country, optional matching"),
]

# FLOAT columns: presence = IS NOT NULL
META_CAPI_FLOAT_COLUMNS = {"custom_data_value"}

GOOGLE_ADS_PARAMS = [
    ("conversion_action", "conversion_action", "critical", "Conversion action ID"),
    ("gclid", "gclid", "critical", "Google Click ID for attribution"),
    ("conversion_date_time", "conversion_date_time", "critical", "Conversion timestamp"),
    ("conversion_value", "conversion_value", "warning", "Value for ROAS"),
    ("currency_code", "currency_code", "warning", "Currency for conversion value"),
    ("order_id", "order_id", "optional", "Deduplication and reporting"),
    ("user_agent", "user_agent", "optional", "User differentiation"),
    ("google_email", "email", "optional", "Hashed email for matching"),
]

GOOGLE_ADS_FLOAT_COLUMNS = {"conversion_value"}


def _present_expr(column: str, is_float: bool) -> str:
    """SQL expression: 1 if param is present, 0 otherwise."""
    if is_float:
        return f"CASE WHEN {column} IS NOT NULL THEN 1 ELSE 0 END"
    return f"CASE WHEN NULLIF(TRIM(COALESCE(CAST({column} AS STRING), '')), '') IS NOT NULL THEN 1 ELSE 0 END"


def _critical_cols_present(platform: str) -> str:
    """SQL expression: 1 if all critical params for platform are present."""
    if platform == "meta-capi":
        cols = [c[0] for c in META_CAPI_PARAMS if c[2] == "critical"]
        floats = META_CAPI_FLOAT_COLUMNS
    else:
        cols = [c[0] for c in GOOGLE_ADS_PARAMS if c[2] == "critical"]
        floats = GOOGLE_ADS_FLOAT_COLUMNS
    parts = [_present_expr(c, c in floats) for c in cols]
    if not parts:
        return "1"
    return " * ".join(f"({p})" for p in parts)


def _platform_where(platform: str) -> str:
    """WHERE fragment for platform. Google Ads = platform is 'google' (or 'google-ads' etc). Meta = 'meta-capi' etc."""
    variants = PLATFORM_VARIANTS.get(platform)
    if variants:
        conditions = " OR ".join(f"{PLATFORM_NORMALIZED} = {repr(v)}" for v in variants)
        return f"({conditions})"
    return f"{PLATFORM_NORMALIZED} = @platform"


def _base_from_where(date_from: str, date_to: str, platform: str | None = None) -> str:
    """Returns FROM + WHERE fragment for date range and optional platform."""
    platform_filter = f" AND ({_platform_where(platform)})" if platform else ""
    # Include rows that have a derivable date (event_time for Meta, or conversion_date_time for Google Ads).
    return f"""
    FROM `{TABLE_MARKETING_AUDIT}`
    WHERE {EVENT_DATE_EXPR} BETWEEN @date_from AND @date_to
      AND ({EVENT_DATE_EXPR} IS NOT NULL)
      {platform_filter}
    """


def query_marketing_overview(
    date_from: str, date_to: str
) -> dict[str, Any]:
    """
    Fetch marketing overview: platforms (total, failed, match_rate, trend),
    volume trend (daily total + error events), error distribution (critical/warning/optional counts).
    """
    client = get_client()
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date_from", "DATE", date_from),
            bigquery.ScalarQueryParameter("date_to", "DATE", date_to),
        ]
    )

    # Per-platform: total, failed (missing any critical), match_rate; then previous period for trend
    platforms_result: list[dict[str, Any]] = []
    for platform in MARKETING_PLATFORMS:
        plat_name = "Meta CAPI" if platform == "meta-capi" else "Google Ads"
        from_clause = _base_from_where(date_from, date_to, platform)
        all_present = _critical_cols_present(platform)
        query = f"""
        WITH base AS (
          SELECT
            {EVENT_DATE_EXPR} AS event_date,
            {all_present} AS all_critical_present
          {from_clause}
        ),
        agg AS (
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN all_critical_present = 0 THEN 1 ELSE 0 END) AS failed
          FROM base
        )
        SELECT total, failed FROM agg
        """
        rows = list(client.query(query, job_config=job_config))
        total = int(rows[0].total or 0) if rows else 0
        failed = int(rows[0].failed or 0) if rows else 0
        match_rate = round(100.0 * (total - failed) / total, 1) if total else 0.0

        # Previous period for trend (same length, immediately before date_from)
        start_d = datetime.strptime(date_from, "%Y-%m-%d").date()
        end_d = datetime.strptime(date_to, "%Y-%m-%d").date()
        num_days = (end_d - start_d).days + 1
        prev_end_d = start_d - timedelta(days=1)
        prev_start_d = prev_end_d - timedelta(days=num_days - 1)
        prev_from = prev_start_d.isoformat()
        prev_to = prev_end_d.isoformat()
        prev_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("date_from", "DATE", prev_from),
                bigquery.ScalarQueryParameter("date_to", "DATE", prev_to),
            ]
        )
        prev_from_clause = _base_from_where(prev_from, prev_to, platform)
        prev_query = f"""
        WITH base AS (
          SELECT {all_present} AS all_critical_present
          {prev_from_clause}
        )
        SELECT COUNT(*) AS total, SUM(CASE WHEN all_critical_present = 0 THEN 1 ELSE 0 END) AS failed
        FROM base
        """
        prev_rows = list(client.query(prev_query, job_config=prev_config))
        prev_total = int(prev_rows[0].total or 0) if prev_rows else 0
        prev_failed = int(prev_rows[0].failed or 0) if prev_rows else 0
        prev_match = 100.0 * (prev_total - prev_failed) / prev_total if prev_total else 0.0
        trend = round(match_rate - prev_match, 1)

        platforms_result.append({
            "platformId": platform,
            "name": plat_name,
            "matchRate": match_rate,
            "totalEvents": total,
            "failedEvents": failed,
            "trend": trend,
        })

    payload_health = (
        round(sum(p["matchRate"] for p in platforms_result) / len(platforms_result))
        if platforms_result else 0
    )

    # Volume trend: daily total and error events (combined across platforms)
    meta_cond = _platform_where("meta-capi")
    goog_cond = _platform_where("google-ads")
    vol_query = f"""
    SELECT
      {EVENT_DATE_EXPR} AS event_date,
      COUNT(*) AS total_events,
      SUM(CASE
        WHEN ({meta_cond}) AND ({_critical_cols_present('meta-capi')}) = 0 THEN 1
        WHEN ({goog_cond}) AND ({_critical_cols_present('google-ads')}) = 0 THEN 1
        ELSE 0
      END) AS error_events
    FROM `{TABLE_MARKETING_AUDIT}`
    WHERE {EVENT_DATE_EXPR} BETWEEN @date_from AND @date_to
      AND ({EVENT_DATE_EXPR} IS NOT NULL)
    GROUP BY event_date
    ORDER BY event_date
    """
    vol_rows = list(client.query(vol_query, job_config=job_config))
    volume_trend = [
        {
            "date": str(row.event_date)[5:] if row.event_date else "",  # MM-DD
            "totalEvents": int(row.total_events or 0),
            "errorEvents": int(row.error_events or 0),
            "id": f"vol-{i}-{row.event_date}",
        }
        for i, row in enumerate(vol_rows)
    ]

    # Error distribution: count events missing >=1 critical, >=1 warning, >=1 optional (overlapping)
    # Per row, only compute missing flags for that row's platform (Meta vs Google).
    meta_crit = [c[0] for c in META_CAPI_PARAMS if c[2] == "critical"]
    meta_warn = [c[0] for c in META_CAPI_PARAMS if c[2] == "warning"]
    meta_opt = [c[0] for c in META_CAPI_PARAMS if c[2] == "optional"]
    goog_crit = [c[0] for c in GOOGLE_ADS_PARAMS if c[2] == "critical"]
    goog_warn = [c[0] for c in GOOGLE_ADS_PARAMS if c[2] == "warning"]
    goog_opt = [c[0] for c in GOOGLE_ADS_PARAMS if c[2] == "optional"]

    def missing_expr(cols: list[str], floats: set[str]) -> str:
        parts = [f"({_present_expr(c, c in floats)} = 0)" for c in cols]
        if not parts:
            return "0"
        return f"CASE WHEN {' OR '.join(parts)} THEN 1 ELSE 0 END"

    meta_floats = META_CAPI_FLOAT_COLUMNS
    goog_floats = GOOGLE_ADS_FLOAT_COLUMNS
    meta_miss_c = missing_expr(meta_crit, meta_floats)
    meta_miss_w = missing_expr(meta_warn, meta_floats)
    meta_miss_o = missing_expr(meta_opt, meta_floats)
    goog_miss_c = missing_expr(goog_crit, goog_floats)
    goog_miss_w = missing_expr(goog_warn, goog_floats)
    goog_miss_o = missing_expr(goog_opt, goog_floats)
    meta_in = ", ".join(repr(v) for v in PLATFORM_VARIANTS["meta-capi"])
    err_query = f"""
    WITH base AS (
      SELECT
        {PLATFORM_NORMALIZED} AS plat,
        CASE WHEN {_platform_where("meta-capi")} THEN {meta_miss_c} ELSE {goog_miss_c} END AS miss_crit,
        CASE WHEN {_platform_where("meta-capi")} THEN {meta_miss_w} ELSE {goog_miss_w} END AS miss_warn,
        CASE WHEN {_platform_where("meta-capi")} THEN {meta_miss_o} ELSE {goog_miss_o} END AS miss_opt
      FROM `{TABLE_MARKETING_AUDIT}`
      WHERE {EVENT_DATE_EXPR} BETWEEN @date_from AND @date_to
        AND ({EVENT_DATE_EXPR} IS NOT NULL)
    )
    SELECT
      SUM(miss_crit) AS critical_count,
      SUM(miss_warn) AS warning_count,
      SUM(miss_opt) AS optional_count
    FROM base
    """
    err_rows = list(client.query(err_query, job_config=job_config))
    er = err_rows[0] if err_rows else None
    error_distribution = [
        {"category": "critical", "count": int(er.critical_count or 0) if er else 0, "name": "Critical"},
        {"category": "warning", "count": int(er.warning_count or 0) if er else 0, "name": "Warning"},
        {"category": "optional", "count": int(er.optional_count or 0) if er else 0, "name": "Optional"},
    ]

    return {
        "payloadHealthScore": payload_health,
        "platforms": platforms_result,
        "volumeTrend": volume_trend,
        "errorDistribution": error_distribution,
    }


def query_marketing_platform_detail(
    platform_id: str, date_from: str, date_to: str
) -> dict[str, Any] | None:
    """
    Fetch platform detail: match rate, total/failed, parameters (with/missing/percentage), error rate trend.
    Returns None for unknown platform_id.
    """
    if platform_id not in MARKETING_PLATFORMS:
        return None

    client = get_client()
    name = "Meta CAPI" if platform_id == "meta-capi" else "Google Ads"
    params_def = META_CAPI_PARAMS if platform_id == "meta-capi" else GOOGLE_ADS_PARAMS
    float_cols = META_CAPI_FLOAT_COLUMNS if platform_id == "meta-capi" else GOOGLE_ADS_FLOAT_COLUMNS

    from_clause = _base_from_where(date_from, date_to, platform_id)
    all_present = _critical_cols_present(platform_id)

    # Totals and failed
    tot_query = f"""
    WITH base AS (SELECT {all_present} AS all_critical_present {from_clause})
    SELECT COUNT(*) AS total, SUM(CASE WHEN all_critical_present = 0 THEN 1 ELSE 0 END) AS failed
    FROM base
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("date_from", "DATE", date_from),
            bigquery.ScalarQueryParameter("date_to", "DATE", date_to),
        ]
    )
    tot_rows = list(client.query(tot_query, job_config=job_config))
    total = int(tot_rows[0].total or 0) if tot_rows else 0
    failed = int(tot_rows[0].failed or 0) if tot_rows else 0
    match_rate = round(100.0 * (total - failed) / total, 1) if total else 0.0

    # Per-parameter counts: with_param for each column
    select_parts = [
        f"SUM({_present_expr(bq_col, bq_col in float_cols)}) AS {bq_col}_with"
        for bq_col, _, _, _ in params_def
    ]
    param_query = f"""
    SELECT {", ".join(select_parts)}
    {from_clause}
    """
    param_rows = list(client.query(param_query, job_config=job_config))
    row0 = param_rows[0] if param_rows else None
    parameters = []
    for bq_col, param_key, category, description in params_def:
        with_val = int(getattr(row0, f"{bq_col}_with", 0) or 0) if row0 else 0
        missing = total - with_val
        pct = round(100.0 * with_val / total, 1) if total else 0.0
        parameters.append({
            "paramKey": param_key,
            "category": category,
            "eventsWithParam": with_val,
            "eventsMissing": missing,
            "percentage": pct,
            "description": description,
        })

    # Error rate trend: per day, pct of events missing >=1 critical, >=1 warning, >=1 optional
    crit_cols = [c[0] for c in params_def if c[2] == "critical"]
    warn_cols = [c[0] for c in params_def if c[2] == "warning"]
    opt_cols = [c[0] for c in params_def if c[2] == "optional"]
    # "all present" = product of present (1/0). If no cols, use 1 so "missing" = 0.
    all_present_crit = " * ".join(f"({_present_expr(c, c in float_cols)})" for c in crit_cols) or "1"
    all_present_warn = " * ".join(f"({_present_expr(c, c in float_cols)})" for c in warn_cols) or "1"
    all_present_opt = " * ".join(f"({_present_expr(c, c in float_cols)})" for c in opt_cols) or "1"
    trend_query = f"""
    WITH base AS (
      SELECT
        {EVENT_DATE_EXPR} AS event_date,
        CASE WHEN ({all_present_crit}) = 0 THEN 1 ELSE 0 END AS missing_crit,
        CASE WHEN ({all_present_warn}) = 0 THEN 1 ELSE 0 END AS missing_warn,
        CASE WHEN ({all_present_opt}) = 0 THEN 1 ELSE 0 END AS missing_opt
      {from_clause}
    )
    SELECT
      event_date,
      COUNT(*) AS total,
      SUM(missing_crit) AS miss_crit,
      SUM(missing_warn) AS miss_warn,
      SUM(missing_opt) AS miss_opt
    FROM base
    GROUP BY event_date
    ORDER BY event_date
    """
    trend_rows = list(client.query(trend_query, job_config=job_config))
    error_rate_trend = []
    for i, row in enumerate(trend_rows):
        t = int(row.total or 0) or 1
        error_rate_trend.append({
            "date": str(row.event_date)[5:] if row.event_date else "",
            "id": f"err-{i}-{row.event_date}",
            "criticalErrorPct": round(100.0 * (int(row.miss_crit or 0) or 0) / t, 1),
            "warningErrorPct": round(100.0 * (int(row.miss_warn or 0) or 0) / t, 1),
            "optionalErrorPct": round(100.0 * (int(row.miss_opt or 0) or 0) / t, 1),
        })

    return {
        "platformId": platform_id,
        "name": name,
        "matchRate": match_rate,
        "totalEvents": total,
        "failedEvents": failed,
        "parameters": parameters,
        "errorRateTrend": error_rate_trend,
    }
