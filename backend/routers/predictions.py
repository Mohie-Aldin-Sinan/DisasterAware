import logging
import json
import joblib
import pandas as pd
import numpy as np
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Literal
from cachetools import TTLCache
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from database import get_session
from models import DisasterEvent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# Memory Cache for fast API lookups without Redis
cache = TTLCache(maxsize=100, ttl=3600)  # 1 hour cache
usgs_cache = TTLCache(maxsize=10, ttl=60)  # 60 seconds cache

from constants import CITY_FEATURES
from limiter import limiter

MODULE_DIR = Path(__file__).resolve().parent.parent / "ml_model"
MODEL_PATH = MODULE_DIR / "disaster_model.pkl"
LABEL_ENC_PATH = MODULE_DIR / "label_encoder.pkl"
METRICS_PATH = MODULE_DIR / "model_metrics.json"
SHAP_PATH = MODULE_DIR / "feature_importance.json"
FALLBACK_SEISMIC_EVENTS = [
    {
        "id": "fallback-delhi",
        "place": "Northern India reference event",
        "magnitude": 4.6,
        "depth_km": 18.0,
        "lat": 28.6139,
        "lon": 77.2090,
        "time_iso": datetime(2026, 4, 1, tzinfo=timezone.utc).isoformat(),
        "time_ago": "reference sample",
    },
    {
        "id": "fallback-gujarat",
        "place": "Western India reference event",
        "magnitude": 5.1,
        "depth_km": 22.0,
        "lat": 23.0225,
        "lon": 72.5714,
        "time_iso": datetime(2026, 4, 3, tzinfo=timezone.utc).isoformat(),
        "time_ago": "reference sample",
    },
    {
        "id": "fallback-assam",
        "place": "Northeastern India reference event",
        "magnitude": 4.9,
        "depth_km": 31.0,
        "lat": 26.1445,
        "lon": 91.7362,
        "time_iso": datetime(2026, 4, 6, tzinfo=timezone.utc).isoformat(),
        "time_ago": "reference sample",
    },
]

try:
    _model = joblib.load(MODEL_PATH)
    _label_encoder = joblib.load(LABEL_ENC_PATH)
    with open(METRICS_PATH, "r") as f:
        _model_metrics = json.load(f)
    with open(SHAP_PATH, "r") as f:
        _feature_importances = json.load(f)
    logger.info("ML pipeline loaded successfully.")
except Exception as exc:
    _model = None
    _label_encoder = None
    _model_metrics = {}
    _feature_importances = {}
    logger.critical("Failed to load ML pipeline: %s", exc)

def month_to_season(month):
    if month in [6, 7, 8, 9]: return "monsoon"
    if month in [10, 11]: return "post-monsoon"
    if month in [12, 1, 2]: return "winter"
    return "summer"

def get_recommended_actions(risk_level, disaster_type):
    actions = []
    if risk_level in ["High", "Critical"]:
        actions.append("Evacuate low-lying and vulnerable areas immediately.")
        actions.append("Stock emergency supplies for at least 72 hours.")
    else:
        actions.append("Stay informed via local weather authorities.")
        actions.append("Review emergency preparedness kits.")
        
    if disaster_type == "flood":
        actions.append("Move to higher ground.")
        actions.append("Do not walk or drive through flood waters.")
    elif disaster_type == "earthquake":
        actions.append("Drop, cover, and hold on.")
        actions.append("Stay away from windows.")
    elif disaster_type == "cyclone":
        actions.append("Secure loose outdoor objects.")
        actions.append("Stay indoors away from windows.")
    return actions

def get_top_risk_factors(disaster_type, season, severity):
    factors = []
    top_keys = list(_feature_importances.keys())[:5] if _feature_importances else []
    if severity >= 7: factors.append("High event severity")
    if season == "monsoon" and disaster_type == "flood": factors.append("Peak monsoon season")
    if "coastal_vulnerability" in top_keys or disaster_type == "cyclone": factors.append("Coastal proximity")
    if "seismic_risk" in top_keys and disaster_type == "earthquake": factors.append("High seismic zone")
    if not factors: factors = ["Historical trends", "Population density", "Local typography"]
    return factors[:3]

