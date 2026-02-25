"""Vercel serverless: GET /api/drilldown?date=...&event_name=..."""

import json
from urllib.parse import parse_qs, urlparse

from lib.bigquery_queries import query_drilldown


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            date_param = (params.get("date") or [None])[0]
            event_name = (params.get("event_name") or [None])[0]
            if not date_param:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps({"error": "Missing required parameter: date"}).encode("utf-8")
                )
                return
            if not event_name:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(
                    json.dumps(
                        {"error": "Missing required parameter: event_name"}
                    ).encode("utf-8")
                )
                return
            rows = query_drilldown(date_param, event_name)
            body = json.dumps(rows).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
