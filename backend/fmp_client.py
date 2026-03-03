import httpx
import logging
from typing import Optional
from backend.config import settings

logger = logging.getLogger(__name__)

# Rate limiting: FMP starter plan allows 300 requests/minute
RATE_LIMIT_DELAY = 0.25  # seconds between requests


class FMPClient:
    """
    FMP API client using the NEW stable endpoints (not legacy v3).
    Base URL: https://financialmodelingprep.com/stable/
    Symbols are passed as query parameters (?symbol=AAPL) not path parameters.
    """

    def __init__(self):
        # The stable API base URL
        self.base_url = "https://financialmodelingprep.com/stable"
        self.api_key = settings.FMP_API_KEY
        self.client = httpx.Client(timeout=30.0)

    def _url(self, path: str, params: Optional[dict] = None) -> str:
        """Build a stable API URL with query parameters."""
        all_params = params or {}
        all_params["apikey"] = self.api_key
        query = "&".join(f"{k}={v}" for k, v in all_params.items() if v is not None)
        return f"{self.base_url}/{path}?{query}"

    def _get(self, path: str, params: Optional[dict] = None) -> Optional[list | dict]:
        url = self._url(path, params)
        # Log URL without API key for debugging
        safe_url = url.replace(self.api_key, "***")
        logger.info(f"FMP request: {safe_url}")
        try:
            resp = self.client.get(url)
            if resp.status_code != 200:
                logger.error(f"FMP API returned {resp.status_code} for {path}: {resp.text[:500]}")
                return None
            data = resp.json()
            # FMP sometimes returns error messages as JSON
            if isinstance(data, dict) and "Error Message" in data:
                logger.error(f"FMP API error for {path}: {data['Error Message']}")
                return None
            if isinstance(data, list):
                logger.info(f"FMP {path} returned {len(data)} items")
            return data
        except httpx.HTTPError as e:
            logger.error(f"FMP HTTP error for {path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error for {path}: {e}")
            return None

    # ── Stock lists ──────────────────────────────────────────────

    def get_stock_list(self) -> list[dict]:
        """Get list of all tradeable stock symbols."""
        data = self._get("company-symbols-list")
        if data:
            return data
        # Fallback: try the screener with broad criteria
        logger.warning("company-symbols-list failed, trying stock screener fallback...")
        return self.get_stock_screener(market_cap_min=50000000)

    # ── Company profile ──────────────────────────────────────────

    def get_company_profile(self, ticker: str) -> Optional[dict]:
        """Get company profile including market cap, sector, etc."""
        data = self._get("profile", {"symbol": ticker})
        if data and isinstance(data, list) and len(data) > 0:
            return data[0]
        if data and isinstance(data, dict):
            return data
        return None

    # ── Financial statements ─────────────────────────────────────

    def get_income_statements(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get income statements. period: 'annual' or 'quarter'"""
        data = self._get("income-statement", {
            "symbol": ticker,
            "period": period,
            "limit": str(limit)
        })
        return data if isinstance(data, list) else []

    def get_key_metrics(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get key financial metrics."""
        data = self._get("key-metrics", {
            "symbol": ticker,
            "period": period,
            "limit": str(limit)
        })
        return data if isinstance(data, list) else []

    def get_financial_ratios(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get financial ratios."""
        data = self._get("ratios", {
            "symbol": ticker,
            "period": period,
            "limit": str(limit)
        })
        return data if isinstance(data, list) else []

    def get_enterprise_values(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get enterprise value data."""
        data = self._get("enterprise-values", {
            "symbol": ticker,
            "period": period,
            "limit": str(limit)
        })
        return data if isinstance(data, list) else []

    # ── Quotes ───────────────────────────────────────────────────

    def get_quote(self, ticker: str) -> Optional[dict]:
        """Get current quote data."""
        data = self._get("quote", {"symbol": ticker})
        if data and isinstance(data, list) and len(data) > 0:
            return data[0]
        if data and isinstance(data, dict):
            return data
        return None

    def get_batch_quotes(self, tickers: list[str]) -> list[dict]:
        """Get quotes for multiple tickers (comma-separated, max ~50 at a time)."""
        ticker_str = ",".join(tickers)
        data = self._get("quote", {"symbol": ticker_str})
        return data if isinstance(data, list) else []

    # ── Screener ─────────────────────────────────────────────────

    def get_stock_screener(
        self,
        market_cap_min: Optional[float] = None,
        market_cap_max: Optional[float] = None,
        country: Optional[str] = None,
        exchange: Optional[str] = None,
        limit: int = 10000,
    ) -> list[dict]:
        """Use FMP's built-in screener to get a filtered stock list."""
        params = {"limit": str(limit)}
        if market_cap_min:
            params["marketCapMoreThan"] = str(int(market_cap_min))
        if market_cap_max:
            params["marketCapLowerThan"] = str(int(market_cap_max))
        if country:
            params["country"] = country
        if exchange:
            params["exchange"] = exchange
        data = self._get("company-screener", params)
        return data if isinstance(data, list) else []

    # ── Test connection ──────────────────────────────────────────

    def test_connection(self) -> dict:
        """Test the API connection by trying multiple endpoints."""
        logger.info("Testing FMP API connection with stable endpoints...")
        results = {}

        # Test 1: Quote endpoint
        try:
            quote = self.get_quote("AAPL")
            results["quote"] = "OK" if quote else "FAILED (no data)"
            if quote:
                results["aapl_price"] = quote.get("price", "N/A")
        except Exception as e:
            results["quote"] = f"ERROR: {str(e)[:100]}"

        # Test 2: Stock list / symbols
        try:
            stocks = self._get("company-symbols-list")
            if stocks and isinstance(stocks, list):
                results["stock_list"] = f"OK ({len(stocks)} symbols)"
            else:
                results["stock_list"] = "FAILED (no data or error)"
        except Exception as e:
            results["stock_list"] = f"ERROR: {str(e)[:100]}"

        # Test 3: Income statement
        try:
            income = self.get_income_statements("AAPL", limit=1)
            results["income_statement"] = f"OK ({len(income)} records)" if income else "FAILED"
        except Exception as e:
            results["income_statement"] = f"ERROR: {str(e)[:100]}"

        # Test 4: Key metrics
        try:
            metrics = self.get_key_metrics("AAPL", limit=1)
            results["key_metrics"] = f"OK ({len(metrics)} records)" if metrics else "FAILED"
        except Exception as e:
            results["key_metrics"] = f"ERROR: {str(e)[:100]}"

        # Test 5: Company screener
        try:
            screened = self.get_stock_screener(market_cap_min=1000000000000, limit=10)
            results["screener"] = f"OK ({len(screened)} results)" if screened else "FAILED"
        except Exception as e:
            results["screener"] = f"ERROR: {str(e)[:100]}"

        all_ok = all("OK" in str(v) for v in results.values())
        return {
            "status": "success" if all_ok else "partial",
            "base_url": self.base_url,
            "api_key_prefix": self.api_key[:6] + "..." if self.api_key else "NOT SET",
            "endpoints": results
        }

    def close(self):
        self.client.close()


# Singleton
fmp_client = FMPClient()
