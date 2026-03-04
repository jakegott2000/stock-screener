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
    """Get database statistics including sync status."""
    from backend.models import Company, ScreenerData
    from sqlalchemy import func
    total_companies = db.query(Company).count()
    screened_companies = db.query(ScreenerData).count()
    # Count companies with actual data (non-null gross_margin as proxy)
    synced_with_data = db.query(func.count(ScreenerData.id)).filter(
        ScreenerData.gross_margin.isnot(None)
    ).scalar()
    progress = get_progress()
    return {
        "total_companies": total_companies,
        "screened_companies": screened_companies,
        "synced_with_data": synced_with_data,
        "sync_running": progress.get("running", False),
        "sync_phase": progress.get("phase", ""),
        "sync_current": progress.get("current", 0),
        "sync_total": progress.get("total", 0),
        "sync_errors": progress.get("errors", 0),
        "sync_current_ticker": progress.get("current_ticker", ""),
    }


@app.get("/api/admin/progress")
def get_ingestion_progress(user: str = Depends(get_current_user)):
    """Get current ingestion progress."""
    return get_progress()


@app.get("/api/admin/data-quality")
def get_data_quality(user: str = Depends(get_current_user), db=Depends(get_db)):
    """Check how many screener_data rows have non-null values for each key field.
    Helps diagnose which metrics are actually populated."""
    from backend.models import ScreenerData
    from sqlalchemy import func

    total = db.query(func.count(ScreenerData.id)).scalar()
    if total == 0:
        return {"total": 0, "fields": {}}

    fields_to_check = [
        "market_cap", "enterprise_value", "pe_ratio", "forward_pe",
        "price_to_sales", "price_to_book", "ev_to_ebitda", "ev_to_revenue",
        "gross_margin", "operating_margin", "net_margin", "ebitda_margin",
        "roic", "roe", "roa",
        "revenue_growth_yoy", "revenue_growth_3yr_cagr", "earnings_growth_yoy",
        "debt_to_equity", "net_debt_to_ebitda", "current_ratio",
        "pe_5yr_avg", "ev_ebitda_5yr_avg", "gross_margin_5yr_avg",
        "forward_pe_vs_5yr_pct", "gross_margin_vs_5yr_pct",
    ]

    field_stats = {}
    for field_name in fields_to_check:
        col = getattr(ScreenerData, field_name, None)
        if col is not None:
            non_null = db.query(func.count(ScreenerData.id)).filter(col.isnot(None)).scalar()
            field_stats[field_name] = {
                "non_null": non_null,
                "pct": round(non_null / total * 100, 1),
            }

    # Also grab a sample row to show raw values
    sample = db.query(ScreenerData).filter(ScreenerData.market_cap.isnot(None)).order_by(ScreenerData.market_cap.desc()).first()
    sample_dict = None
    if sample:
        sample_dict = {f: getattr(sample, f, None) for f in fields_to_check}
        sample_dict["ticker"] = sample.ticker
        sample_dict["name"] = sample.name

    return {"total": total, "fields": field_stats, "sample_top_company": sample_dict}


# ===== FMP API Diagnostic =====

