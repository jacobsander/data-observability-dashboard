"""Run the Flask backend. Execute from project root: python run_backend.py"""

import sys
from pathlib import Path

# Add project root to path
root = Path(__file__).resolve().parent
sys.path.insert(0, str(root))

# Load .env from project root
from dotenv import load_dotenv
# Override any existing env vars so local `.env` is the source of truth.
load_dotenv(root / ".env", override=True)

from backend.app import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
