import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_predict_success():
    response = client.post(
        "/api/predict/",
        json={
            "city": "Mumbai",
            "disaster_type": "flood",
            "month": 7,
            "severity": 8.5
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "risk_level" in data
    assert "affected_population_estimate" in data
    assert "recommended_actions" in data

def test_predict_invalid_city():
    response = client.post(
        "/api/predict/",
        json={
            "city": "Gotham",
            "disaster_type": "earthquake",
            "month": 5,
            "severity": 5.0
        }
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "City not supported."

def test_predict_validation_error():
    response = client.post(
        "/api/predict/",
        json={
            "city": "Delhi",
            "disaster_type": "zombie_attack",  # Invalid type
            "month": 15,                       # Invalid month
            "severity": 11.0                   # Invalid severity
        }
    )
    assert response.status_code == 422
