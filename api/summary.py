"""Vercel serverless: GET /api/summary?from=...&to=..."""

import json
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler

from lib.bigquery_queries import query_summary_range


def _parse_query(path: str) -> dict[str, str]:
    if "?" not in path:
        return {}
    qs = path.split("?", 1)[1]
    out = {}
    for part in qs.split("&"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k] = v
    return out


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            params = _parse_query(self.path)
            date_from = params.get("from")
            date_to = params.get("to")
            if not date_from or not date_to:
                end = date.today()
                start = end - timedelta(days=6)
                date_from = start.isoformat()
                date_to = end.isoformat()

            rows = query_summary_range(date_from, date_to)
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
