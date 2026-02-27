import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Stock Screener"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/stockscreener"
    )

    # FMP API
    FMP_API_KEY: str = os.getenv("FMP_API_KEY", "")
    FMP_BASE_URL: str = "https://financialmodelingprep.com/api"

    # Auth
    APP_PASSWORD: str = os.getenv("APP_PASSWORD", "changeme")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_HOURS: int = 72

    # Target markets (ISO country codes)
    TARGET_COUNTRIES: list = [
        "US", "CA", "GB", "DE", "FR", "NL", "CH", "SE", "NO", "DK", "FI",
        "JP", "AU", "IL", "IE", "IT", "ES", "BE", "AT", "HK", "SG", "KR"
    ]

    TARGET_EXCHANGES: list = [
        "NYSE", "NASDAQ", "AMEX", "TSX", "LSE", "XETRA", "EURONEXT",
        "SIX", "OMX", "OSE", "TSE", "ASX", "TASE", "SGX", "KSE", "HKSE"
    ]


settings = Settings()
