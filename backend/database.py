from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import settings

# Railway provides DATABASE_URL with postgresql:// but SQLAlchemy 2.0 needs postgresql+psycopg2://
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif database_url.startswith("postgresql://") and "+psycopg2" not in database_url:
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(database_url, pool_size=10, max_overflow=20, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    # Run lightweight migrations for new columns on existing tables
    _run_migrations()


def _run_migrations():
    """Add new columns to existing tables if they don't exist yet.
    This is a lightweight alternative to Alembic for simple column additions."""
    from sqlalchemy import text, inspect
    inspector = inspect(engine)

    # Define new columns to add: (table_name, column_name, column_type)
    new_columns = [
        ("screener_data", "forward_ev_to_ebitda", "FLOAT"),
        ("screener_data", "forward_ev_to_ebit", "FLOAT"),
        ("screener_data", "float_shares", "FLOAT"),
        ("screener_data", "outstanding_shares", "FLOAT"),
        ("screener_data", "free_float_pct", "FLOAT"),
    ]

    for table, column, col_type in new_columns:
        # Check if table exists
        if table not in inspector.get_table_names():
            continue
        # Check if column already exists
        existing_cols = {c["name"] for c in inspector.get_columns(table)}
        if column not in existing_cols:
            with engine.begin() as conn:
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {col_type}'))
                print(f"Migration: Added {table}.{column} ({col_type})")
