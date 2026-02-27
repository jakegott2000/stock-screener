import os
import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler

from backend.config import settings
from backend.database import get_db, init_db, SessionLocal
from backend.auth import verify_password, create_access_token, get_current_user
from backend.screener import run_screen, get_field_definitions
from backend.ingestion import run_full_ingestion, run_incremental_update, get_progress
from backend.fmp_client import fmp_client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Scheduler for daily data refresh
scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    logger.info("Database initialized")

    # Schedule daily full ingestion at 5 AM UTC
    scheduler.add_job(run_full_ingestion, "cron", hour=5, minute=0, id="daily_ingestion")
    # Schedule incremental quote updates every 4 hours
    scheduler.add_job(run_incremental_update, "interval", hours=4, id="quote_update")
    scheduler.start()
    logger.info("Scheduler started")

    yield

    # Shutdown
    scheduler.shutdown()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== Auth Endpoints =====

class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@app.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if not verify_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )
    token = create_access_token()
    return LoginResponse(access_token=token)


@app.get("/api/auth/verify")
def verify_token(user: str = Depends(get_current_user)):
    return {"status": "ok", "user": user}


# ===== Screener Endpoints =====

class ScreenFilter(BaseModel):
    field: str
    operator: str = "gte"
    value: float | list[float] | str | None = None


class ScreenRequest(BaseModel):
    filters: list[ScreenFilter] = []
    sort_by: str = "market_cap"
    sort_dir: str = "desc"
    limit: int = 100
    offset: int = 0


@app.post("/api/screen")
def screen(req: ScreenRequest, user: str = Depends(get_current_user), db=Depends(get_db)):
    filters = [f.model_dump() for f in req.filters]
    result = run_screen(
        db=db,
        filters=filters,
        sort_by=req.sort_by,
        sort_dir=req.sort_dir,
        limit=req.limit,
        offset=req.offset,
    )
    return result


@app.get("/api/fields")
def fields(user: str = Depends(get_current_user)):
    return get_field_definitions()


# ===== Data Management Endpoints =====

@app.post("/api/admin/ingest")
def trigger_ingestion(user: str = Depends(get_current_user)):
    """Trigger a full data ingestion in the background."""
    thread = threading.Thread(target=run_full_ingestion, daemon=True)
    thread.start()
    return {"status": "ingestion_started", "message": "Full data ingestion started in background"}


@app.post("/api/admin/update-quotes")
def trigger_quote_update(user: str = Depends(get_current_user)):
    """Trigger an incremental quote update."""
    thread = threading.Thread(target=run_incremental_update, daemon=True)
    thread.start()
    return {"status": "update_started", "message": "Quote update started in background"}


@app.get("/api/admin/stats")
def get_stats(user: str = Depends(get_current_user), db=Depends(get_db)):
    """Get database statistics."""
    from backend.models import Company, ScreenerData
    total_companies = db.query(Company).count()
    screened_companies = db.query(ScreenerData).count()
    return {
        "total_companies": total_companies,
        "screened_companies": screened_companies,
    }


@app.get("/api/admin/progress")
def get_ingestion_progress(user: str = Depends(get_current_user)):
    """Get current ingestion progress."""
    return get_progress()


@app.get("/api/admin/test-fmp")
def test_fmp_connection(user: str = Depends(get_current_user)):
    """Test FMP API connection."""
    return fmp_client.test_connection()


@app.get("/api/admin/errors")
def get_ingestion_errors(user: str = Depends(get_current_user)):
    """Get last ingestion error if any."""
    progress = get_progress()
    return {
        "last_error": progress.get("last_error", ""),
        "error_count": progress.get("errors", 0),
        "phase": progress.get("phase", ""),
    }


# ===== Watchlist Endpoints =====

class WatchlistAddRequest(BaseModel):
    ticker: str
    notes: str = ""


class WatchlistUpdateRequest(BaseModel):
    notes: str = ""


@app.get("/api/watchlist")
def get_watchlist(user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import WatchlistItem, ScreenerData
    items = db.query(WatchlistItem).order_by(WatchlistItem.added_at.desc()).all()
    result = []
    for item in items:
        sd = db.query(ScreenerData).filter(ScreenerData.ticker == item.ticker).first()
        row = {
            "id": item.id,
            "ticker": item.ticker,
            "notes": item.notes,
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "name": sd.name if sd else None,
            "market_cap": sd.market_cap if sd else None,
            "last_price": sd.last_price if sd else None,
            "forward_pe": sd.forward_pe if sd else None,
            "ev_to_ebitda": sd.ev_to_ebitda if sd else None,
            "gross_margin": sd.gross_margin if sd else None,
            "revenue_growth_yoy": sd.revenue_growth_yoy if sd else None,
            "sector": sd.sector if sd else None,
        }
        result.append(row)
    return result


@app.post("/api/watchlist")
def add_to_watchlist(req: WatchlistAddRequest, user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import WatchlistItem
    existing = db.query(WatchlistItem).filter(WatchlistItem.ticker == req.ticker.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in watchlist")
    item = WatchlistItem(ticker=req.ticker.upper(), notes=req.notes)
    db.add(item)
    db.commit()
    return {"status": "added", "ticker": req.ticker.upper()}


@app.delete("/api/watchlist/{ticker}")
def remove_from_watchlist(ticker: str, user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import WatchlistItem
    item = db.query(WatchlistItem).filter(WatchlistItem.ticker == ticker.upper()).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not in watchlist")
    db.delete(item)
    db.commit()
    return {"status": "removed", "ticker": ticker.upper()}


@app.get("/api/watchlist/tickers")
def get_watchlist_tickers(user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import WatchlistItem
    items = db.query(WatchlistItem.ticker).all()
    return [i[0] for i in items]


# ===== Serve Frontend =====

# In production, the built frontend will be at /app/frontend/dist
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve static files if the frontend build exists
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Serve index.html for all non-API routes (SPA routing)
        file_path = FRONTEND_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(FRONTEND_DIR / "index.html"))
