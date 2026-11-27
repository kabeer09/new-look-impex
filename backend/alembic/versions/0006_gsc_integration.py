"""Secure Google Search Console integration (additive only).

Revision ID: 0006_gsc_integration
Revises: 0005_autonomous_growth

Creates the encrypted-token/OAuth connection, sync history, dimension-typed
analytics rows, URL inspections, sitemap records and evidence-backed SEO
recommendations. No existing table or row is modified.
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_gsc_integration"
down_revision = "0005_autonomous_growth"
branch_labels = None
depends_on = None

UID = sa.String(36)


def upgrade():
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    def table(name, *cols):
        if name not in existing:
            op.create_table(name, *cols)
    def index(name, table_name, cols, unique=False):
        names = {i.get("name") for i in sa.inspect(bind).get_indexes(table_name)}
        if name in names:
            return
        try:
            op.create_index(name, table_name, cols, unique=unique)
        except Exception:
            pass

    table("gsc_connections",
        sa.Column("id", UID, primary_key=True),
        sa.Column("provider", sa.String(64), default="google_search_console"),
        sa.Column("site_url", sa.String(512), default=""),
        sa.Column("access_token_enc", sa.Text, default=""),
        sa.Column("refresh_token_enc", sa.Text, default=""),
        sa.Column("scopes", sa.Text, default=""),
        sa.Column("token_expiry", sa.DateTime, nullable=True),
        sa.Column("status", sa.String(24), default="disconnected"),
        sa.Column("last_error", sa.Text, default=""),
        sa.Column("last_sync_at", sa.DateTime, nullable=True),
        sa.Column("oauth_nonce", sa.String(128), default=""),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.Column("updated_at", sa.DateTime, nullable=True))
    index("ix_gsc_connections_site_url", "gsc_connections", ["site_url"])
    index("ix_gsc_connections_status", "gsc_connections", ["status"])

    table("gsc_sync_runs",
        sa.Column("id", UID, primary_key=True),
        sa.Column("site_url", sa.String(512), default=""),
        sa.Column("period_start", sa.String(16), default=""),
        sa.Column("period_end", sa.String(16), default=""),
        sa.Column("status", sa.String(24), default="running"),
        sa.Column("rows_saved", sa.Integer, default=0),
        sa.Column("message", sa.Text, default=""),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("finished_at", sa.DateTime, nullable=True))
    index("ix_gsc_sync_runs_site_url", "gsc_sync_runs", ["site_url"])
    index("ix_gsc_sync_runs_status", "gsc_sync_runs", ["status"])

    table("gsc_rows",
        sa.Column("id", UID, primary_key=True),
        sa.Column("run_id", UID, nullable=True),
        sa.Column("site_url", sa.String(512), default=""),
        sa.Column("date", sa.String(16), nullable=False),
        sa.Column("dimension_type", sa.String(24), nullable=False),
        sa.Column("dimension_value", sa.Text, default=""),
        sa.Column("clicks", sa.Integer, default=0),
        sa.Column("impressions", sa.Integer, default=0),
        sa.Column("ctr", sa.Float, default=0),
        sa.Column("position", sa.Float, default=0),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("run_id", "date", "dimension_type", "dimension_value",
                            name="uq_gsc_row_run_dim"))
    for col in ("run_id", "site_url", "date", "dimension_type"):
        index(f"ix_gsc_rows_{col}", "gsc_rows", [col])

    table("gsc_url_inspections",
        sa.Column("id", UID, primary_key=True),
        sa.Column("url", sa.String(1024), nullable=False),
        sa.Column("site_url", sa.String(512), default=""),
        sa.Column("verdict", sa.String(64), default=""),
        sa.Column("index_status", sa.String(64), default=""),
        sa.Column("coverage_state", sa.String(128), default=""),
        sa.Column("last_crawl_time", sa.String(64), default=""),
        sa.Column("google_canonical", sa.String(1024), default=""),
        sa.Column("user_canonical", sa.String(1024), default=""),
        sa.Column("robots_state", sa.String(64), default=""),
        sa.Column("mobile_usability", sa.String(64), default=""),
        sa.Column("rich_results", sa.Text, default="[]"),
        sa.Column("detail_json", sa.Text, default="{}"),
        sa.Column("inspected_at", sa.DateTime, nullable=True),
        sa.Column("inspected_by", sa.String(255), default=""))
    index("ix_gsc_url_inspections_url", "gsc_url_inspections", ["url"])
    index("ix_gsc_url_inspections_status", "gsc_url_inspections", ["index_status"])

    table("gsc_sitemaps",
        sa.Column("id", UID, primary_key=True),
        sa.Column("sitemap_url", sa.String(1024), nullable=False, unique=True),
        sa.Column("source", sa.String(24), default="local"),
        sa.Column("status", sa.String(32), default=""),
        sa.Column("last_submitted", sa.String(64), default=""),
        sa.Column("last_downloaded", sa.String(64), default=""),
        sa.Column("errors", sa.Integer, default=0),
        sa.Column("warnings", sa.Integer, default=0),
        sa.Column("detail_json", sa.Text, default="{}"),
        sa.Column("checked_at", sa.DateTime, nullable=True))

    table("gsc_recommendations",
        sa.Column("id", UID, primary_key=True),
        sa.Column("url", sa.String(1024), default=""),
        sa.Column("category", sa.String(48), default=""),
        sa.Column("evidence_json", sa.Text, default="{}"),
        sa.Column("recommendation", sa.Text, default=""),
        sa.Column("priority", sa.String(16), default="Medium"),
        sa.Column("status", sa.String(16), default="Pending"),
        sa.Column("decided_by", sa.String(255), default=""),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.Column("decided_at", sa.DateTime, nullable=True))
    for col in ("url", "category", "priority", "status"):
        index(f"ix_gsc_recommendations_{col}", "gsc_recommendations", [col])


def downgrade():
    for t in ("gsc_recommendations", "gsc_sitemaps", "gsc_url_inspections",
              "gsc_rows", "gsc_sync_runs", "gsc_connections"):
        try:
            op.drop_table(t)
        except Exception:
            pass
