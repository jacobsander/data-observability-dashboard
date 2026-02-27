"""Summary API routes."""

from datetime import date, timedelta
from flask import Blueprint, jsonify, request

from backend.bigquery_client import (
    EVENTS,
    query_event_quality_range,
    query_summary_latest,
    query_summary_range,
)

bp = Blueprint("summary", __name__, url_prefix="/api")


def _latest_from_range_average(rows: list, date_to: str) -> dict | None:
    """Build synthetic 'latest' row as average of daily scores across the date range."""
    if not rows:
        return None
    synthetic = {"date": date_to}
    for ev in EVENTS:
        key = f"{ev}_overall_score"
        scores = [r.get(key, 0) for r in rows]
        synthetic[key] = round(sum(scores) / len(scores) * 10) / 10 if scores else 0
    return synthetic


@bp.route("/summary", methods=["GET"])
def summary():
    """GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD - time series for overview."""
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    if not date_from or not date_to:
        # Default: last 7 days
        end = date.today()
        start = end - timedelta(days=6)
        date_from = start.isoformat()
        date_to = end.isoformat()

    try:
        rows = query_summary_range(date_from, date_to)
        return jsonify(rows)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500


@bp.route("/dashboard", methods=["GET"])
def dashboard():
    """GET /api/dashboard - combined latest + trend. Supports:
    - from=YYYY-MM-DD&to=YYYY-MM-DD (explicit date range)
    - days=7&to=YYYY-MM-DD (last N days ending at to, default last 7 days)
    """
    from_str = request.args.get("from")
    to_str = request.args.get("to")

    if from_str and to_str:
        try:
            date_from = date.fromisoformat(from_str).isoformat()
            date_to = date.fromisoformat(to_str).isoformat()
            if date_from > date_to:
                date_from, date_to = date_to, date_from
        except ValueError:
            end = date.today()
            start = end - timedelta(days=6)
            date_from = start.isoformat()
            date_to = end.isoformat()
    else:
        days = request.args.get("days", "7", type=int)
        days = max(1, min(90, days))

        if to_str:
            try:
                end = date.fromisoformat(to_str)
            except ValueError:
                end = date.today()
        else:
            end = date.today()
        start = end - timedelta(days=days - 1)
        date_from = start.isoformat()
        date_to = end.isoformat()

    try:
        rows = query_event_quality_range(date_from, date_to)
        latest = _latest_from_range_average(rows, date_to)

        # Previous period: same length, immediately before current range
        start_d = date.fromisoformat(date_from)
        end_d = date.fromisoformat(date_to)
        num_days = (end_d - start_d).days + 1
        prev_end_d = start_d - timedelta(days=1)
        prev_start_d = prev_end_d - timedelta(days=num_days - 1)
        prev_from = prev_start_d.isoformat()
        prev_to = prev_end_d.isoformat()
        prev_rows = query_event_quality_range(prev_from, prev_to)
        if not prev_rows:
            prev_rows = query_summary_range(prev_from, prev_to)
        previous = _latest_from_range_average(prev_rows, prev_to)

        payload = {"latest": latest, "trend": rows, "previous": previous}
        response = jsonify(payload)
        response.headers["Cache-Control"] = "public, max-age=300"
        return response
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500


@bp.route("/summary/latest", methods=["GET"])
def summary_latest():
    """GET /api/summary/latest - single row, latest date."""
    try:
        row = query_summary_latest()
        if row is None:
            return jsonify({"error": "No data found"}), 404
        return jsonify(row)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500
