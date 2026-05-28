# Breathe ESG — Prototype

Carbon emissions ingestion and analyst review platform.
Ingests SAP fuel/procurement, utility electricity, and corporate travel data.
Normalises to kgCO₂e, flags anomalies, and surfaces a review dashboard for analyst sign-off.

---

## Quick start (local)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser   # optional, for /admin
python manage.py runserver
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Set `VITE_API_URL` in `frontend/.env` if your backend runs on a different port:
```
VITE_API_URL=http://localhost:8000/api
```

---

## Deploy to Railway (backend) + Vercel (frontend)

### Backend on Railway

1. Push `backend/` to a GitHub repo (or the whole monorepo).
2. Create a new Railway project → "Deploy from GitHub".
3. Add a PostgreSQL plugin — Railway sets `DATABASE_URL` automatically.
4. Set environment variables:
   ```
   SECRET_KEY=your-random-secret-key
   DEBUG=False
   ```
5. Railway uses `Procfile` → `gunicorn breathe.wsgi`.
6. After deploy: `railway run python manage.py migrate`

### Frontend on Vercel

1. Push `frontend/` to GitHub.
2. Import project in Vercel.
3. Set environment variable:
   ```
   VITE_API_URL=https://your-railway-app.up.railway.app/api
   ```
4. Deploy.

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/` | Upload a CSV/TSV file |
| GET | `/api/records/` | List emission records (filterable) |
| POST | `/api/records/<id>/review/` | Approve or reject a record |
| POST | `/api/lock/` | Lock all approved records |
| GET | `/api/stats/` | Dashboard summary stats |

### Upload example

```bash
curl -X POST http://localhost:8000/api/upload/ \
  -F "source_type=SAP" \
  -F "client_id=1" \
  -F "file=@sample_data/sample_sap.tsv"
```

### Review example

```bash
curl -X POST http://localhost:8000/api/records/1/review/ \
  -H "Content-Type: application/json" \
  -d '{"action": "APPROVED", "note": "Verified against fuel invoices"}'
```

---

## Sample data

`sample_data/` contains three files for testing:

| File | Source | Rows | Notes |
|------|--------|------|-------|
| `sample_sap.tsv` | SAP | 5 | Mixed units, one empty desc to trigger flag |
| `sample_utility.csv` | Utility | 4 | One 64-day period triggers estimated-read flag |
| `sample_travel.csv` | Travel | 8 | Two flights without distance trigger great-circle fallback |

---

## Docs

- `docs/MODEL.md` — data model and design decisions
- `docs/DECISIONS.md` — every ambiguity resolved
- `docs/TRADEOFFS.md` — three things deliberately not built
- `docs/SOURCES.md` — real-world format research for each source

---

## Stack

- **Backend:** Django 4.2, Django REST Framework, pandas
- **Database:** SQLite (local) / PostgreSQL (production)
- **Frontend:** React 18, Vite
- **Deploy:** Railway (backend), Vercel (frontend)
