"""Vercel serverless: GET /api/drilldown?date=...&event_name=..."""

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from lib.bigquery_queries import query_drilldown


def _send_json(self, status: int, data: dict) -> None:
    body = json.dumps(data).encode("utf-8")
    self.send_response(status)
    self.send_header("Content-Type", "application/json")
    if status == 200:
        self.send_header("Access-Control-Allow-Origin", "*")
    self.end_headers()
    self.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            date_param = (params.get("date") or [None])[0]
            event_name = (params.get("event_name") or [None])[0]
            if not date_param:
                _send_json(self, 400, {"error": "Missing required parameter: date"})
                return
            if not event_name:
                _send_json(self, 400, {"error": "Missing required parameter: event_name"})
                return
            rows = query_drilldown(date_param, event_name)
            _send_json(self, 200, rows)
        except ValueError as e:
            _send_json(self, 400, {"error": str(e)})
        except Exception as e:
            _send_json(self, 500, {"error": f"BigQuery error: {str(e)}"})
