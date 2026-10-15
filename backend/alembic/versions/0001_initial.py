"""Initial schema — mirrors app.models (all modules)."""
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.models import Base
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    for t in ("audit_logs", "workflow_executions", "enquiries", "analytics_daily",
              "publishing_logs", "content_versions", "content_drafts",
              "seo_recommendations", "seo_audits", "website_pages",
              "tracked_keywords", "integrations", "website_properties", "users",
              "analytics_events", "media_files", "business_settings",
              "outreach_records", "buyers", "rfq_items", "rfqs",
              "product_collections", "product_specs", "product_variants",
              "product_images", "products", "collections", "categories",
              "product_imports", "banners", "product_slug_redirects"):
        try:
            op.drop_table(t)
        except Exception:
            pass
