"""Vercel serverless: GET /api/param-detail?event_name=...&param_name=...&limit=20&from=...&to=...&ga4_property=..."""

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from backend.bigquery_client import _parse_ga4_properties, query_param_detail


def _send_json(self, status: int, data) -> None:
    body = json.dumps(data).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    if status == 200:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "public, max-age=60")
    self.end_headers()
    self.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            event_name = (params.get("event_name") or [None])[0]
            param_name = (params.get("param_name") or [None])[0]
            limit_arg = (params.get("limit") or ["20"])[0]
            date_from = (params.get("from") or [None])[0]
            date_to = (params.get("to") or [None])[0]
            ga4_property_raw = (params.get("ga4_property") or [None])[0]

            if not event_name:
                _send_json(self, 400, {"error": "Missing required parameter: event_name"})
                return
            if not param_name:
                _send_json(self, 400, {"error": "Missing required parameter: param_name"})
                return

            try:
                limit = int(limit_arg or "20")
            except ValueError:
                limit = 20

            rows = query_param_detail(
                event_name,
                param_name,
                limit=limit,
                date_from=date_from or None,
                date_to=date_to or None,
                ga4_properties=_parse_ga4_properties(ga4_property_raw),
            )
            _send_json(self, 200, rows)
        except ValueError as e:
            _send_json(self, 400, {"error": str(e)})
        except Exception as e:
            _send_json(self, 500, {"error": f"BigQuery error: {str(e)}"})
