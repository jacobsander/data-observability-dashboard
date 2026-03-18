# GA4 Data Quality Dashboard

A monitoring dashboard for GA4 BigQuery data quality, built with React + Vite + Tailwind (Figma spec) and a Flask backend that queries BigQuery.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- BigQuery service account key (JSON) with access to `mimetic-perigee-290610.obs_layer_northern_europe`

### 1. Backend

```bash
cd observability-layer-ui
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r backend/requirements.txt
```

Create a `.env` file (see `.env.example`):

```
GOOGLE_APPLICATION_CREDENTIALS=path/to/your-service-account-key.json
BIGQUERY_PROJECT=mimetic-perigee-290610
BIGQUERY_DATASET=obs_layer_northern_europe
```

Start the backend:

```bash
python run_backend.py
```

The API runs at http://localhost:5000.

### 2. Frontend

```bash
cd figma_spec
npm install
npm run dev
```

The app runs at http://localhost:5173. Vite proxies `/api` to the Flask backend automatically.

### 3. Build

```bash
cd figma_spec
npm run build
```

## Project Structure

```
observability-layer-ui/
├── backend/           # Flask API + BigQuery
│   ├── app.py
│   ├── bigquery_client.py
│   └── routes/
├── figma_spec/        # React frontend (Vite + Tailwind + Recharts)
│   └── src/
├── run_backend.py
└── .env.example
```

## API Endpoints

- `GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` - Time series for overview charts
- `GET /api/summary/latest` - Latest day KPIs
- `GET /api/drilldown?date=YYYY-MM-DD&event_name=session_start` - Parameter drill-down
- `GET /api/issues?date=YYYY-MM-DD` - Non-VALID rows (alerts)

## Deployment (Vercel)

1. Connect the repository to Vercel.
2. Set environment variables in Project Settings:
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` – paste the full service account JSON (recommended for serverless)
   - Or `GOOGLE_APPLICATION_CREDENTIALS` – path to keyfile (if available in build)
   - `BIGQUERY_PROJECT` (optional, default: mimetic-perigee-290610)
   - `BIGQUERY_DATASET` (optional, default: obs_layer_northern_europe)
   - `BIGQUERY_LOCATION` (optional, default: europe-north1)
3. Deploy. The frontend builds from `figma_spec/`, and API routes in `api/` run as serverless functions.
