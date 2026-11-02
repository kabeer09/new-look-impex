"""SQLAlchemy engine / session."""
import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# Keep the real dev database safe when running the test suite: tests call
# drop_all()/create_all() on whatever engine they import, so under pytest we
# point at a throwaway scratch database instead of the populated dev DB.
_db_url = settings.DATABASE_URL
if "pytest" in sys.modules and _db_url.startswith("sqlite"):
    _db_url = "sqlite:///./test_newlookimpex.db"

connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}
engine = create_engine(_db_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema() -> None:
    """Additive-only migration for databases created before new columns existed.

    create_all() never alters existing tables, so columns added to models after
    the first deploy (e.g. users.auth_provider) would otherwise be missing on
    long-lived SQLite/Postgres databases. This adds them idempotently.
    Safe to run on every startup.
    """
    with engine.begin() as conn:
        insp = inspect(conn)
        if "users" not in insp.get_table_names():
            return
        existing = {c["name"] for c in insp.get_columns("users")}
        for col, ddl in (
            ("auth_provider", "VARCHAR(32) DEFAULT 'local'"),
            ("display_name", "VARCHAR(255) DEFAULT ''"),
        ):
            if col not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {ddl}"))
        # product_images rights columns
        if "product_images" in insp.get_table_names():
            existing_pi = {c["name"] for c in insp.get_columns("product_images")}
            for col, ddl in (
                ("source", "VARCHAR(32) DEFAULT ''"),
                ("permission", "VARCHAR(512) DEFAULT ''"),
                ("is_concept", "BOOLEAN DEFAULT 0"),
            ):
                if col not in existing_pi:
                    conn.execute(text(f"ALTER TABLE product_images ADD COLUMN {col} {ddl}"))
        # media_files rights columns
        if "media_files" in insp.get_table_names():
            existing_mf = {c["name"] for c in insp.get_columns("media_files")}
            for col, ddl in (
                ("alt_text", "VARCHAR(512) DEFAULT ''"),
                ("source", "VARCHAR(32) DEFAULT ''"),
                ("permission", "VARCHAR(512) DEFAULT ''"),
                ("has_thumb", "BOOLEAN DEFAULT 0"),
                ("has_webp", "BOOLEAN DEFAULT 0"),
            ):
                if col not in existing_mf:
                    conn.execute(text(f"ALTER TABLE media_files ADD COLUMN {col} {ddl}"))
        # products provenance column
        if "products" in insp.get_table_names():
            existing_p = {c["name"] for c in insp.get_columns("products")}
            for col, ddl in (
                ("source_url", "VARCHAR(1024) DEFAULT ''"),
                ("external_product_id", "VARCHAR(255) DEFAULT ''"),
                ("capacity", "VARCHAR(128) DEFAULT ''"),
                ("price_visibility", "VARCHAR(32) DEFAULT 'on_request'"),
                ("stock_status", "VARCHAR(32) DEFAULT ''"),
            ):
                if col not in existing_p:
                    conn.execute(text(f"ALTER TABLE products ADD COLUMN {col} {ddl}"))
            # index for external id lookups (product re-sync / dedupe)
            try:
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_products_external_product_id "
                    "ON products (external_product_id)"))
            except Exception:
                pass
        # enquiries (leads): reference, phone, product link
        if "enquiries" in insp.get_table_names():
            existing_e = {c["name"] for c in insp.get_columns("enquiries")}
            for col, ddl in (
                ("reference", "VARCHAR(64)"),
                ("phone", "VARCHAR(64) DEFAULT ''"),
                ("product_id", "INTEGER"),
            ):
                if col not in existing_e:
                    conn.execute(text(f"ALTER TABLE enquiries ADD COLUMN {col} {ddl}"))
            for idx, col in (("ix_enquiries_reference", "reference"),
                             ("ix_enquiries_product_id", "product_id")):
                try:
                    conn.execute(text(
                        f"CREATE INDEX IF NOT EXISTS {idx} ON enquiries ({col})"))
                except Exception:
                    pass
