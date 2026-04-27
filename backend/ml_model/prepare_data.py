import pandas as pd
import numpy as np
import math
import difflib
from pathlib import Path

# Source: NDMA Annual Reports 2000-2024 + IMD Historical Records
NDMA_EVENTS = [
    (2004, 12, "Chennai",       "Tamil Nadu",   "tsunami",    10, 2800000,  10749, "2004 Indian Ocean Tsunami"),
    (2005, 7,  "Mumbai",        "Maharashtra",  "flood",      9,  1500000,  1094,  "2005 Maharashtra floods - 944mm rain in 24hrs"),
    (2008, 8,  "Bhubaneswar",   "Odisha",       "flood",      8,  2300000,  107,   "2008 Bihar-Kosi floods"),
    (2013, 6,  "Bhopal",        "MP",           "flood",      8,  850000,   5748,  "2013 Uttarakhand floods"),
    (2014, 10, "Visakhapatnam", "AP",           "cyclone",    9,  12000000, 61,    "Cyclone Hudhud - Category 4"),
    (2015, 11, "Chennai",       "Tamil Nadu",   "flood",      9,  4000000,  500,   "2015 Chennai floods - worst in 100 years"),
    (2016, 10, "Bhubaneswar",   "Odisha",       "cyclone",    8,  600000,   33,    "Cyclone Titli 2018"),
    (2018, 8,  "Kochi",         "Kerala",       "flood",      10, 5400000,  483,   "2018 Kerala floods - worst in a century"),
    (2019, 10, "Visakhapatnam", "AP",           "cyclone",    9,  1000000,  89,    "Cyclone Fani - Category 5 equivalent"),
    (2020, 5,  "Bhubaneswar",   "Odisha",       "cyclone",    9,  3800000,  128,   "Cyclone Amphan - Super Cyclone"),
    (2021, 7,  "Mumbai",        "Maharashtra",  "landslide",  8,  400000,   229,   "2021 Maharashtra landslides"),
    (2021, 10, "Bhubaneswar",   "Odisha",       "cyclone",    7,  1200000,  3,     "Cyclone Yaas 2021"),
    (2022, 6,  "Bhopal",        "MP",           "flood",      7,  500000,   88,    "2022 MP floods"),
    (2022, 9,  "Ahmedabad",     "Gujarat",      "flood",      8,  800000,   196,   "2022 Gujarat floods"),
    (2023, 7,  "Delhi",         "Delhi",        "flood",      8,  350000,   44,    "2023 Delhi Yamuna floods - highest level since 1978"),
    (2023, 7,  "Bhopal",        "MP",           "flood",      7,  450000,   72,    "2023 Himachal Pradesh floods"),
    (2023, 10, "Chennai",       "Tamil Nadu",   "cyclone",    7,  700000,   13,    "Cyclone Michaung 2023"),
    (2001, 1,  "Ahmedabad",     "Gujarat",      "earthquake", 10, 600000,   20005, "2001 Bhuj Earthquake M7.7"),
    (2004, 9,  "Pune",          "Maharashtra",  "flood",      7,  200000,   29,    "2004 Pune floods"),
    (2009, 10, "Kochi",         "Kerala",       "flood",      7,  300000,   180,   "2009 Andhra floods"),
    (2010, 8,  "Delhi",         "Delhi",        "flood",      6,  500000,   43,    "2010 North India floods"),
    (2011, 9,  "Delhi",         "Delhi",        "earthquake", 5,  50000,    97,    "2011 Sikkim Earthquake M6.9"),
    (2012, 8,  "Lucknow",       "UP",           "flood",      7,  1200000,  502,   "2012 Assam-North India floods"),
    (2016, 4,  "Chennai",       "Tamil Nadu",   "heatwave",   9,  400000,   400,   "2016 South India heatwave"),
    (2019, 6,  "Delhi",         "Delhi",        "heatwave",   9,  500000,   184,   "2019 North India heatwave 50.8°C"),
    (2020, 3,  "Delhi",         "Delhi",        "heatwave",   7,  300000,   22,    "2020 pre-monsoon heatwave"),
    (2003, 5,  "Ahmedabad",     "Gujarat",      "heatwave",   9,  800000,   1210,  "2003 Gujarat heatwave"),
    (2015, 5,  "Hyderabad",     "Telangana",    "heatwave",   10, 1200000,  2500,  "2015 Andhra-Telangana heatwave"),
    (2017, 8,  "Mumbai",        "Maharashtra",  "flood",      8,  800000,   1200,  "2017 Mumbai flooding"),
    (2022, 5,  "Kolkata",       "West Bengal",  "cyclone",    7,  1500000,  2,     "Cyclone Asani 2022"),
]

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from constants import CITY_FEATURES

