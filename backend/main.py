from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, engine
from config import settings
from routers import predictions
from contextlib import asynccontextmanager
from limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from sqlalchemy import text
from seed import ensure_seed_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    ensure_seed_data(verbose=False)
    yield

app = FastAPI(title="DisasterAware API", version="2.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS
cors_origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predictions.router)

@app.get("/status/")
def get_status():
    db_status = "disconnected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception:
        pass
    
    timestamp = predictions._model_metrics.get("trained_at", "unknown") if hasattr(predictions, "_model_metrics") else "unknown"
    return {
        "status": "ok",
        "model_loaded": predictions._model is not None,
        "model_version": timestamp,
        "db_status": db_status
    }
