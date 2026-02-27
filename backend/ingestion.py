"""
Data ingestion pipeline for pulling financial data from FMP and computing derived metrics.

This runs as a scheduled job (daily) or can be triggered manually.
Steps:
1. Pull stock list, filter to target markets
2. For each company: pull income statements + key metrics (with history)
3. Compute derived screening metrics (5yr averages, % vs average, etc.)
4. Store everything in the database
"""

import logging
import time
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.config import settings
from backend.database import SessionLocal, engine
from backend.models import Company, IncomeStatement, KeyMetric, ScreenerData
from backend.fmp_client import fmp_client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Global progress tracker
ingestion_progress = {
    "running": False,
    "phase": "",
    "current": 0,
    "total": 0,
    "current_ticker": "",
    "errors": 0,
    "started_at": None,
    "last_error": "",
}


def get_progress():
    return dict(ingestion_progress)


def parse_date(date_str: str) -> Optional[date]:
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str[:10])
    except (ValueError, TypeError):
        return None


def ingest_stock_list(db: Session) -> list[dict]:
    """Step 1: Pull all stocks, filter to target markets, upsert into companies table."""
    logger.info("Pulling stock list from FMP...")
    all_stocks = fmp_client.get_stock_list()
    logger.info(f"Got {len(all_stocks)} total stocks from FMP")

    # Filter to target exchanges and non-empty tickers
    target_exchanges = set(settings.TARGET_EXCHANGES)
    filtered = []
    for stock in all_stocks:
        ticker = stock.get("symbol", "")
        exchange = stock.get("exchangeShortName", "")
        stype = stock.get("type", "")
        if not ticker or not exchange:
            continue
        if stype and stype != "stock":
            continue
        if exchange in target_exchanges:
            filtered.append(stock)

    logger.info(f"Filtered to {len(filtered)} stocks in target markets")

    # Upsert into companies table
    for stock in filtered:
        ticker = stock["symbol"]
        exchange_short = stock.get("exchangeShortName", "")
        existing = db.query(Company).filter(
            Company.ticker == ticker,
            Company.exchange_short == exchange_short
        ).first()

        if existing:
            existing.name = stock.get("name", existing.name)
            existing.exchange = stock.get("exchange", existing.exchange)
            existing.updated_at = datetime.now(timezone.utc)
        else:
            company = Company(
                ticker=ticker,
                name=stock.get("name", ""),
                exchange=stock.get("exchange", ""),
                exchange_short=exchange_short,
                country="",  # Will be filled from profile
                sector="",
                industry="",
            )
            db.add(company)

    db.commit()
    logger.info("Stock list upserted into database")
    return filtered


