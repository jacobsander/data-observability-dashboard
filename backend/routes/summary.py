"""Summary API routes."""

from datetime import date, timedelta
from flask import Blueprint, jsonify, request

from backend.bigquery_client import query_event_quality_range, query_summary_latest, query_summary_range

bp = Blueprint("summary", __name__, url_prefix="/api")


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
    """GET /api/dashboard?days=7&to=YYYY-MM-DD - combined latest + trend in one response."""
    days = request.args.get("days", "7", type=int)
    days = max(1, min(30, days))

    end_str = request.args.get("to")
    if end_str:
        try:
            end = date.fromisoformat(end_str)
        except ValueError:
            end = date.today()
    else:
        end = date.today()
    start = end - timedelta(days=days - 1)
    date_from = start.isoformat()
    date_to = end.isoformat()

    try:
        rows = query_event_quality_range(date_from, date_to)
        latest = rows[-1] if rows else None
        payload = {"latest": latest, "trend": rows}
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
