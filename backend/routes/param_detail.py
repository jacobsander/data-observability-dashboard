"""Param detail API routes."""

from flask import Blueprint, jsonify, request

from backend.bigquery_client import query_param_detail

bp = Blueprint("param_detail", __name__, url_prefix="/api")


@bp.route("/param-detail", methods=["GET"])
def param_detail():
    """GET /api/param-detail?event_name=...&param_name=...&limit=20 - recent actual_value rows for a param."""
    event_name = request.args.get("event_name")
    param_name = request.args.get("param_name")
    limit_arg = request.args.get("limit", "20")

    if not event_name:
        return jsonify({"error": "Missing required parameter: event_name"}), 400
    if not param_name:
        return jsonify({"error": "Missing required parameter: param_name"}), 400

    try:
        limit = int(limit_arg)
    except ValueError:
        limit = 20
    limit = max(1, min(100, limit))

    try:
        rows = query_param_detail(event_name, param_name, limit=limit)
        return jsonify(rows)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500
