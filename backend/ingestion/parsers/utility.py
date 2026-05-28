"""
Utility electricity CSV parser.
Handles portal exports with billing periods that don't align with calendar months.
"""
import pandas as pd
import io

GRID_EF = {'UK': 0.21233, 'IN': 0.82, 'US': 0.386}


def parse(file_bytes: bytes, grid_region: str = 'UK'):
    ef = GRID_EF.get(grid_region, GRID_EF['UK'])

    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Cannot read CSV: {e}")

    rename = {}
    for col in df.columns:
        lc = col.lower().replace(' ', '_').replace('-', '_')
        if 'meter' in lc:                          rename[col] = 'meter_id'
        elif 'start' in lc:                        rename[col] = 'billing_start'
        elif 'end' in lc or lc == 'to':            rename[col] = 'billing_end'
        elif 'kwh' in lc or 'consumption' in lc:  rename[col] = 'consumption_kwh'
        elif 'demand' in lc:                       rename[col] = 'demand_kw'
        elif 'tariff' in lc:                       rename[col] = 'tariff_code'
    df = df.rename(columns=rename)

    records, errors = [], []

    for idx, row in df.iterrows():
        try:
            import math
            kwh   = float(str(row['consumption_kwh']).replace(',', ''))
            if math.isnan(kwh) or math.isinf(kwh): raise ValueError("Consumption is NaN or Infinite")
            start = pd.to_datetime(row['billing_start']).date()

            end   = pd.to_datetime(row['billing_end']).date()
            days  = (end - start).days

            flagged, flag_reason = False, ''
            if days > 35:
                flagged, flag_reason = True, f'Billing period {days} days — possible estimated read'
            elif days < 20:
                flagged, flag_reason = True, f'Billing period {days} days — unusually short'

            records.append({
                'scope': 2,
                'category': 'grid_electricity',
                'subcategory': grid_region,
                'activity_value': kwh,
                'activity_unit': 'kWh',
                'normalised_kgco2e': round(kwh * ef, 4),
                'emission_factor': ef,
                'emission_factor_source': f'DEFRA 2023 ({grid_region})',
                'period_start': start,
                'period_end': end,
                'source_row_ref': str(row.get('meter_id', f'row_{idx}')),
                'is_flagged': flagged,
                'flag_reason': flag_reason,
            })
        except Exception as e:
            errors.append({'row': idx, 'error': str(e)})

    return records, errors
