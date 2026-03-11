"""Vercel serverless: GET /api/marketing/platform/:platformId?from=...&to=... or days=7&to=..."""

import json
import os
import sys
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Ensure project root is on path so backend can be imported
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if _root not in sys.path:
    sys.path.insert(0, _root)

from backend.marketing_queries import (
    MARKETING_PLATFORMS,
    query_marketing_platform_detail,
)


def _parse_date_range(params: dict[str, str]) -> tuple[str, str]:
    from_str = params.get("from", "")
    to_str = params.get("to", "")
    if from_str and to_str:
        try:
            start = date.fromisoformat(from_str)
            end = date.fromisoformat(to_str)
            if start > end:
                start, end = end, start
            return start.isoformat(), end.isoformat()
        except ValueError:
            pass
    days = max(1, min(90, int(params.get("days") or "7")))
    end_str = params.get("to", "")
    if end_str:
        try:
            end = date.fromisoformat(end_str)
        except ValueError:
            end = date.today()
    else:
        end = date.today()
    start = end - timedelta(days=days - 1)
    return start.isoformat(), end.isoformat()


def _platform_id_from_path(path: str) -> str | None:
    """Extract platformId from path like /api/marketing/platform/meta-capi or ...?query."""
    path_only = path.split("?")[0].rstrip("/")
    parts = path_only.split("/")
    if len(parts) >= 1 and parts[-1]:
        return parts[-1]
    return None


def _send_json(self: BaseHTTPRequestHandler, status: int, data: dict) -> None:
    body = json.dumps(data).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    self.send_header("Access-Control-Allow-Origin", "*")
    if status == 200:
        self.send_header("Cache-Control", "public, max-age=300")
    self.end_headers()
    self.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            platform_id = _platform_id_from_path(self.path)
            if not platform_id or platform_id not in MARKETING_PLATFORMS:
                _send_json(self, 404, {"error": f"Unknown platform: {platform_id or ''}"})
                return
            parsed = urlparse(self.path)
            params = {k: (v[0] if v else "") for k, v in parse_qs(parsed.query).items()}
            date_from, date_to = _parse_date_range(params)
            result = query_marketing_platform_detail(platform_id, date_from, date_to)
            if result is None:
                _send_json(self, 404, {"error": f"Platform not found: {platform_id}"})
                return
            _send_json(self, 200, result)
        except Exception as e:
            _send_json(self, 500, {"error": f"BigQuery error: {str(e)}"})
