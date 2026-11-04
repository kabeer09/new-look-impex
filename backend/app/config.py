"""Central configuration via environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    DATABASE_URL: str = "sqlite:///./newlookimpex.db"
    SECRET_KEY: str = "change-me-in-production-min-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    ADMIN_EMAIL: str = "admin@newlookimpex.example"
    ADMIN_PASSWORD: str = "ChangeMe123!"
    CORS_ORIGINS: str = "http://localhost:3000"
    API_BASE_URL: str = "http://localhost:8000"
    PUBLIC_SITE_URL: str = "https://new-look-impex.vercel.app"
    PUBLIC_SITE_DOMAIN: str = "newlookimpex.example"

    LLM_PROVIDER: str = "none"  # none | openai-compatible | custom
    LLM_MODEL: str = ""
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/integrations/google/callback"
    GA4_PROPERTY_ID: str = ""

    # Google Sign-In for admin dashboard (disabled by default — explicit opt-in)
    GOOGLE_LOGIN_ENABLED: bool = False
    # Comma-separated emails allowed to sign in with Google. Empty => only ADMIN_EMAIL.
    GOOGLE_ALLOWED_EMAILS: str = ""
    # Must be registered as an authorised redirect URI in Google Cloud console.
    # Empty => API_BASE_URL + "/api/auth/google/callback".
    GOOGLE_LOGIN_REDIRECT_URI: str = ""

    N8N_WEBHOOK_TOKEN: str = "change-me-n8n-token"
    ENQUIRY_NOTIFY_EMAIL: str = "newlookimpex130@gmail.com"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    SMTP_TLS: str = ""

    # Media storage: local (dev default) or s3 (any S3-compatible object
    # storage, e.g. AWS S3 or Supabase Storage via its S3 endpoint).
    STORAGE_BACKEND: str = "local"
    S3_ENDPOINT: str = ""
    S3_BUCKET: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_REGION: str = "us-east-1"
    # Optional direct public base URL (e.g. Supabase public bucket URL).
    # Empty => files served via /api/media/files/...
    S3_PUBLIC_URL: str = ""

    # Drop-folder auto-import (VS Code workflow): drop product photos into
    # INCOMING_DIR/products/<optional-category-slug>/ and banner images into
    # INCOMING_DIR/banners/ — the backend ingests them automatically.
    # Disabled by default; enable explicitly. Products are ALWAYS created as
    # drafts for human review unless INCOMING_AUTO_PUBLISH=true.
    INCOMING_ENABLED: bool = False
    INCOMING_DIR: str = "./incoming"
    INCOMING_INTERVAL: int = 60  # seconds between scans
    INCOMING_AUTO_PUBLISH: bool = False
    INCOMING_RIGHTS: str = "own"  # who owns dropped files: own|supplier_authorised|licensed

    # AI Catalogue pipeline: watches the merchant's product-photo folder
    # (PRODUCT_SCAN_DIR). Empty => "./product" if it exists, else "./products".
    # Images are NEVER moved or deleted — originals stay in place and a hash
    # registry in the DB prevents re-processing. Products are always created
    # as drafts with pipeline status "pending"; nothing is published without
    # explicit admin approval.
    PRODUCT_SCAN_DIR: str = ""
    PRODUCT_SCAN_ENABLED: bool = False  # background thread scanning
    PRODUCT_SCAN_INTERVAL: int = 300  # seconds between background scans
    PRODUCT_SCAN_RIGHTS: str = "own"  # own|supplier_authorised|licensed|ai_generated
    # Perceptual-hash Hamming distance (0-64) at which two different files are
    # treated as the same photo and attached to the same product instead of
    # creating a new one. 8 is strict enough to avoid merging similar products.
    PRODUCT_SCAN_NEAR_DUP_DISTANCE: int = 8
    # Cap per manual scan run (files already registered are skipped cheaply).
    PRODUCT_SCAN_CAP: int = 100


settings = Settings()
