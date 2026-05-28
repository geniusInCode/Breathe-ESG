# Sources

## 1. SAP — Fuel & Procurement

**Format researched:** SAP ALV grid export via transaction ME2M (purchase orders by material).
Standard output is tab-delimited with configurable column layouts.
German installations export headers like MENGE (Menge = quantity), MEINS (Mengeneinheit = unit
of measure), BUDAT (Buchungsdatum = posting date), TXZ01 (Kurztext = short description),
WERKS (Werk = plant/site).

**What I learned:**
- Date format is DD.MM.YYYY in German SAP, YYYYMMDD in some English configs — must handle both.
- Units use SAP internal codes: L3 = litres, ST = pieces, KG = kilograms, M3 = cubic metres.
  L and LTR also appear depending on config.
- Plant codes (WERKS) are 4-digit numbers meaningful only with a lookup table (e.g. 1000 = Hamburg HQ).
- Material descriptions (TXZ01) are free text — fuel type must be inferred with keyword matching.
- Some configs output Unicode, some latin-1. Parser tries UTF-8 then falls back to latin-1.

**Sample data rationale:**
Five rows covering diesel, petrol, natural gas, diesel in gallons (US subsidiary), and LPG.
Units vary deliberately (L, L3, GAL, KG) to exercise the conversion logic.
Plant codes 1000/2000/3000 with no lookup table to trigger the flag path.

**What would break in real deployment:**
- Plant lookup table not provided — subcategory would be plant code, not site name.
- Material descriptions in German would need extended keyword mapping.
- Multi-line items where one PO line spans two materials.
- Cost centre / controlling area columns sometimes inserted mid-export breaking column order.
- Files with BOM (byte-order mark) at start.


## 2. Utility — Electricity

**Format researched:** Portal CSV exports from major UK utilities (EDF Business, British Gas,
Scottish Power) and GreenButton (US/Canada standard). Also reviewed ESIOS portal (Spain)
and POSOCO (India) formats.

**What I learned:**
- Billing periods rarely align with calendar months — 28, 31, 33-day periods are common.
- "Estimated" reads happen when the meter reader couldn't access the site — these produce
  abnormally long billing periods (up to 60 days) followed by a correction.
- Units are almost always kWh at the invoice level, but half-hourly data (HH meters) comes
  in kWh per 30-min interval — must aggregate.
- Tariff codes (HH-TOU, NHH-FIT, SME-STD) affect cost but not emission calculation.
- Some portals export demand (kW peak) alongside consumption (kWh) — we store but don't use demand.

**Sample data rationale:**
Four meters. MTR-001: normal 32-day period (common). MTR-002: 28-day Feb period (normal).
MTR-003: 64-day period — triggers "estimated read" flag. MTR-004: normal 27-day period.
Exercises both normal and anomaly paths.

**What would break in real deployment:**
- Half-hourly data files are 17,520 rows per meter per year — need aggregation step.
- PDF bills (common for smaller sites) require OCR — not handled.
- Renewable energy certificates (RECs/GOOs) would change the market-based Scope 2 factor to zero.
- Multi-site clients with 50+ meters need bulk upload and meter-to-site mapping.


## 3. Travel — Corporate (Concur / Navan)

**Format researched:** Concur Expense standard report export and Navan trip export CSV.
Also reviewed SAP Concur Travel Data Extract API (v4) documentation.

**What I learned:**
- Concur CSV has ~40 columns; we need 8. Most are expense management fields irrelevant to emissions.
- Category field values vary: "Air", "AIR", "Flight", "FLIGHT" all appear — must normalise.
- `distance_km` is often null for flights booked outside the platform or for older records.
- Hotel nights are in a separate `nights` or `quantity` column; not always populated.
- Navan exports origin/destination as IATA codes for flights, city names for hotels — inconsistent.
- Rail bookings appear as "RAIL" or "TRAIN" depending on platform version.

**Sample data rationale:**
Eight rows: two long-haul flights (BLR→LHR, JFK→SFO one with distance, one without),
one short-haul (DEL→DXB, no distance — exercises great-circle fallback), two hotels,
one car rental, one taxi, one rail. Covers all category branches and the distance fallback.

**What would break in real deployment:**
- Airport codes outside our 20-entry lookup get the 1000 km fallback — need a full IATA DB.
- Hotel emission factor (90 kgCO2e/night) is a global average; varies hugely by region and star rating.
- Business class flights have a higher emission factor (typically 2.5-3x economy) — we use economy only.
- Car rental without distance recorded (just cost) — no way to compute emissions.
- Trips spanning midnight (check-out next day) may double-count if both days appear as rows.


## Emission factor sources
- DEFRA 2023 Greenhouse Gas Reporting: Conversion Factors
  https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023
- GHG Protocol Technical Guidance for Scope 3 (Category 6: Business Travel)
- Central Electricity Authority (India) CO2 Baseline Database, Version 17 (2023)