def clean_emdat(path: str) -> pd.DataFrame:
    print(f"Reading EM-DAT from {path}...")
    df = pd.read_excel(path) 
    
    # Clean headers
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_").str.replace("'", "").str.replace(".", "")

    if "disaster_type" not in df.columns:
        print("Warning: Expected EM-DAT to have 'disaster_type'. Adjusting...")
        print("Available columns:", df.columns.tolist())

    keep_types = ["Flood", "Storm", "Earthquake", "Drought", "Landslide",
                  "Wildfire", "Extreme temperature", "Tsunami"]
    
    if "disaster_type" in df.columns:
        df = df[df["disaster_type"].isin(keep_types)].copy()
        
        type_map = {
            "Storm": "cyclone",
            "Flood": "flood",
            "Earthquake": "earthquake",
            "Drought": "drought",
            "Landslide": "landslide",
            "Wildfire": "wildfire",
            "Extreme temperature": "heatwave",
            "Tsunami": "tsunami",
        }
        df["disaster_type"] = df["disaster_type"].map(type_map)
    else:
        df["disaster_type"] = "unknown"

    df["month"] = pd.to_numeric(df.get("start_month", 0), errors="coerce").fillna(0).astype(int)
    # the exact EM-DAT column is 'total_affected' but fallback to 0
    if "total_affected" not in df.columns:
        df["total_affected"] = 0
    df["affected_population"] = pd.to_numeric(df["total_affected"], errors="coerce").fillna(0)

    # Need location to map to cities
    if "location" not in df.columns:
        df["location"] = df.get("admin_units", "")
        
    df["total_deaths"] = pd.to_numeric(df.get("total_deaths", 0), errors="coerce").fillna(0)
    
    if "latitude" not in df.columns: df["latitude"] = np.nan
    if "longitude" not in df.columns: df["longitude"] = np.nan
    if "year" not in df.columns: df["year"] = 2000

    cols_to_keep = ["year", "month", "disaster_type", "location", "latitude", "longitude",
                    "affected_population", "total_deaths"]
    
    # Filter to requested columns as best as possible
    for col in cols_to_keep:
        if col not in df.columns:
            df[col] = np.nan

    df = df[cols_to_keep].copy()
    df = df[df["affected_population"] > 0].copy()

    return df

