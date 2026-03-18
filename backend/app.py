"""Flask application for GA4 Data Quality Dashboard API."""

from flask import Flask
from flask_cors import CORS

from backend.routes.summary import bp as summary_bp
from backend.routes.drilldown import bp as drilldown_bp
from backend.routes.issues import bp as issues_bp
from backend.routes.param_detail import bp as param_detail_bp
from backend.routes.marketing import bp as marketing_bp
from backend.routes.raw_counts import bp as raw_counts_bp


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"])

    app.register_blueprint(summary_bp)
    app.register_blueprint(drilldown_bp)
    app.register_blueprint(issues_bp)
    app.register_blueprint(param_detail_bp)
    app.register_blueprint(marketing_bp)
    app.register_blueprint(raw_counts_bp)

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