class PredictionRequest(BaseModel):
    city: str
    disaster_type: Literal['flood', 'cyclone', 'earthquake', 'tsunami', 'drought', 'landslide', 'heatwave', 'wildfire']
    month: int = Field(..., ge=1, le=12)
    severity: float = Field(default=5.0, ge=0.0, le=10.0)

@router.post("/predict/")
@limiter.limit("10/minute")
def predict_disaster(request: Request, req: PredictionRequest, session: Session = Depends(get_session)):
    if _model is None:
        raise HTTPException(status_code=503, detail="Prediction model is unavailable.")

    city = req.city
    disaster_type = req.disaster_type.lower()
    month = req.month
    severity = req.severity

    if city not in CITY_FEATURES:
        raise HTTPException(status_code=400, detail="City not supported.")

    c_data = CITY_FEATURES[city]
    input_dict = {
        "severity": severity, "pop_density": c_data["pop_density"],
        "elevation_m": c_data["elevation_m"], "coast_km": c_data["coast_km"],
        "annual_rainfall_mm": c_data["annual_rainfall_mm"], "disaster_type": disaster_type,
        "season": month_to_season(month), "city": city, "seismic_zone": c_data["seismic_zone"],
        "is_monsoon": 1 if month in [6, 7, 8, 9] else 0,
        "is_cyclone_season": 1 if month in [4, 5, 10, 11] else 0,
        "coastal_vulnerability": 3.0 if c_data["coast_km"] < 50 else (1.8 if c_data["coast_km"] < 200 else (1.2 if c_data["coast_km"] < 500 else 1.0)),
        "urban_risk_score": (c_data["pop_density"] * severity) / 10000,
        "elevation_risk": 1.8 if c_data["elevation_m"] < 30 else (1.3 if c_data["elevation_m"] < 100 else (1.4 if c_data["elevation_m"] > 500 else 1.0)),
        "seismic_risk": c_data["seismic_zone"] / 5.0,
        "rainfall_risk": 1.5 if c_data["annual_rainfall_mm"] > 2500 else (1.4 if c_data["annual_rainfall_mm"] < 500 else 1.0),
        "death_log": max(0, float((c_data["pop_density"] * severity) / 50000))
    }

    df_input = pd.DataFrame([input_dict])
    pred_idx = _model.predict(df_input)[0]
    pred_proba = _model.predict_proba(df_input)[0]
    risk_level = _label_encoder.inverse_transform([pred_idx])[0]
    
    risk_map = {"Critical": 0.9, "High": 0.75, "Medium": 0.45, "Low": 0.15}
    
    affected_pop = int((c_data["pop_density"] * severity * input_dict["death_log"]) / max(1, input_dict["seismic_zone"])) if input_dict["death_log"] > 0 else int(c_data["pop_density"] * severity * 1.5)
    
    # Save the history implicitly for NCDA DB feature
    historical_event = DisasterEvent(
        city=city,
        state=c_data["state"],
        date=datetime.utcnow().date(),
        disaster_type=disaster_type,
        severity=int(severity),
        risk_level=risk_level,
        affected_population=affected_pop,
        total_deaths=int(input_dict["death_log"]),
        lat=c_data["lat"],
        lon=c_data["lon"],
        description=f"Predicted {disaster_type} evaluation.",
        data_source="prediction",
    )
    session.add(historical_event)
    session.commit()
    
    return {
        "risk_level": risk_level,
        "risk_score": risk_map.get(risk_level, 0.5),
        "confidence": round(float(np.max(pred_proba)), 2),
        "affected_population_estimate": affected_pop,
        "key_risk_factors": get_top_risk_factors(disaster_type, input_dict["season"], severity),
        "recommended_actions": get_recommended_actions(risk_level, disaster_type),
        "model_accuracy": _model_metrics.get("accuracy", 0.0),
        "data_sources": _model_metrics.get("data_sources", [])
    }

@router.get("/model-info/")
def get_model_info():
    return {"metrics": _model_metrics, "feature_importances": _feature_importances}

