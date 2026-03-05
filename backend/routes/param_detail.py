"""Param detail API routes."""

from flask import Blueprint, jsonify, request

from backend.bigquery_client import _parse_ga4_properties, query_param_detail

bp = Blueprint("param_detail", __name__, url_prefix="/api")


@bp.route("/param-detail", methods=["GET"])
def param_detail():
    """GET /api/param-detail?event_name=...&param_name=...&limit=20&from=...&to=...&ga4_property=... - recent actual_value rows for a param."""
    event_name = request.args.get("event_name")
    param_name = request.args.get("param_name")
    limit_arg = request.args.get("limit", "20")
    date_from = request.args.get("from") or None
    date_to = request.args.get("to") or None
    ga4_properties = _parse_ga4_properties(request.args.get("ga4_property"))

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
        rows = query_param_detail(
            event_name,
            param_name,
            limit=limit,
            date_from=date_from,
            date_to=date_to,
            ga4_properties=ga4_properties,
        )
        return jsonify(rows)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500
