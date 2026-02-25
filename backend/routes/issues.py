"""Issues API routes."""

from datetime import date
from flask import Blueprint, jsonify, request

from backend.bigquery_client import query_issues

bp = Blueprint("issues", __name__, url_prefix="/api")


@bp.route("/issues", methods=["GET"])
def issues():
    """GET /api/issues?date=YYYY-MM-DD - non-VALID rows for alerts."""
    date_param = request.args.get("date")

    if not date_param:
        date_param = date.today().isoformat()

    try:
        rows = query_issues(date_param)
        return jsonify(rows)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500