@app.get("/api/admin/fmp-debug")
def fmp_debug(user: str = Depends(get_current_user)):
    """
    Hit FMP API for AAPL and return raw field names from each endpoint.
    This tells us exactly what keys the stable API returns so we can fix mappings.
    """
    from backend.fmp_client import fmp_client
    import time

    results = {}

    # 1) Key Metrics - this is where most valuation fields come from
    try:
        km = fmp_client.get_key_metrics("AAPL", period="annual", limit=1)
        if km and len(km) > 0:
            results["key_metrics_fields"] = sorted(km[0].keys())
            results["key_metrics_sample"] = km[0]
        else:
            results["key_metrics"] = "EMPTY or None"
    except Exception as e:
        results["key_metrics_error"] = str(e)[:300]

    time.sleep(0.3)

    # 2) Income Statement - margins come from here
    try:
        inc = fmp_client.get_income_statements("AAPL", period="annual", limit=1)
        if inc and len(inc) > 0:
            results["income_statement_fields"] = sorted(inc[0].keys())
            results["income_statement_sample"] = inc[0]
        else:
            results["income_statement"] = "EMPTY or None"
    except Exception as e:
        results["income_statement_error"] = str(e)[:300]

    time.sleep(0.3)

    # 3) Ratios - ROA and other ratios
    try:
        ratios = fmp_client.get_financial_ratios("AAPL", period="annual", limit=1)
        if ratios and len(ratios) > 0:
            results["ratios_fields"] = sorted(ratios[0].keys())
            results["ratios_sample"] = ratios[0]
        else:
            results["ratios"] = "EMPTY or None"
    except Exception as e:
        results["ratios_error"] = str(e)[:300]

    time.sleep(0.3)

    # 4) Profile - forward PE and sector info
    try:
        profile = fmp_client.get_company_profile("AAPL")
        if profile:
            results["profile_fields"] = sorted(profile.keys())
            results["profile_sample"] = profile
        else:
            results["profile"] = "EMPTY or None"
    except Exception as e:
        results["profile_error"] = str(e)[:300]

    # 5) Analyst Estimates - forward revenue, EPS, EBITDA
    time.sleep(0.3)
    try:
        est = fmp_client._get("analyst-estimates", {"symbol": "AAPL", "period": "annual", "limit": 3})
        if est and isinstance(est, list) and len(est) > 0:
            results["analyst_estimates_fields"] = sorted(est[0].keys())
            results["analyst_estimates_sample"] = est[0]
            results["analyst_estimates_count"] = len(est)
        else:
            results["analyst_estimates"] = f"EMPTY or None (raw: {str(est)[:200]})"
    except Exception as e:
        results["analyst_estimates_error"] = str(e)[:300]

    # 6) Earnings Surprises (might have forward EPS)
    time.sleep(0.3)
    try:
        earn = fmp_client._get("earnings-surprises", {"symbol": "AAPL"})
        if earn and isinstance(earn, list) and len(earn) > 0:
            results["earnings_surprises_fields"] = sorted(earn[0].keys())
            results["earnings_surprises_sample"] = earn[0]
        else:
            results["earnings_surprises"] = f"EMPTY or None"
    except Exception as e:
        results["earnings_surprises_error"] = str(e)[:300]

    # 7) Forward valuation / company outlook
    time.sleep(0.3)
    try:
        outlook = fmp_client._get("company-outlook", {"symbol": "AAPL"})
        if outlook and isinstance(outlook, dict):
            results["company_outlook_keys"] = sorted(outlook.keys())
            # Only return field names from nested sections to keep response small
            for k, v in outlook.items():
                if isinstance(v, list) and len(v) > 0:
                    results[f"outlook_{k}_fields"] = sorted(v[0].keys()) if isinstance(v[0], dict) else "non-dict"
                elif isinstance(v, dict):
                    results[f"outlook_{k}_fields"] = sorted(v.keys())
        else:
            results["company_outlook"] = f"EMPTY or None (raw: {str(outlook)[:200]})"
    except Exception as e:
        results["company_outlook_error"] = str(e)[:300]

    # 8) Short interest / shares float
    time.sleep(0.3)
    try:
        sf = fmp_client._get("shares-float", {"symbol": "AAPL"})
        if sf and isinstance(sf, list) and len(sf) > 0:
            results["shares_float_fields"] = sorted(sf[0].keys())
            results["shares_float_sample"] = sf[0]
        elif sf and isinstance(sf, dict):
            results["shares_float_fields"] = sorted(sf.keys())
            results["shares_float_sample"] = sf
        else:
            results["shares_float"] = f"EMPTY or None (raw: {str(sf)[:200]})"
    except Exception as e:
        results["shares_float_error"] = str(e)[:300]

    return results


# ===== Search Endpoint =====

@app.get("/api/search")
def search_stocks(q: str, user: str = Depends(get_current_user), db=Depends(get_db)):
    """Search for stocks by ticker or company name. Returns up to 20 matches with all screener fields."""
    from backend.models import ScreenerData
    from backend.screener import SCREENER_FIELDS
    if not q or len(q) < 1:
        return []
    query = db.query(ScreenerData).filter(
        (ScreenerData.ticker.ilike(f"%{q}%")) | (ScreenerData.name.ilike(f"%{q}%"))
    ).order_by(ScreenerData.market_cap.desc().nullslast()).limit(20).all()

    results = []
    for r in query:
        row = {}
        for field_name in SCREENER_FIELDS:
            row[field_name] = getattr(r, field_name, None)
        results.append(row)
    return results


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
            "operating_margin": sd.operating_margin if sd else None,
            "roic": sd.roic if sd else None,
            "revenue_growth_yoy": sd.revenue_growth_yoy if sd else None,
            "forward_pe_vs_5yr_pct": sd.forward_pe_vs_5yr_pct if sd else None,
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


# ===== Saved Screens Endpoints =====

class SaveScreenRequest(BaseModel):
    name: str
    filters: list[dict]


class UpdateScreenRequest(BaseModel):
    name: str | None = None
    filters: list[dict] | None = None


@app.get("/api/screens")
def list_saved_screens(user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import SavedScreen
    import json
    screens = db.query(SavedScreen).order_by(SavedScreen.updated_at.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "filters": json.loads(s.filters_json),
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in screens
    ]


@app.post("/api/screens")
def save_screen(req: SaveScreenRequest, user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import SavedScreen
    import json
    screen = SavedScreen(name=req.name, filters_json=json.dumps(req.filters))
    db.add(screen)
    db.commit()
    db.refresh(screen)
    return {"id": screen.id, "name": screen.name, "status": "saved"}


@app.put("/api/screens/{screen_id}")
def update_screen(screen_id: int, req: UpdateScreenRequest, user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import SavedScreen
    import json
    screen = db.query(SavedScreen).filter(SavedScreen.id == screen_id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    if req.name is not None:
        screen.name = req.name
    if req.filters is not None:
        screen.filters_json = json.dumps(req.filters)
    db.commit()
    return {"id": screen.id, "name": screen.name, "status": "updated"}


@app.delete("/api/screens/{screen_id}")
def delete_screen(screen_id: int, user: str = Depends(get_current_user), db=Depends(get_db)):
    from backend.models import SavedScreen
    screen = db.query(SavedScreen).filter(SavedScreen.id == screen_id).first()
    if not screen:
        raise HTTPException(status_code=404, detail="Screen not found")
    db.delete(screen)
    db.commit()
    return {"status": "deleted"}


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
