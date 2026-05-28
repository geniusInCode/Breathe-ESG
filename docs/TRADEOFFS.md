# Tradeoffs

## 1. No async task queue (no Celery/Redis)
Ingestion runs synchronously in the HTTP request cycle.
For a real deployment with large SAP exports (50k+ rows), this would timeout.
The right solution is Celery + Redis: upload returns a run ID immediately,
polling endpoint tracks status, frontend polls until DONE.
Deliberately excluded because: adds two services to deploy, doubles infrastructure complexity,
and for the prototype with sample data (< 100 rows) it's unnecessary.
Would be the first thing to add post-demo.

## 2. No emission factor versioning
DEFRA updates factors annually. Right now the factor is stored as a float on each record,
which means you can see what factor was used but cannot bulk-recalculate if DEFRA publishes
a revision. The right model has an `EmissionFactor` table with version, valid_from, valid_to,
and a job that can recompute all records for a given factor version.
Excluded because: adds significant schema complexity and no client has asked for retroactive
recalculation yet. Tradeoff documented so it's visible to auditors.

## 3. No authentication / multi-user access control
The prototype uses Django's built-in User model but doesn't enforce login on API endpoints.
Production needs: JWT or session auth, role-based access (analyst vs auditor vs admin),
per-client data isolation enforced at the query layer (not just by convention).
Excluded because: 4-day timeline; getting the data model and ingestion logic right is
more valuable than a login screen. Used CORS allow-all as a placeholder.
