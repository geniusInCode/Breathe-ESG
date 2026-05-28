"""
SAP flat file parser (ALV/ME2M style export).
Real SAP exports from ME2M (purchase orders) come as tab-delimited
with German or English headers depending on system language setting.
"""
import pandas as pd
import io
from datetime import datetime

# Emission factors kgCO2e per litre (DEFRA 2023)
FUEL_FACTORS = {
    'diesel':      2.51,
    'petrol':      2.31,
    'natural_gas': 2.04,  # per kg
    'lpg':         1.51,
    'fuel_oil':    2.96,
}

# SAP column aliases: German -> English
COLUMN_MAP = {
    'MENGE': 'quantity',
    'MEINS': 'unit',
    'WERKS': 'plant_code',
    'BUDAT': 'posting_date',
    'MATNR': 'material_number',
    'TXZ01': 'material_desc',
    'WRBTR': 'amount',
    'WAERS': 'currency',
    'Quantity': 'quantity',
    'Unit': 'unit',
    'Plant': 'plant_code',
    'Posting Date': 'posting_date',
    'Material': 'material_number',
    'Short Text': 'material_desc',
}

UNIT_TO_LITRES = {
    'L':   1.0,
    'LTR': 1.0,
    'L3':  1.0,
    'GAL': 3.785,
    'KG':  None,
    'M3':  1000.0,
}


def _infer_fuel_type(desc: str) -> str:
    desc = str(desc).lower()
    if 'diesel' in desc:                        return 'diesel'
    if 'petrol' in desc or 'gasoline' in desc:  return 'petrol'
    if 'natural gas' in desc or 'erdgas' in desc: return 'natural_gas'
    if 'lpg' in desc:                           return 'lpg'
    if 'fuel oil' in desc or 'heizöl' in desc:  return 'fuel_oil'
    return 'diesel'


def parse(file_bytes: bytes, plant_lookup: dict = None):
    plant_lookup = plant_lookup or {}
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), sep='\t', encoding='utf-8')
    except Exception:
        df = pd.read_csv(io.BytesIO(file_bytes), sep='\t', encoding='latin-1')

    df = df.rename(columns=COLUMN_MAP)

    required = ['quantity', 'unit', 'posting_date', 'material_desc']
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"SAP file missing required columns: {missing}")

    records, errors = [], []

    for idx, row in df.iterrows():
        try:
            qty = float(str(row['quantity']).replace(',', '.'))
            unit = str(row.get('unit', 'L')).strip().upper()
            desc = str(row.get('material_desc', ''))
            fuel_type = _infer_fuel_type(desc)
            plant = str(row.get('plant_code', '')).strip()

            raw_date = str(row['posting_date']).strip()
            for fmt in ('%d.%m.%Y', '%Y%m%d', '%Y-%m-%d', '%m/%d/%Y'):
                try:
                    posting_date = datetime.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    continue
            else:
                raise ValueError(f"Cannot parse date: {raw_date}")

            factor = UNIT_TO_LITRES.get(unit)
            if factor is None:
                ef = FUEL_FACTORS.get(fuel_type, 2.51)
                kgco2e = qty * ef
                act_val, act_unit = qty, 'kg'
            else:
                litres = qty * factor
                ef = FUEL_FACTORS.get(fuel_type, 2.51)
                kgco2e = litres * ef
                act_val, act_unit = litres, 'litres'

            flagged = desc.strip() == ''
            records.append({
                'scope': 1,
                'category': fuel_type,
                'subcategory': plant_lookup.get(plant, plant),
                'activity_value': act_val,
                'activity_unit': act_unit,
                'normalised_kgco2e': round(kgco2e, 4),
                'emission_factor': ef,
                'emission_factor_source': 'DEFRA 2023',
                'period_start': posting_date,
                'period_end': posting_date,
                'source_row_ref': str(row.get('material_number', f'row_{idx}')),
                'is_flagged': flagged,
                'flag_reason': 'Fuel type inferred; verify manually' if flagged else '',
            })
        except Exception as e:
            errors.append({'row': idx, 'error': str(e)})

    return records, errors
