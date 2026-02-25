"""Drilldown API routes."""

from flask import Blueprint, jsonify, request

from backend.bigquery_client import query_drilldown

bp = Blueprint("drilldown", __name__, url_prefix="/api")


@bp.route("/drilldown", methods=["GET"])
def drilldown():
    """GET /api/drilldown?date=YYYY-MM-DD&event_name=session_start - params for selected event."""
    date_param = request.args.get("date")
    event_name = request.args.get("event_name")

    if not date_param:
        return jsonify({"error": "Missing required parameter: date"}), 400
    if not event_name:
        return jsonify({"error": "Missing required parameter: event_name"}), 400

    try:
        rows = query_drilldown(date_param, event_name)
        return jsonify(rows)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500
