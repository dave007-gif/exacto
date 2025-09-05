from flask import current_app

def calculate_haulage_cost(distance_km: float) -> float:
    per_km = current_app.config.get("HAULAGE_RATE_PER_KM", 2.0)
    base = current_app.config.get("HAULAGE_BASE_COST", 0.0)
    return round(base + (per_km * distance_km), 2)