@router.get("/city-risks/")
def get_city_risks():
    if "city_risks_data" in cache:
        return {"data": cache["city_risks_data"]}

    if _model is None:
        raise HTTPException(status_code=503, detail="Prediction model is unavailable.")

    current_month = datetime.now().month
    season = month_to_season(current_month)
    
    if season == "monsoon": disaster_type = "flood"
    elif season == "summer": disaster_type = "heatwave"
    elif season == "post-monsoon": disaster_type = "cyclone"
    else: disaster_type = "earthquake"

    results = []
    df_rows = []
    
    for city, c_data in CITY_FEATURES.items():
        severity = 6.0
        input_dict = {
            "severity": severity, "pop_density": c_data["pop_density"],
            "elevation_m": c_data["elevation_m"], "coast_km": c_data["coast_km"],
            "annual_rainfall_mm": c_data["annual_rainfall_mm"], "disaster_type": disaster_type,
            "season": season, "city": city, "seismic_zone": c_data["seismic_zone"],
            "is_monsoon": 1 if current_month in [6, 7, 8, 9] else 0,
            "is_cyclone_season": 1 if current_month in [4, 5, 10, 11] else 0,
            "coastal_vulnerability": 3.0 if c_data["coast_km"] < 50 else (1.8 if c_data["coast_km"] < 200 else (1.2 if c_data["coast_km"] < 500 else 1.0)),
            "urban_risk_score": (c_data["pop_density"] * severity) / 10000,
            "elevation_risk": 1.8 if c_data["elevation_m"] < 30 else (1.3 if c_data["elevation_m"] < 100 else (1.4 if c_data["elevation_m"] > 500 else 1.0)),
            "seismic_risk": c_data["seismic_zone"] / 5.0,
            "rainfall_risk": 1.5 if c_data["annual_rainfall_mm"] > 2500 else (1.4 if c_data["annual_rainfall_mm"] < 500 else 1.0),
            "death_log": max(0, float((c_data["pop_density"] * severity) / 50000))
        }
        df_rows.append(input_dict)
        
    df_input = pd.DataFrame(df_rows)
    pred_idx = _model.predict(df_input)
    
    risk_labels = _label_encoder.inverse_transform(pred_idx)
    risk_map = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    
    for i, city in enumerate(CITY_FEATURES.keys()):
        results.append({
            "city": city,
            "lat": CITY_FEATURES[city]["lat"],
            "lon": CITY_FEATURES[city]["lon"],
            "risk_level": risk_labels[i],
            "severity": risk_map.get(risk_labels[i], 1)
        })

    cache["city_risks_data"] = results
    return {"data": results}

@router.get("/history/")
def get_history(session: Session = Depends(get_session), city: Optional[str] = Query(None), type: Optional[str] = Query(None)):
    query = select(DisasterEvent).order_by(DisasterEvent.date.desc())
    if city:
        query = query.where(DisasterEvent.city.ilike(city))
    if type:
        query = query.where(DisasterEvent.disaster_type.ilike(type))
        
    results = session.exec(query.limit(50)).all()
    # Pydantic/SQLModel serialization is automatic, but we return dicts to be safe
    return {"data": [r.model_dump() for r in results]}

@router.get("/usgs-proxy/")
def get_usgs_proxy():
    if "data" in usgs_cache:
        return {"data": usgs_cache["data"]}

    try:
        url = (
            "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson"
            "&minlatitude=8.0&maxlatitude=37.0"
            "&minlongitude=68.0&maxlongitude=97.5"
            "&limit=50&orderby=time"
        )
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            content = json.loads(response.read().decode("utf-8"))
            
        features = content.get("features", [])
        data = []
        for feat in features:
            props = feat["properties"]
            geom = feat["geometry"]["coordinates"]
            time_iso = datetime.fromtimestamp(props["time"]/1000.0, timezone.utc).isoformat()
            
            diff = datetime.now(timezone.utc) - datetime.fromtimestamp(props["time"]/1000.0, timezone.utc)
            if diff.days > 0: time_ago = f"{diff.days} days ago"
            elif diff.seconds // 3600 > 0: time_ago = f"{diff.seconds // 3600} hours ago"
            else: time_ago = f"{diff.seconds // 60} minutes ago"

            data.append({
                "id": feat["id"],
                "place": props["place"],
                "magnitude": props["mag"],
                "depth_km": geom[2],
                "lat": geom[1],
                "lon": geom[0],
                "time_iso": time_iso,
                "time_ago": time_ago
            })
            
        usgs_cache["data"] = data
        return {"data": data}
    except Exception as exc:
        logger.warning(f"USGS proxy failed: {exc}")
        return {"data": FALLBACK_SEISMIC_EVENTS, "fallback": True}
