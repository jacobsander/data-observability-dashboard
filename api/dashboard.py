"""Vercel serverless: GET /api/dashboard?days=7 - combined latest + trend in one response."""

import json
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from lib.bigquery_queries import EVENTS, query_event_quality_range, query_summary_range


def _latest_from_range_average(rows: list, date_to: str) -> dict | None:
    """Build synthetic 'latest' row as average of daily scores across the date range."""
    if not rows:
        return None
    synthetic = {"date": date_to}
    for ev in EVENTS:
        key = f"{ev}_overall_score"
        scores = [r.get(key, 0) for r in rows]
        synthetic[key] = round(sum(scores) / len(scores) * 10) / 10 if scores else 0
    return synthetic


def _parse_query(path: str) -> dict[str, str]:
    parsed = urlparse(path)
    params = parse_qs(parsed.query)
    return {k: (v[0] if v else "") for k, v in params.items()}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            params = _parse_query(self.path)
            from_str = params.get("from")
            to_str = params.get("to")

            if from_str and to_str:
                try:
                    start = date.fromisoformat(from_str)
                    end = date.fromisoformat(to_str)
                    if start > end:
                        start, end = end, start
                    date_from = start.isoformat()
                    date_to = end.isoformat()
                except ValueError:
                    end = date.today()
                    start = end - timedelta(days=6)
                    date_from = start.isoformat()
                    date_to = end.isoformat()
            else:
                days = int(params.get("days") or "7")
                days = max(1, min(90, days))
                end_str = params.get("to")
                if end_str:
                    try:
                        end = date.fromisoformat(end_str)
                    except ValueError:
                        end = date.today()
                else:
                    end = date.today()
                start = end - timedelta(days=days - 1)
                date_from = start.isoformat()
                date_to = end.isoformat()

            rows = query_event_quality_range(date_from, date_to)
            latest = _latest_from_range_average(rows, date_to)

            # Previous period: same length, immediately before current range
            start_d = date.fromisoformat(date_from)
            end_d = date.fromisoformat(date_to)
            num_days = (end_d - start_d).days + 1
            prev_end_d = start_d - timedelta(days=1)
            prev_start_d = prev_end_d - timedelta(days=num_days - 1)
            prev_from = prev_start_d.isoformat()
            prev_to = prev_end_d.isoformat()
            prev_rows = query_event_quality_range(prev_from, prev_to)
            if not prev_rows:
                prev_rows = query_summary_range(prev_from, prev_to)
            previous = _latest_from_range_average(prev_rows, prev_to)

            payload = {"latest": latest, "trend": rows, "previous": previous}

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
