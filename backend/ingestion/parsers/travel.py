"""
Corporate travel CSV parser (Concur / Navan export format).
Handles flights, hotels, ground transport.
Airport-code-only rows get great-circle distance estimated.
"""
import pandas as pd
import io
import math

TRAVEL_FACTORS = {
    'flight_short': 0.255,
    'flight_long':  0.195,
    'hotel':        90.0,
    'car_rental':   0.192,
    'taxi':         0.149,
    'rail':         0.035,
}

AIRPORT_COORDS = {
    'LHR': (51.47, -0.45),  'JFK': (40.64, -73.78), 'BOM': (19.09, 72.87),
    'DEL': (28.56, 77.10),  'DXB': (25.25, 55.36),  'SIN': (1.35, 103.99),
    'SFO': (37.62, -122.38),'ORD': (41.97, -87.91),  'CDG': (49.01, 2.55),
    'FRA': (50.03, 8.57),   'HKG': (22.31, 113.91), 'NRT': (35.76, 140.39),
    'BLR': (13.19, 77.70),  'MAA': (12.99, 80.17),  'HYD': (17.24, 78.43),
    'LAX': (33.94, -118.41),'MIA': (25.79, -80.29),  'SEA': (47.45, -122.31),
    'AMS': (52.31, 4.76),   'MUC': (48.36, 11.79),  'ZRH': (47.46, 8.55),
}


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    p = math.pi / 180
    a = (math.sin((lat2 - lat1) * p / 2) ** 2 +
         math.cos(lat1 * p) * math.cos(lat2 * p) *
         math.sin((lon2 - lon1) * p / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def _flight_kgco2e(distance_km):
    if distance_km > 3700:
        return distance_km * TRAVEL_FACTORS['flight_long']
    return distance_km * TRAVEL_FACTORS['flight_short']


def parse(file_bytes: bytes):
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Cannot read CSV: {e}")

    df.columns = [c.lower().strip().replace(' ', '_') for c in df.columns]
    records, errors = [], []

    for idx, row in df.iterrows():
        try:
            category   = str(row.get('category', row.get('type', ''))).upper()
            travel_date = pd.to_datetime(row.get('travel_date', row.get('date'))).date()

            if 'AIR' in category or 'FLIGHT' in category:
                origin = str(row.get('origin', '')).strip().upper()
                dest   = str(row.get('destination', '')).strip().upper()
                dist   = row.get('distance_km')
                flagged, flag_reason = False, ''

                try:
                    dist = float(str(dist).replace(',', ''))
                    if dist <= 0 or math.isnan(dist): raise ValueError
                except Exception:

                    if origin in AIRPORT_COORDS and dest in AIRPORT_COORDS:
                        c1, c2 = AIRPORT_COORDS[origin], AIRPORT_COORDS[dest]
                        dist = _haversine_km(c1[0], c1[1], c2[0], c2[1])
                        flagged, flag_reason = True, f'Distance estimated from {origin}→{dest} coords'
                    else:
                        dist = 1000
                        flagged, flag_reason = True, f'Unknown airports {origin}/{dest}; used 1000 km fallback'

                kgco2e  = _flight_kgco2e(dist)
                ef      = TRAVEL_FACTORS['flight_long' if dist > 3700 else 'flight_short']
                cat_key = 'flight'
                sub     = 'long_haul' if dist > 3700 else 'short_haul'
                act, unit = dist, 'km'

            elif 'HOTEL' in category or 'ACCOMMODATION' in category:
                nights = float(row.get('nights', row.get('quantity', 1)))
                ef     = TRAVEL_FACTORS['hotel']
                kgco2e = nights * ef
                cat_key, sub, act, unit = 'hotel', '', nights, 'nights'
                flagged, flag_reason = False, ''

            elif 'RAIL' in category or 'TRAIN' in category:
                dist   = float(row.get('distance_km', row.get('distance', 100)))
                ef     = TRAVEL_FACTORS['rail']
                kgco2e = dist * ef
                cat_key, sub, act, unit = 'rail', '', dist, 'km'
                flagged, flag_reason = False, ''

            elif 'CAR' in category or 'TAXI' in category or 'GROUND' in category:
                dist   = float(row.get('distance_km', row.get('distance', 50)))
                ef_key = 'taxi' if 'TAXI' in category else 'car_rental'
                ef     = TRAVEL_FACTORS[ef_key]
                kgco2e = dist * ef
                cat_key, sub, act, unit = ef_key, '', dist, 'km'
                flagged, flag_reason = False, ''

            else:
                errors.append({'row': idx, 'error': f'Unknown category: {category}'})
                continue

            records.append({
                'scope': 3,
                'category': cat_key,
                'subcategory': sub,
                'activity_value': act,
                'activity_unit': unit,
                'normalised_kgco2e': round(kgco2e, 4),
                'emission_factor': ef,
                'emission_factor_source': 'DEFRA 2023 / GHG Protocol',
                'period_start': travel_date,
                'period_end': travel_date,
                'source_row_ref': str(row.get('trip_id', f'row_{idx}')),
                'is_flagged': flagged,
                'flag_reason': flag_reason,
            })
        except Exception as e:
            errors.append({'row': idx, 'error': str(e)})

    return records, errors
