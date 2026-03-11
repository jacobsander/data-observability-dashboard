"""Marketing data quality API routes (BigQuery stg_marketing_audit__unpacked)."""

from datetime import date, timedelta
from flask import Blueprint, jsonify, request

from backend.marketing_queries import (
    MARKETING_PLATFORMS,
    query_marketing_overview,
    query_marketing_platform_detail,
)

bp = Blueprint("marketing", __name__, url_prefix="/api/marketing")


def _parse_date_range():
    """Parse from/to or days+to into (date_from, date_to)."""
    from_str = request.args.get("from")
    to_str = request.args.get("to")

    if from_str and to_str:
        try:
            date_from = date.fromisoformat(from_str).isoformat()
            date_to = date.fromisoformat(to_str).isoformat()
            if date_from > date_to:
                date_from, date_to = date_to, date_from
            return date_from, date_to
        except ValueError:
            pass

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
    return start.isoformat(), end.isoformat()


@bp.route("/overview", methods=["GET"])
def overview():
    """GET /api/marketing/overview?from=YYYY-MM-DD&to=YYYY-MM-DD or days=7&to=...
    Returns: payloadHealthScore, platforms, volumeTrend, errorDistribution.
    """
    try:
        date_from, date_to = _parse_date_range()
        result = query_marketing_overview(date_from, date_to)
        response = jsonify(result)
        response.headers["Cache-Control"] = "public, max-age=300"
        return response
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500


@bp.route("/platform/<platform_id>", methods=["GET"])
def platform_detail(platform_id: str):
    """GET /api/marketing/platform/<platform_id>?from=...&to=... or days=7&to=...
    Returns: platformId, name, matchRate, totalEvents, failedEvents, parameters, errorRateTrend.
    """
    if platform_id not in MARKETING_PLATFORMS:
        return jsonify({"error": f"Unknown platform: {platform_id}"}), 404
    try:
        date_from, date_to = _parse_date_range()
        result = query_marketing_platform_detail(platform_id, date_from, date_to)
        if result is None:
            return jsonify({"error": f"Platform not found: {platform_id}"}), 404
        response = jsonify(result)
        response.headers["Cache-Control"] = "public, max-age=300"
        return response
    except Exception as e:
        return jsonify({"error": f"BigQuery error: {str(e)}"}), 500
