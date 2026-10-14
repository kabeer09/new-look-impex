"""SQLAlchemy engine / session."""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, future=True)
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
            ):
                if col not in existing_mf:
                    conn.execute(text(f"ALTER TABLE media_files ADD COLUMN {col} {ddl}"))