def ingest_company_data(db: Session, company: Company, delay: float = 0.3):
    """Step 2: Pull financial data for a single company."""
    ticker = company.ticker
    time.sleep(delay)  # Rate limiting

    # Pull profile for sector/country info
    profile = fmp_client.get_company_profile(ticker)
    if profile:
        company.country = profile.get("country", company.country) or ""
        company.sector = profile.get("sector", company.sector) or ""
        company.industry = profile.get("industry", company.industry) or ""
    time.sleep(delay)

    # Pull annual income statements (last 7 years for 5yr averages + buffer)
    income_data = fmp_client.get_income_statements(ticker, period="annual", limit=7)
    for item in income_data:
        stmt_date = parse_date(item.get("date"))
        if not stmt_date:
            continue
        existing = db.query(IncomeStatement).filter(
            IncomeStatement.company_id == company.id,
            IncomeStatement.date == stmt_date,
            IncomeStatement.period == "annual"
        ).first()

        revenue = item.get("revenue")
        gross = item.get("grossProfit")
        rev_val = revenue if revenue and revenue != 0 else None

        values = dict(
            revenue=revenue,
            cost_of_revenue=item.get("costOfRevenue"),
            gross_profit=gross,
            gross_profit_ratio=item.get("grossProfitRatio"),
            operating_income=item.get("operatingIncome"),
            operating_income_ratio=item.get("operatingIncomeRatio"),
            ebitda=item.get("ebitda"),
            ebitda_ratio=item.get("ebitdaratio"),
            net_income=item.get("netIncome"),
            net_income_ratio=item.get("netIncomeRatio"),
            calendar_year=item.get("calendarYear"),
            revenue_growth=None,  # Computed later
        )

        if existing:
            for k, v in values.items():
                setattr(existing, k, v)
        else:
            stmt = IncomeStatement(
                company_id=company.id,
                date=stmt_date,
                period="annual",
                **values
            )
            db.add(stmt)
    time.sleep(delay)

    # Pull key metrics (annual, last 7 years)
    metrics_data = fmp_client.get_key_metrics(ticker, period="annual", limit=7)
    for item in metrics_data:
        metric_date = parse_date(item.get("date"))
        if not metric_date:
            continue
        existing = db.query(KeyMetric).filter(
            KeyMetric.company_id == company.id,
            KeyMetric.date == metric_date,
            KeyMetric.period == "annual"
        ).first()

        values = dict(
            calendar_year=item.get("calendarYear"),
            pe_ratio=item.get("peRatio"),
            forward_pe=item.get("forwardPE") or item.get("peRatio"),
            price_to_sales=item.get("priceToSalesRatio"),
            price_to_book=item.get("pbRatio"),
            ev_to_ebitda=item.get("enterpriseValueOverEBITDA"),
            ev_to_revenue=item.get("evToRevenue"),
            enterprise_value=item.get("enterpriseValue"),
            market_cap=item.get("marketCap"),
            roic=item.get("roic"),
            roe=item.get("roe"),
            roa=item.get("returnOnAssets"),
            revenue_per_share=item.get("revenuePerShare"),
            earnings_per_share=item.get("earningsYield"),
            free_cash_flow_per_share=item.get("freeCashFlowPerShare"),
            book_value_per_share=item.get("bookValuePerShare"),
            dividends_per_share=item.get("dividendYield"),
            debt_to_equity=item.get("debtToEquity"),
            net_debt_to_ebitda=item.get("netDebtToEBITDA"),
            current_ratio=item.get("currentRatio"),
            interest_coverage=item.get("interestCoverage"),
        )

        if existing:
            for k, v in values.items():
                setattr(existing, k, v)
        else:
            metric = KeyMetric(
                company_id=company.id,
                date=metric_date,
                period="annual",
                **values
            )
            db.add(metric)

    db.commit()


def compute_revenue_growth(db: Session, company: Company):
    """Compute YoY revenue growth for income statements."""
    stmts = (
        db.query(IncomeStatement)
        .filter(IncomeStatement.company_id == company.id, IncomeStatement.period == "annual")
        .order_by(IncomeStatement.date.desc())
        .all()
    )
    for i, stmt in enumerate(stmts):
        if i + 1 < len(stmts) and stmt.revenue and stmts[i + 1].revenue and stmts[i + 1].revenue != 0:
            stmt.revenue_growth = (stmt.revenue - stmts[i + 1].revenue) / abs(stmts[i + 1].revenue)
    db.commit()


