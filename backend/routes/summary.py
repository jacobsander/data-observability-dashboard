"""Summary API routes."""

from datetime import date, timedelta
from flask import Blueprint, jsonify, request

from backend.bigquery_client import (
    EVENTS,
    query_summary_latest,
    query_summary_range,
)

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
