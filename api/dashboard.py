"""Vercel serverless: GET /api/dashboard?days=7 - combined latest + trend in one response."""

import json
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from lib.bigquery_queries import query_event_quality_range


def _parse_query(path: str) -> dict[str, str]:
    parsed = urlparse(path)
    params = parse_qs(parsed.query)
    return {k: (v[0] if v else "") for k, v in params.items()}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            params = _parse_query(self.path)
            days = int(params.get("days") or "7")
            days = max(1, min(30, days))

            end = date.today()
            start = end - timedelta(days=days - 1)
            date_from = start.isoformat()
            date_to = end.isoformat()

            rows = query_event_quality_range(date_from, date_to)
            latest = rows[-1] if rows else None
            payload = {"latest": latest, "trend": rows}

            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=300")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