def compute_screener_data(db: Session, company: Company):
    """Step 3: Compute derived screening metrics for a company."""
    # Get latest income statement
    latest_income = (
        db.query(IncomeStatement)
        .filter(IncomeStatement.company_id == company.id, IncomeStatement.period == "annual")
        .order_by(IncomeStatement.date.desc())
        .first()
    )

    # Get latest key metrics
    latest_metric = (
        db.query(KeyMetric)
        .filter(KeyMetric.company_id == company.id, KeyMetric.period == "annual")
        .order_by(KeyMetric.date.desc())
        .first()
    )

    if not latest_income and not latest_metric:
        return

    # Get historical metrics for 5yr averages (skip the most recent, use prior 5)
    historical_metrics = (
        db.query(KeyMetric)
        .filter(KeyMetric.company_id == company.id, KeyMetric.period == "annual")
        .order_by(KeyMetric.date.desc())
        .offset(1)  # Skip most recent
        .limit(5)
        .all()
    )

    historical_income = (
        db.query(IncomeStatement)
        .filter(IncomeStatement.company_id == company.id, IncomeStatement.period == "annual")
        .order_by(IncomeStatement.date.desc())
        .offset(1)
        .limit(5)
        .all()
    )

    def safe_avg(values):
        cleaned = [v for v in values if v is not None]
        return sum(cleaned) / len(cleaned) if cleaned else None

    def pct_vs_avg(current, avg):
        if current is not None and avg is not None and avg != 0:
            return (current - avg) / abs(avg)
        return None

    # Compute 5yr averages
    pe_5yr_avg = safe_avg([m.pe_ratio for m in historical_metrics])
    ev_ebitda_5yr_avg = safe_avg([m.ev_to_ebitda for m in historical_metrics])
    gross_margin_5yr_avg = safe_avg([s.gross_profit_ratio for s in historical_income])
    operating_margin_5yr_avg = safe_avg([s.operating_income_ratio for s in historical_income])
    net_margin_5yr_avg = safe_avg([s.net_income_ratio for s in historical_income])
    roic_5yr_avg = safe_avg([m.roic for m in historical_metrics])
    roe_5yr_avg = safe_avg([m.roe for m in historical_metrics])

    # Revenue growth (YoY and 3yr CAGR)
    income_stmts = (
        db.query(IncomeStatement)
        .filter(IncomeStatement.company_id == company.id, IncomeStatement.period == "annual")
        .order_by(IncomeStatement.date.desc())
        .limit(4)
        .all()
    )
    rev_growth_yoy = None
    rev_growth_3yr = None
    if len(income_stmts) >= 2 and income_stmts[0].revenue and income_stmts[1].revenue and income_stmts[1].revenue != 0:
        rev_growth_yoy = (income_stmts[0].revenue - income_stmts[1].revenue) / abs(income_stmts[1].revenue)
    if len(income_stmts) >= 4 and income_stmts[0].revenue and income_stmts[3].revenue and income_stmts[3].revenue > 0:
        rev_growth_3yr = (income_stmts[0].revenue / income_stmts[3].revenue) ** (1 / 3) - 1

    # Earnings growth
    earnings_growth_yoy = None
    if len(income_stmts) >= 2 and income_stmts[0].net_income and income_stmts[1].net_income and income_stmts[1].net_income != 0:
        earnings_growth_yoy = (income_stmts[0].net_income - income_stmts[1].net_income) / abs(income_stmts[1].net_income)

    # Current forward PE - use the latest from key_metrics
    forward_pe = latest_metric.forward_pe if latest_metric else None
    current_pe = latest_metric.pe_ratio if latest_metric else None

    # Build screener data row
    existing = db.query(ScreenerData).filter(ScreenerData.company_id == company.id).first()

    values = dict(
        ticker=company.ticker,
        name=company.name,
        exchange=company.exchange_short,
        country=company.country,
        sector=company.sector,
        industry=company.industry,

        market_cap=latest_metric.market_cap if latest_metric else None,
        enterprise_value=latest_metric.enterprise_value if latest_metric else None,
        pe_ratio=current_pe,
        forward_pe=forward_pe,
        price_to_sales=latest_metric.price_to_sales if latest_metric else None,
        price_to_book=latest_metric.price_to_book if latest_metric else None,
        ev_to_ebitda=latest_metric.ev_to_ebitda if latest_metric else None,
        ev_to_revenue=latest_metric.ev_to_revenue if latest_metric else None,

        gross_margin=latest_income.gross_profit_ratio if latest_income else None,
        operating_margin=latest_income.operating_income_ratio if latest_income else None,
        net_margin=latest_income.net_income_ratio if latest_income else None,
        ebitda_margin=latest_income.ebitda_ratio if latest_income else None,

        roic=latest_metric.roic if latest_metric else None,
        roe=latest_metric.roe if latest_metric else None,
        roa=latest_metric.roa if latest_metric else None,

        revenue_growth_yoy=rev_growth_yoy,
        revenue_growth_3yr_cagr=rev_growth_3yr,
        earnings_growth_yoy=earnings_growth_yoy,

        debt_to_equity=latest_metric.debt_to_equity if latest_metric else None,
        net_debt_to_ebitda=latest_metric.net_debt_to_ebitda if latest_metric else None,
        current_ratio=latest_metric.current_ratio if latest_metric else None,

        pe_5yr_avg=pe_5yr_avg,
        ev_ebitda_5yr_avg=ev_ebitda_5yr_avg,
        gross_margin_5yr_avg=gross_margin_5yr_avg,
        operating_margin_5yr_avg=operating_margin_5yr_avg,
        net_margin_5yr_avg=net_margin_5yr_avg,
        roic_5yr_avg=roic_5yr_avg,
        roe_5yr_avg=roe_5yr_avg,

        forward_pe_vs_5yr_pct=pct_vs_avg(forward_pe or current_pe, pe_5yr_avg),
        ev_ebitda_vs_5yr_pct=pct_vs_avg(
            latest_metric.ev_to_ebitda if latest_metric else None, ev_ebitda_5yr_avg
        ),
        gross_margin_vs_5yr_pct=pct_vs_avg(
            latest_income.gross_profit_ratio if latest_income else None, gross_margin_5yr_avg
        ),
        operating_margin_vs_5yr_pct=pct_vs_avg(
            latest_income.operating_income_ratio if latest_income else None, operating_margin_5yr_avg
        ),
        roic_vs_5yr_pct=pct_vs_avg(
            latest_metric.roic if latest_metric else None, roic_5yr_avg
        ),
        roe_vs_5yr_pct=pct_vs_avg(
            latest_metric.roe if latest_metric else None, roe_5yr_avg
        ),

        computed_at=datetime.now(timezone.utc),
    )

    if existing:
        for k, v in values.items():
            setattr(existing, k, v)
    else:
        sd = ScreenerData(company_id=company.id, **values)
        db.add(sd)

    db.commit()


