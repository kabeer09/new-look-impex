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
    PUBLIC_SITE_URL: str = "http://localhost:3000"
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
    ENQUIRY_NOTIFY_EMAIL: str = "newlookimpex@gmail.com"
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


settings = Settings()
