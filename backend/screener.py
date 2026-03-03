"""
Screening engine — translates filter criteria into SQL queries against the screener_data table.

Filter format from the frontend:
{
    "filters": [
        {"field": "market_cap", "operator": "gte", "value": 800000000},
        {"field": "forward_pe_vs_5yr_pct", "operator": "gte", "value": 0.0},
        {"field": "gross_margin_vs_5yr_pct", "operator": "gte", "value": 0.20},
    ],
    "sort_by": "market_cap",
    "sort_dir": "desc",
    "limit": 100,
    "offset": 0
}
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, and_

from backend.models import ScreenerData

logger = logging.getLogger(__name__)

# All fields available for filtering/display
SCREENER_FIELDS = {
    # Identifiers
    "ticker": {"label": "Ticker", "type": "string"},
    "name": {"label": "Company Name", "type": "string"},
    "exchange": {"label": "Exchange", "type": "string"},
    "country": {"label": "Country", "type": "string"},
    "sector": {"label": "Sector", "type": "string"},
    "industry": {"label": "Industry", "type": "string"},

    # Valuation
    "market_cap": {"label": "Market Cap", "type": "number", "format": "currency_compact"},
    "enterprise_value": {"label": "Enterprise Value", "type": "number", "format": "currency_compact"},
    "pe_ratio": {"label": "P/E Ratio (TTM)", "type": "number", "format": "decimal2"},
    "forward_pe": {"label": "Forward P/E", "type": "number", "format": "decimal2"},
    "price_to_sales": {"label": "Price/Sales", "type": "number", "format": "decimal2"},
    "price_to_book": {"label": "Price/Book", "type": "number", "format": "decimal2"},
    "ev_to_ebitda": {"label": "EV/EBITDA", "type": "number", "format": "decimal2"},
    "ev_to_revenue": {"label": "EV/Revenue", "type": "number", "format": "decimal2"},

    # Profitability
    "gross_margin": {"label": "Gross Margin", "type": "number", "format": "percent"},
    "operating_margin": {"label": "Operating Margin", "type": "number", "format": "percent"},
    "net_margin": {"label": "Net Margin", "type": "number", "format": "percent"},
    "ebitda_margin": {"label": "EBITDA Margin", "type": "number", "format": "percent"},

    # Returns
    "roic": {"label": "ROIC", "type": "number", "format": "percent"},
    "roe": {"label": "ROE", "type": "number", "format": "percent"},
    "roa": {"label": "ROA", "type": "number", "format": "percent"},

    # Growth
    "revenue_growth_yoy": {"label": "Revenue Growth (YoY)", "type": "number", "format": "percent"},
    "revenue_growth_3yr_cagr": {"label": "Revenue Growth (3yr CAGR)", "type": "number", "format": "percent"},
    "earnings_growth_yoy": {"label": "Earnings Growth (YoY)", "type": "number", "format": "percent"},

    # Balance Sheet
    "debt_to_equity": {"label": "Debt/Equity", "type": "number", "format": "decimal2"},
    "net_debt_to_ebitda": {"label": "Net Debt/EBITDA", "type": "number", "format": "decimal2"},
    "current_ratio": {"label": "Current Ratio", "type": "number", "format": "decimal2"},

    # Short Interest
    "short_percent_float": {"label": "Short % Float", "type": "number", "format": "percent"},
    "short_ratio": {"label": "Short Ratio", "type": "number", "format": "decimal2"},

    # Historical Averages
    "pe_5yr_avg": {"label": "P/E (5yr Avg)", "type": "number", "format": "decimal2"},
    "ev_ebitda_5yr_avg": {"label": "EV/EBITDA (5yr Avg)", "type": "number", "format": "decimal2"},
    "gross_margin_5yr_avg": {"label": "Gross Margin (5yr Avg)", "type": "number", "format": "percent"},
    "operating_margin_5yr_avg": {"label": "Op. Margin (5yr Avg)", "type": "number", "format": "percent"},
    "net_margin_5yr_avg": {"label": "Net Margin (5yr Avg)", "type": "number", "format": "percent"},
    "roic_5yr_avg": {"label": "ROIC (5yr Avg)", "type": "number", "format": "percent"},
    "roe_5yr_avg": {"label": "ROE (5yr Avg)", "type": "number", "format": "percent"},

    # % vs Historical
    "forward_pe_vs_5yr_pct": {"label": "Forward P/E vs 5yr Avg (%)", "type": "number", "format": "percent_change"},
    "ev_ebitda_vs_5yr_pct": {"label": "EV/EBITDA vs 5yr Avg (%)", "type": "number", "format": "percent_change"},
    "gross_margin_vs_5yr_pct": {"label": "Gross Margin vs 5yr Avg (%)", "type": "number", "format": "percent_change"},
    "operating_margin_vs_5yr_pct": {"label": "Op. Margin vs 5yr Avg (%)", "type": "number", "format": "percent_change"},
    "roic_vs_5yr_pct": {"label": "ROIC vs 5yr Avg (%)", "type": "number", "format": "percent_change"},
    "roe_vs_5yr_pct": {"label": "ROE vs 5yr Avg (%)", "type": "number", "format": "percent_change"},
}

OPERATORS = {
    "gt": lambda col, val: col > val,
    "gte": lambda col, val: col >= val,
    "lt": lambda col, val: col < val,
    "lte": lambda col, val: col <= val,
    "eq": lambda col, val: col == val,
    "neq": lambda col, val: col != val,
    "between": lambda col, val: and_(col >= val[0], col <= val[1]),
    "contains": lambda col, val: col.ilike(f"%{val}%"),
}


def run_screen(db: Session, filters: list[dict], sort_by: str = "market_cap",
               sort_dir: str = "desc", limit: int = 100, offset: int = 0) -> dict:
    """
    Execute a screen against the screener_data table.

    Returns:
        {
            "results": [list of company dicts],
            "total": total count matching filters,
            "limit": limit,
            "offset": offset
        }
    """
    query = db.query(ScreenerData)

    # Apply filters
    conditions = []
    for f in filters:
        field_name = f.get("field")
        operator = f.get("operator", "gte")
        value = f.get("value")

        if field_name not in SCREENER_FIELDS:
            logger.warning(f"Unknown field: {field_name}")
            continue

        col = getattr(ScreenerData, field_name, None)
        if col is None:
            continue

        op_func = OPERATORS.get(operator)
        if op_func is None:
            logger.warning(f"Unknown operator: {operator}")
            continue

        # Ensure the field is not null
        conditions.append(col.isnot(None))
        conditions.append(op_func(col, value))

    if conditions:
        query = query.filter(and_(*conditions))

    # Count total matches
    total = query.count()

    # Sort
    sort_col = getattr(ScreenerData, sort_by, ScreenerData.market_cap)
    if sort_dir == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    # Paginate
    results = query.offset(offset).limit(limit).all()

    # Convert to dicts
    result_dicts = []
    for r in results:
        row = {}
        for field_name in SCREENER_FIELDS:
            val = getattr(r, field_name, None)
            row[field_name] = val
        result_dicts.append(row)

    return {
        "results": result_dicts,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def get_field_definitions() -> dict:
    """Return field definitions for the frontend to build the filter UI."""
    return SCREENER_FIELDS