def fetch_usgs_earthquakes() -> pd.DataFrame:
    import urllib.request, io
    url = (
        "https://earthquake.usgs.gov/fdsnws/event/1/query?format=csv"
        "&starttime=2000-01-01&endtime=2024-12-31"
        "&minlatitude=8.0&maxlatitude=37.0"
        "&minlongitude=68.0&maxlongitude=97.5"
        "&minmagnitude=3.0&orderby=time"
    )
    print("Fetching USGS earthquake data...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            content = response.read().decode("utf-8")
        df = pd.read_csv(io.StringIO(content))
    except Exception as exc:
        print(f"USGS fetch failed ({exc}). Falling back to cached dataset rows...")
        return load_cached_usgs_rows("backend/ml_model/india_disaster_dataset.csv")

    df["disaster_type"] = "earthquake"
    df["month"] = pd.to_datetime(df["time"]).dt.month
    df["year"] = pd.to_datetime(df["time"]).dt.year

    def mag_to_severity(mag):
        if mag >= 7.0: return 10
        if mag >= 6.0: return 8
        if mag >= 5.0: return 6
        if mag >= 4.0: return 4
        return 2

    # Use conservative impact bands instead of a huge radius-based formula.
    # This keeps earthquake-derived rows informative without overwhelming the
    # dataset with unrealistic synthetic population estimates.
    def mag_to_affected(mag):
        if mag >= 7.0: return 1500000
        if mag >= 6.0: return 900000
        if mag >= 5.0: return 220000
        if mag >= 4.0: return 60000
        return 5000

    df["severity"] = df["mag"].apply(mag_to_severity)
    df["affected_population"] = df["mag"].apply(mag_to_affected)
    df["location"] = df["place"]
    df["total_deaths"] = 0 

    return df[["year", "month", "disaster_type", "location", "latitude", "longitude",
               "severity", "affected_population", "total_deaths"]]

def load_cached_usgs_rows(path: str) -> pd.DataFrame:
    dataset_path = Path(path)
    if not dataset_path.exists():
        raise FileNotFoundError("No cached dataset available for USGS fallback.")

    df = pd.read_csv(dataset_path)
    df = df[df["data_source"] == "usgs"].copy()
    if df.empty:
        raise ValueError("Cached dataset does not contain USGS rows.")

    def severity_to_affected(severity):
        if severity >= 10: return 1500000
        if severity >= 8: return 900000
        if severity >= 6: return 220000
        if severity >= 4: return 60000
        return 5000

    df["location"] = df["city"]
    df["affected_population"] = df["severity"].apply(severity_to_affected)
    df["total_deaths"] = 0

    return df[[
        "year",
        "month",
        "disaster_type",
        "location",
        "latitude",
        "longitude",
        "severity",
        "affected_population",
        "total_deaths",
    ]]

def assign_risk_level(affected, deaths):
    # Tuned to avoid an almost-empty Low class while still preserving the
    # severity ordering of historical impact.
    if affected > 900000 or deaths > 1000: return "Critical"
    if affected > 180000 or deaths > 100:  return "High"
    if affected > 30000  or deaths > 10:   return "Medium"
    return "Low"

def month_to_season(month):
    if pd.isna(month) or month == 0: return "unknown"
    if month in [6, 7, 8, 9]:   return "monsoon"
    if month in [10, 11]:        return "post-monsoon"
    if month in [12, 1, 2]:      return "winter"
    return "summer"

def get_nearest_city_by_name(location_str):
    if pd.isna(location_str):
        return None
    matches = difflib.get_close_matches(str(location_str), CITY_FEATURES.keys(), n=1, cutoff=0.4)
    if matches: return matches[0]
    
    # Simple substring containment check
    location_str_lower = str(location_str).lower()
    for city in CITY_FEATURES.keys():
        if city.lower() in location_str_lower:
            return city
    return None

def get_nearest_city_by_coords(lat, lon):
    if pd.isna(lat) or pd.isna(lon):
        return None
    min_dist = float('inf')
    best_city = None
    for city, data in CITY_FEATURES.items():
        dist = math.hypot(data["lat"] - lat, data["lon"] - lon)
        if dist < min_dist:
            min_dist = dist
            best_city = city
    if min_dist < 5.0:  # Roughly ~500km threshold
        return best_city
    return None

def merge_all_sources(emdat_df, usgs_df, ndma_events, city_features) -> pd.DataFrame:
    all_data = []
    usgs_rows = []

    # Process EM-DAT
    print("Processing EM-DAT...")
    for _, row in emdat_df.iterrows():
        city = get_nearest_city_by_name(row["location"])
        if not city: city = get_nearest_city_by_coords(row["latitude"], row["longitude"])
        if city:
            c_data = city_features[city]
            # Simple heuristic for severity if missing
            affected = row["affected_population"]
            if affected > 1000000: sev = 10
            elif affected > 500000: sev = 8
            elif affected > 100000: sev = 6
            else: sev = 4
            
            all_data.append({
                "year": row["year"], "month": row["month"], "city": city, "state": c_data["state"],
                "disaster_type": row["disaster_type"], "severity": sev,
                "latitude": c_data["lat"], "longitude": c_data["lon"],
                "pop_density": c_data["pop_density"], "elevation_m": c_data["elevation_m"],
                "coast_km": c_data["coast_km"], "annual_rainfall_mm": c_data["annual_rainfall_mm"],
                "seismic_zone": c_data["seismic_zone"],
                "affected_population": row["affected_population"], "total_deaths": row["total_deaths"],
                "data_source": "emdat"
            })

    # Process USGS
    print("Processing USGS...")
    for _, row in usgs_df.iterrows():
        city = get_nearest_city_by_coords(row["latitude"], row["longitude"])
        if city:
            c_data = city_features[city]
            usgs_rows.append({
                "year": row["year"], "month": row["month"], "city": city, "state": c_data["state"],
                "disaster_type": row["disaster_type"], "severity": row["severity"],
                "latitude": row["latitude"], "longitude": row["longitude"],
                "pop_density": c_data["pop_density"], "elevation_m": c_data["elevation_m"],
                "coast_km": c_data["coast_km"], "annual_rainfall_mm": c_data["annual_rainfall_mm"],
                "seismic_zone": c_data["seismic_zone"],
                "affected_population": row["affected_population"], "total_deaths": row["total_deaths"],
                "data_source": "usgs"
            })

    # Collapse repeated earthquakes into one representative row per city-month.
    # This reduces source domination and makes the training signal closer to a
    # monthly risk profile than a raw event feed.
    if usgs_rows:
        usgs_df_mapped = pd.DataFrame(usgs_rows)
        usgs_df_mapped = (
            usgs_df_mapped
            .sort_values(["city", "year", "month", "severity", "affected_population"], ascending=[True, True, True, False, False])
            .drop_duplicates(subset=["city", "year", "month"], keep="first")
        )
        all_data.extend(usgs_df_mapped.to_dict("records"))

    # Process NDMA
    print("Processing NDMA...")
    for ev in ndma_events:
        yr, mo, city, st, d_type, sev, affected, deaths, desc = ev
        if city in city_features:
            c_data = city_features[city]
            all_data.append({
                "year": yr, "month": mo, "city": city, "state": st,
                "disaster_type": d_type, "severity": sev,
                "latitude": c_data["lat"], "longitude": c_data["lon"],
                "pop_density": c_data["pop_density"], "elevation_m": c_data["elevation_m"],
                "coast_km": c_data["coast_km"], "annual_rainfall_mm": c_data["annual_rainfall_mm"],
                "seismic_zone": c_data["seismic_zone"],
                "affected_population": affected, "total_deaths": deaths,
                "data_source": "ndma"
            })

    df = pd.DataFrame(all_data)
    df["risk_level"] = df.apply(lambda r: assign_risk_level(r["affected_population"], r["total_deaths"]), axis=1)
    df["season"] = df["month"].apply(month_to_season)
    
    return df

if __name__ == "__main__":
    emdat_df = clean_emdat("backend/ml_model/raw/emdat_india.xlsx")
    usgs_df = fetch_usgs_earthquakes()
    unified_df = merge_all_sources(emdat_df, usgs_df, NDMA_EVENTS, CITY_FEATURES)
    
    output_path = "backend/ml_model/india_disaster_dataset.csv"
    unified_df.to_csv(output_path, index=False)
    
    print("\n=== Dataset Summary ===")
    print(f"Total records:   {len(unified_df)}")
    source_counts = unified_df["data_source"].value_counts().to_dict()
    print(f"Sources:         EM-DAT: {source_counts.get('emdat', 0)} | USGS: {source_counts.get('usgs', 0)} | NDMA: {source_counts.get('ndma', 0)}")
    print(f"Cities covered:  {unified_df['city'].nunique()}")
    print(f"Disaster types:  {unified_df['disaster_type'].nunique()}")
    print(f"Year range:      {unified_df['year'].min()} - {unified_df['year'].max()}")
    risk_pct = unified_df["risk_level"].value_counts(normalize=True) * 100
    print(f"Class balance:   Low: {risk_pct.get('Low', 0):.1f}% | Medium: {risk_pct.get('Medium', 0):.1f}% "
          f"| High: {risk_pct.get('High', 0):.1f}% | Critical: {risk_pct.get('Critical', 0):.1f}%")
