# Data Model

## Core design decisions

### Multi-tenancy
Every table anchors to `Client`. All queries filter by `client_id` first.
No row-level security in this prototype — production would add Django guardian or RLS at Postgres level.

### Tables

**Client** — tenant root.
- `name`, `slug` (unique URL-safe identifier)

**IngestionRun** — one row per file upload.
- `client` FK, `source_type` (SAP/UTILITY/TRAVEL)
- `uploaded_by` FK to User, `uploaded_at`, `filename`
- `status` (PENDING → PROCESSING → DONE/FAILED)
- `row_count`, `error_count`, `notes`
- Purpose: every EmissionRecord traces back to the exact upload that created it.

**EmissionRecord** — central fact table.
- `client`, `ingestion_run` FKs
- `source_row_ref` — original identifier from the source file (SAP doc number, meter ID, trip ID)
- `scope` (1/2/3) — GHG Protocol categorisation
- `category` — e.g. diesel, grid_electricity, flight, hotel
- `subcategory` — e.g. long_haul, short_haul, plant name
- `activity_value`, `activity_unit` — raw activity in source units (litres, kWh, km, nights)
- `normalised_kgco2e` — computed at ingest, stored (not recalculated on read)
- `emission_factor`, `emission_factor_source` — the exact EF used, traceable
- `period_start`, `period_end` — billing or activity period
- `status` — PENDING → APPROVED/REJECTED → LOCKED
- `reviewed_by`, `reviewed_at`, `reviewer_note`
- `is_flagged`, `flag_reason` — set at parse time for anomalies

**AuditLog** — append-only change log.
- Rows are never updated or deleted.
- Every status change on EmissionRecord creates one AuditLog row.
- Fields: `record`, `changed_by`, `changed_at`, `action`, `field_changed`, `old_value`, `new_value`, `note`

## Scope categorisation
- Scope 1: direct combustion — SAP fuel records
- Scope 2: purchased electricity — utility records (location-based method, DEFRA 2023)
- Scope 3: value chain — travel (GHG Protocol Category 6: business travel)

## Unit normalisation
All activity values stored in a single normalised unit per category:
- Fuel → litres (gallons and m³ converted at parse time)
- Electricity → kWh
- Flights/ground → km (great-circle estimated when not provided)
- Hotels → nights

kgCO2e is computed at ingest and stored. Emission factor and source are stored alongside
so any future recalculation can be audited.

## Audit trail
The `AuditLog` table is the source of truth for who did what and when.
`EmissionRecord.updated_at` is auto-updated but is not sufficient for audit — the log is.
The LOCKED status prevents any further edits; locked records go to the auditor export.
