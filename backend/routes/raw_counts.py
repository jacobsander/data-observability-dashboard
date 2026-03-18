"""Raw GA4 volume API routes."""

from flask import Blueprint, jsonify, request

from backend.bigquery_client import _parse_ga4_properties, query_raw_event_counts

bp = Blueprint("raw_counts", __name__, url_prefix="/api")


@bp.route("/raw-event-count", methods=["GET"])
def raw_event_count():
    """GET /api/raw-event-count?event_name=page_view&from=YYYY-MM-DD&to=YYYY-MM-DD&ga4_property=..."""
    event_name = request.args.get("event_name")
    date_from = request.args.get("from")
    date_to = request.args.get("to")
    ga4_properties = _parse_ga4_properties(request.args.get("ga4_property"))

    if not event_name:
        return jsonify({"error": "Missing required parameter: event_name"}), 400
    if not date_from or not date_to:
        return jsonify({"error": "Missing required parameters: from, to"}), 400

    try:
        counts = query_raw_event_counts(date_from, date_to, event_name, ga4_properties)
        return jsonify({"from": date_from, "to": date_to, "event_name": event_name, "counts": counts})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500