def run_full_ingestion(batch_size: int = 50):
    """
    Run full data ingestion pipeline.
    This pulls data for all companies and computes screening metrics.
    For initial load, this will take a while due to API rate limits.
    """
    global ingestion_progress

    if ingestion_progress["running"]:
        logger.warning("Ingestion already running, skipping.")
        return

    ingestion_progress.update({
        "running": True, "phase": "Loading stock list", "current": 0,
        "total": 0, "current_ticker": "", "errors": 0,
        "started_at": datetime.now(timezone.utc).isoformat(), "last_error": "",
    })

    db = SessionLocal()
    try:
        # Step 1: Get stock list
        ingestion_progress["phase"] = "Pulling stock list from FMP..."
        ingest_stock_list(db)

        # Step 2: Pull data for each company
        companies = db.query(Company).filter(Company.is_active == True).all()
        total = len(companies)
        ingestion_progress["total"] = total
        ingestion_progress["phase"] = "Ingesting company data"
        logger.info(f"Starting data ingestion for {total} companies...")

        for i, company in enumerate(companies):
            try:
                ingestion_progress["current"] = i + 1
                ingestion_progress["current_ticker"] = company.ticker
                logger.info(f"[{i+1}/{total}] Ingesting {company.ticker}...")
                ingest_company_data(db, company)
                compute_revenue_growth(db, company)
                compute_screener_data(db, company)

                if (i + 1) % 100 == 0:
                    logger.info(f"Progress: {i+1}/{total} companies processed")

            except Exception as e:
                ingestion_progress["errors"] += 1
                ingestion_progress["last_error"] = f"{company.ticker}: {str(e)[:100]}"
                logger.error(f"Error ingesting {company.ticker}: {e}")
                db.rollback()
                continue

        ingestion_progress["phase"] = "Complete"
        logger.info("Full ingestion complete!")

    except Exception as e:
        ingestion_progress["phase"] = f"Failed: {str(e)[:200]}"
        ingestion_progress["last_error"] = str(e)[:200]
        logger.error(f"Ingestion failed: {e}")

    finally:
        ingestion_progress["running"] = False
        db.close()


def run_incremental_update():
    """
    Lighter update that just refreshes quotes and recomputes screener data.
    Uses batch quotes to be more API-efficient.
    """
    db = SessionLocal()
    try:
        companies = db.query(Company).filter(Company.is_active == True).all()
        tickers = [c.ticker for c in companies]
        company_map = {c.ticker: c for c in companies}

        # Batch quotes (50 at a time)
        logger.info(f"Updating quotes for {len(tickers)} companies...")
        for i in range(0, len(tickers), 50):
            batch = tickers[i:i+50]
            quotes = fmp_client.get_batch_quotes(batch)
            for q in quotes:
                ticker = q.get("symbol")
                if ticker in company_map:
                    company = company_map[ticker]
                    sd = db.query(ScreenerData).filter(ScreenerData.company_id == company.id).first()
                    if sd:
                        sd.market_cap = q.get("marketCap", sd.market_cap)
                        sd.last_price = q.get("price", sd.last_price)
                        sd.pe_ratio = q.get("pe", sd.pe_ratio)
            time.sleep(0.3)

        db.commit()
        logger.info("Incremental update complete!")

    finally:
        db.close()


if __name__ == "__main__":
    from backend.database import init_db
    init_db()
    run_full_ingestion()
