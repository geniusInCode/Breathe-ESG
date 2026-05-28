# Breathe ESG — Carbon Intelligence Ingestion & Review Platform

A production-grade Django and React prototype designed to ingest, normalize, audit, and forecast corporate greenhouse gas emissions (Scope 1, 2, and 3) from heterogeneous data sources.

### 🌐 Live Production URL
The application is fully deployed and accessible at:
👉 **[https://breathe-esg-e8md.onrender.com/](https://breathe-esg-e8md.onrender.com/)** *(Hosted as a unified Web Service on Render connecting to a PostgreSQL Database).*

---

## 🚀 Key Features

* **Scope Ingestion Hub (Scope 1/2/3)**: Parses flat files from enterprise SAP exports (Tab-delimited ALV), utility portals (CSV billing cycles), and corporate travel platforms (Concur/Navan flights, hotels, and ground transport logs).
* **Data Normalization Engine**: Standardizes activity metrics on-the-fly (e.g., gallons to litres, IATA airport codes to great-circle kilometer distances, hotel nights, kWh) and computes carbon footprints in kgCO₂e using DEFRA 2023 and India CEA grid emission factors.
* **Smart Verification Queue**: Flags database entries with anomalies (e.g., unusually long billing cycles, missing descriptors, unknown airport codes) for analyst inspection.
* **Analyst Inspector Drawer**: Side drawer that allows analysts to edit raw activity parameters, recalculate footprints in real time, resolve flags, and change sign-off statuses (Approve/Reject).
* **Append-Only Audit Log**: Displays an immutable ledger of all modifications, complete with an **inline visual diff engine** (e.g., `activity_value: 300 ➔ 320`) to track user adjustments for auditors.
* **Neutrality Pathway Simulator**: Interactive projection screen with sliders for target years, operational efficiency reductions, and wind/DAC carbon offsets alongside a dynamic SVG forecast chart (BAU vs. Net-Zero target).
* **Branding Theme Customization**: Features an ambient theme selector allowing switching between *Emerald Glow* (light mode) and *Onyx Dark* (dark mode) presets that persist across sessions.

---

## ⚡ Quick Start: One-Click Demo Center
If you don't have sample files on hand to upload, you can instantly populate the PostgreSQL database with real-world enterprise mock data:
1. Open the live URL: **[https://breathe-esg-e8md.onrender.com/](https://breathe-esg-e8md.onrender.com/)**
2. Navigate to the **Ingestion Hub** tab.
3. On the right-hand panel, locate the **One-Click Demo Center**.
4. Click **Inject SAP**, **Inject UTILITY**, and **Inject TRAVEL** data. The server will parse the files, calculate carbon footprints, and populate the dashboard and review queues immediately.

---

## 📂 Repository Structure
```text
├── backend/                 # Django Rest Framework API Project
│   ├── breathe/             # Settings, main URLs, Gunicorn config
│   ├── ingestion/           # Data models, serializers, views, and parsers
│   └── requirements.txt     # Python dependencies
├── frontend/                # React & Vite SPA
│   ├── src/                 # App components, pages, design styles
│   └── package.json         # Node dependencies
├── docs/                    # Architectural documents
├── sample_data/             # Preloaded test files (SAP TSV, Utility CSV, Concur CSV)
├── MODEL.md                 # Data schema design and multi-tenancy explanation
├── DECISIONS.md             # Every ambiguity resolved, assumptions, and PM questions
├── TRADEOFFS.md             # What was deliberately left out and why
└── SOURCES.md               # Real-world data formats researched
```

---

## 💻 Local Development Setup

### Backend (Django)
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate      # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```
   *The API will be available at: http://localhost:8000*

### Frontend (React / Vite)
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   *The client app will be available at: http://localhost:5173*

---

## 📖 Evaluation Deliverables
Thorough documentation of tradeoffs and decisions has been prepared for the review committee:
* Read the **[MODEL.md](file:///c:/Users/DELL/Downloads/breathe-esg/MODEL.md)** for information on schema design, multi-tenancy, and audit logs.
* Read the **[DECISIONS.md](file:///c:/Users/DELL/Downloads/breathe-esg/DECISIONS.md)** for context on file choices, fallbacks, and questions for the product manager.
* Read the **[TRADEOFFS.md](file:///c:/Users/DELL/Downloads/breathe-esg/TRADEOFFS.md)** to see which features were intentionally omitted for this version.
* Read the **[SOURCES.md](file:///c:/Users/DELL/Downloads/breathe-esg/SOURCES.md)** for details on SAP ALV headers, billing cycles, and IATA geolocation formulas.
* Read the **[walkthrough.md](file:///c:/Users/DELL/Downloads/breathe-esg/walkthrough.md)** for a visual summary of the UI design assets, verification checks, and build test outcomes.
