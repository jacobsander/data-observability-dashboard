"""Vercel serverless: GET /api/summary/latest"""

import json
from http.server import BaseHTTPRequestHandler

from lib.bigquery_queries import query_summary_latest


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            row = query_summary_latest()
            if row is None:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No data found"}).encode("utf-8"))
                return
            body = json.dumps(row).encode("utf-8")
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
