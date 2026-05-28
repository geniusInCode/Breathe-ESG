# Decisions

## SAP ingestion
**Chose flat file (ALV/ME2M tab-delimited) over OData/IDoc/BAPI.**
OData requires SAP Gateway middleware — most enterprise clients on ECC 6.0 don't have it configured.
IDocs are complex XML structures used for EDI, not analyst exports. BAPIs require RFC calls.
ALV flat files are what SAP consultants actually email around; they're what a sustainability lead
would get when they ask IT for a data extract.

Handled: fuel and energy procurement lines (MENGE, MEINS, BUDAT, TXZ01, WERKS).
Ignored: financial amounts (WRBTR), cost centres, vendor details — not needed for emissions.

Column mapping handles both German SAP headers (MENGE, MEINS) and English equivalents
(Quantity, Unit) since both appear in real deployments.

## Utility ingestion
**Chose CSV portal export over PDF or API.**
PDFs require OCR — fragile, breaks on layout changes, not worth the complexity for a prototype.
Utility APIs (e.g. GreenButton) exist but require per-utility integration agreements;
no enterprise client will have all their meters on one API.
Portal CSVs are the de facto standard — every major UK/EU/IN utility offers one.

Handled: meter ID, billing period, consumption kWh.
Ignored: demand charges, reactive power, tariff details — not needed for emissions.

Billing period anomaly: flagged if > 35 days (estimated read) or < 20 days.

## Travel ingestion
**Chose CSV export (Concur/Navan) over API.**
Concur's Expense API requires OAuth per-tenant setup and is not standardised across versions.
Navan's export is CSV. In practice, a travel manager exports and uploads — not a live API pull.

Handled: flights, hotels, car rental, taxi, rail.
Ignored: currency, cost centre, approval chain — not needed for emissions.

Distance fallback: if `distance_km` is missing for flights, compute great-circle distance
from IATA airport codes. Unknown airports get a 1000 km fallback with an anomaly flag.

## Emission factors
DEFRA 2023 emission factors for UK context.
India CEA 2023 grid factor (0.82 kgCO2e/kWh) supported as an alternate region.
Stored per record so they're auditable and can be updated without reprocessing.

## What I'd ask the PM
1. Are we doing market-based or location-based Scope 2? (I defaulted to location-based.)
2. What happens to rejected records — are they re-submitted or permanently excluded?
3. Is there a preferred emission factor database (DEFRA, EPA, ecoinvent)?
4. Do we need activity-level approval (per row) or batch approval (per ingestion run)?
5. What jurisdictions do clients operate in — affects grid factors significantly.
