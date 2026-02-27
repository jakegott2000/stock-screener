import httpx
import asyncio
import logging
from typing import Optional
from backend.config import settings

logger = logging.getLogger(__name__)

# Rate limiting: FMP starter plan allows 300 requests/minute
RATE_LIMIT_DELAY = 0.25  # seconds between requests


class FMPClient:
    def __init__(self):
        self.base_url = settings.FMP_BASE_URL
        self.api_key = settings.FMP_API_KEY
        self.client = httpx.Client(timeout=30.0)

    def _url(self, path: str) -> str:
        separator = "&" if "?" in path else "?"
        return f"{self.base_url}{path}{separator}apikey={self.api_key}"

    def _get(self, path: str) -> Optional[list | dict]:
        url = self._url(path)
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
            return data
        except httpx.HTTPError as e:
            logger.error(f"FMP HTTP error for {path}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error for {path}: {e}")
            return None

    def get_stock_list(self) -> list[dict]:
        """Get list of all tradeable stocks."""
        data = self._get("/v3/stock/list")
        return data if data else []

    def get_company_profile(self, ticker: str) -> Optional[dict]:
        """Get company profile including market cap, sector, etc."""
        data = self._get(f"/v3/profile/{ticker}")
        if data and isinstance(data, list) and len(data) > 0:
            return data[0]
        return None

    def get_income_statements(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get income statements. period: 'annual' or 'quarter'"""
        data = self._get(f"/v3/income-statement/{ticker}?period={period}&limit={limit}")
        return data if data else []

    def get_key_metrics(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get key financial metrics."""
        data = self._get(f"/v3/key-metrics/{ticker}?period={period}&limit={limit}")
        return data if data else []

    def get_financial_ratios(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get financial ratios."""
        data = self._get(f"/v3/ratios/{ticker}?period={period}&limit={limit}")
        return data if data else []

    def get_enterprise_values(self, ticker: str, period: str = "annual", limit: int = 10) -> list[dict]:
        """Get enterprise value data."""
        data = self._get(f"/v3/enterprise-values/{ticker}?period={period}&limit={limit}")
        return data if data else []

    def get_quote(self, ticker: str) -> Optional[dict]:
        """Get current quote data."""
        data = self._get(f"/v3/quote/{ticker}")
        if data and isinstance(data, list) and len(data) > 0:
            return data[0]
        return None

    def get_batch_quotes(self, tickers: list[str]) -> list[dict]:
        """Get quotes for multiple tickers (comma-separated, max ~50 at a time)."""
        ticker_str = ",".join(tickers)
        data = self._get(f"/v3/quote/{ticker_str}")
        return data if data else []

    def get_stock_screener(
        self,
        market_cap_min: Optional[float] = None,
        market_cap_max: Optional[float] = None,
        country: Optional[str] = None,
        exchange: Optional[str] = None,
        limit: int = 10000,
    ) -> list[dict]:
        """Use FMP's built-in screener to get a filtered stock list."""
        params = [f"limit={limit}"]
        if market_cap_min:
            params.append(f"marketCapMoreThan={int(market_cap_min)}")
        if market_cap_max:
            params.append(f"marketCapLowerThan={int(market_cap_max)}")
        if country:
            params.append(f"country={country}")
        if exchange:
            params.append(f"exchange={exchange}")
        query = "&".join(params)
        data = self._get(f"/v3/stock-screener?{query}")
        return data if data else []

    def test_connection(self) -> dict:
        """Test the API connection by fetching a single quote (AAPL)."""
        logger.info("Testing FMP API connection...")
        try:
            result = self.get_quote("AAPL")
            if result:
                logger.info("FMP API connection test successful")
                return {
                    "status": "success",
                    "message": "Successfully connected to FMP API",
                    "ticker_tested": "AAPL",
                    "quote": result
                }
            else:
                logger.error("FMP API connection test failed - no data returned")
                return {
                    "status": "failed",
                    "message": "FMP API returned no data for AAPL quote",
                    "ticker_tested": "AAPL"
                }
        except Exception as e:
            logger.error(f"FMP API connection test error: {e}")
            return {
                "status": "error",
                "message": f"API connection test failed: {str(e)}",
                "error_details": str(e)
            }

    def close(self):
        self.client.close()


# Singleton
fmp_client = FMPClient()
