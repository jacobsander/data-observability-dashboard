"""Vercel serverless: GET /api/issues?date=..."""

import json
from datetime import date
from urllib.parse import parse_qs, urlparse

from lib.bigquery_queries import query_issues


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            date_param = (params.get("date") or [None])[0]
            if not date_param:
                date_param = date.today().isoformat()
            rows = query_issues(date_param)
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
