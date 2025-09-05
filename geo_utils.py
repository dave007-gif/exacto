# geo_utils.py
#from dynaconf import settings

#def normalize_key(region: str) -> str:
    #"""#Normalize region names for consistent lookups."""
    #return region.strip().lower() if region else ""

#def get_anchor_city(region: str) -> str | None:
    #"""
    #Return the anchor city for a given region (plant-specific).
    #Uses Dynaconf settings.PLANT_ANCHOR_CITY_MAP.
    #"""
    #key = normalize_key(region)
    #anchor_map = getattr(settings, "PLANT_ANCHOR_CITY_MAP", {})
    #return anchor_map.get(key)

#def get_distance_km(rural: str, city: str) -> float:
    #"""
    #Return distance between rural and anchor city in km (plant-specific).
    #Uses Dynaconf settings.PLANT_DISTANCE_MATRIX.
    #"""
 #   r, c = normalize_key(rural), normalize_key(city)
  ## key = f"{r}->{c}"
    #return float(distance_table.get(key, 0))

#def validate_plant_geo_config():
   # """
    #Validate PLANT_ANCHOR_CITY_MAP and PLANT_DISTANCE_MATRIX entries.
    #Warns if any anchor city is not in VALID_REGIONS.
    #"""
 #   valid_regions = [r.lower() for r in getattr(settings, "VALID_REGIONS", [])]

  #  for rural, city in getattr(settings, "PLANT_ANCHOR_CITY_MAP", {}).items():
   #     if city not in valid_regions and city not in getattr(settings, "PLANT_ANCHOR_CITY_MAP", {}):
     #       raise ValueError(f"Anchor city '{city}' for rural '{rural}' is not a valid region")

    #for pair, dist in getattr(settings, "PLANT_DISTANCE_MATRIX", {}).items():
      #  if "->" not in pair:
       #     raise ValueError(f"Invalid PLANT_DISTANCE_MATRIX key: '{pair}' (must be 'rural->city')")
        #if not isinstance(dist, (int, float)) or dist < 0:
         #   raise ValueError(f"Invalid distance for {pair}: {dist}")



from flask import current_app

def normalize_key(region: str) -> str:
    return region.strip().lower() if region else ""

def get_anchor_city(region: str) -> str | None:
    key = normalize_key(region)
    anchor_map = current_app.config.get("PLANT_ANCHOR_CITY_MAP", {})
    return anchor_map.get(key)

def get_distance_km(rural: str, city: str) -> float:
    r, c = normalize_key(rural), normalize_key(city)
    distance_table = current_app.config.get("PLANT_DISTANCE_MATRIX", {})
    key = f"{r}->{c}"
    return float(distance_table.get(key, 0))

def validate_plant_geo_config():
    valid_regions = [r.lower() for r in current_app.config.get("VALID_REGIONS", [])]

    for rural, city in current_app.config.get("PLANT_ANCHOR_CITY_MAP", {}).items():
        if city not in valid_regions and city not in current_app.config.get("PLANT_ANCHOR_CITY_MAP", {}):
            raise ValueError(f"Anchor city '{city}' for rural '{rural}' is not a valid region")

    for pair, dist in current_app.config.get("PLANT_DISTANCE_MATRIX", {}).items():
        if "->" not in pair:
            raise ValueError(f"Invalid PLANT_DISTANCE_MATRIX key: '{pair}' (must be 'rural->city')")
        if not isinstance(dist, (int, float)) or dist < 0:
            raise ValueError(f"Invalid distance for {pair}: {dist}")
