from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Date, ForeignKey,
    UniqueConstraint, Index, Boolean, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), nullable=False, index=True)
    name = Column(String(500))
    exchange = Column(String(50))
    exchange_short = Column(String(20))
    country = Column(String(10))
    sector = Column(String(200))
    industry = Column(String(200))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    income_statements = relationship("IncomeStatement", back_populates="company", cascade="all, delete-orphan")
    key_metrics = relationship("KeyMetric", back_populates="company", cascade="all, delete-orphan")
    screener_data = relationship("ScreenerData", back_populates="company", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("ticker", "exchange_short", name="uq_ticker_exchange"),
    )


class IncomeStatement(Base):
    __tablename__ = "income_statements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    period = Column(String(10), nullable=False)  # "annual" or "quarter"
    calendar_year = Column(Integer)

    revenue = Column(Float)
    cost_of_revenue = Column(Float)
    gross_profit = Column(Float)
    gross_profit_ratio = Column(Float)  # gross margin as decimal (0.45 = 45%)
    operating_income = Column(Float)
    operating_income_ratio = Column(Float)
    ebitda = Column(Float)
    ebitda_ratio = Column(Float)
    net_income = Column(Float)
    net_income_ratio = Column(Float)
    revenue_growth = Column(Float)  # YoY growth as decimal

    company = relationship("Company", back_populates="income_statements")

    __table_args__ = (
        UniqueConstraint("company_id", "date", "period", name="uq_income_company_date_period"),
        Index("ix_income_company_period", "company_id", "period"),
    )


class KeyMetric(Base):
    """Stores key financial metrics and ratios per period."""
    __tablename__ = "key_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    period = Column(String(10), nullable=False)
    calendar_year = Column(Integer)

    # Valuation
    pe_ratio = Column(Float)
    forward_pe = Column(Float)
    price_to_sales = Column(Float)
    price_to_book = Column(Float)
    ev_to_ebitda = Column(Float)
    ev_to_revenue = Column(Float)
    enterprise_value = Column(Float)
    market_cap = Column(Float)

    # Returns
    roic = Column(Float)
    roe = Column(Float)
    roa = Column(Float)

    # Per share
    revenue_per_share = Column(Float)
    earnings_per_share = Column(Float)
    free_cash_flow_per_share = Column(Float)
    book_value_per_share = Column(Float)
    dividends_per_share = Column(Float)

    # Debt
    debt_to_equity = Column(Float)
    net_debt_to_ebitda = Column(Float)
    current_ratio = Column(Float)
    interest_coverage = Column(Float)

    company = relationship("Company", back_populates="key_metrics")

    __table_args__ = (
        UniqueConstraint("company_id", "date", "period", name="uq_metrics_company_date_period"),
        Index("ix_metrics_company_period", "company_id", "period"),
    )


class ScreenerData(Base):
    """Pre-computed screening data — one row per company with current values and historical averages."""
    __tablename__ = "screener_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Company info (denormalized for fast queries)
    ticker = Column(String(20), index=True)
    name = Column(String(500))
    exchange = Column(String(50))
    country = Column(String(10))
    sector = Column(String(200))
    industry = Column(String(200))

    # Current valuation metrics
    market_cap = Column(Float, index=True)
    enterprise_value = Column(Float)
    last_price = Column(Float)
    pe_ratio = Column(Float)
    forward_pe = Column(Float)
    price_to_sales = Column(Float)
    price_to_book = Column(Float)
    ev_to_ebitda = Column(Float)
    ev_to_revenue = Column(Float)

    # Current profitability
    gross_margin = Column(Float)  # as decimal, e.g. 0.45 = 45%
    operating_margin = Column(Float)
    net_margin = Column(Float)
    ebitda_margin = Column(Float)

    # Current returns
    roic = Column(Float)
    roe = Column(Float)
    roa = Column(Float)

    # Growth
    revenue_growth_yoy = Column(Float)
    revenue_growth_3yr_cagr = Column(Float)
    earnings_growth_yoy = Column(Float)

    # Balance sheet
    debt_to_equity = Column(Float)
    net_debt_to_ebitda = Column(Float)
    current_ratio = Column(Float)

    # Short interest (when available)
    short_percent_float = Column(Float)
    short_ratio = Column(Float)

    # 5-year historical averages
    pe_5yr_avg = Column(Float)
    ev_ebitda_5yr_avg = Column(Float)
    gross_margin_5yr_avg = Column(Float)
    operating_margin_5yr_avg = Column(Float)
    net_margin_5yr_avg = Column(Float)
    roic_5yr_avg = Column(Float)
    roe_5yr_avg = Column(Float)

    # Percent vs 5-year average (e.g. 0.20 = 20% above average)
    forward_pe_vs_5yr_pct = Column(Float)
    ev_ebitda_vs_5yr_pct = Column(Float)
    gross_margin_vs_5yr_pct = Column(Float)
    operating_margin_vs_5yr_pct = Column(Float)
    roic_vs_5yr_pct = Column(Float)
    roe_vs_5yr_pct = Column(Float)

    computed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="screener_data")

    __table_args__ = (
        Index("ix_screener_market_cap", "market_cap"),
        Index("ix_screener_sector", "sector"),
        Index("ix_screener_country", "country"),
    )
