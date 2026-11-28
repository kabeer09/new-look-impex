"""Additive indexing-audit tables.

Revision ID: 0007_gsc_indexing_audit
Revises: 0006_gsc_integration
No existing table or row is modified.
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_gsc_indexing_audit"
down_revision = "0006_gsc_integration"
branch_labels = None
depends_on = None

UID = sa.String(36)


def upgrade():
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    def index(name, table, cols, unique=False):
        names = {i.get("name") for i in sa.inspect(bind).get_indexes(table)}
        if name in names:
            return
        try:
            op.create_index(name, table, cols, unique=unique)
        except Exception:
            pass

    if "gsc_audit_issues" not in existing:
        op.create_table("gsc_audit_issues",
            sa.Column("id", UID, primary_key=True),
            sa.Column("url", sa.String(1024), nullable=False),
            sa.Column("issue_type", sa.String(48), nullable=False),
            sa.Column("severity", sa.String(16), default="Medium"),
            sa.Column("classification", sa.String(16), default="approval"),
            sa.Column("evidence_json", sa.Text, default="{}"),
            sa.Column("recommended_action", sa.Text, default=""),
            sa.Column("status", sa.String(16), default="Pending"),
            sa.Column("decided_by", sa.String(255), default=""),
            sa.Column("created_at", sa.DateTime, nullable=True),
            sa.Column("verified_at", sa.DateTime, nullable=True),
            sa.Column("decided_at", sa.DateTime, nullable=True),
            sa.UniqueConstraint("url", "issue_type", "status", name="uq_gsc_issue_open"))
    for col in ("url", "issue_type", "severity", "classification", "status"):
        index(f"ix_gsc_audit_issues_{col}", "gsc_audit_issues", [col])

    if "gsc_crawl_queue" not in existing:
        op.create_table("gsc_crawl_queue",
            sa.Column("id", UID, primary_key=True),
            sa.Column("url", sa.String(1024), nullable=False, unique=True),
            sa.Column("priority", sa.String(16), default="normal"),
            sa.Column("last_inspected_at", sa.DateTime, nullable=True),
            sa.Column("last_verdict", sa.String(64), default=""),
            sa.Column("last_index_status", sa.String(64), default=""),
            sa.Column("last_google_canonical", sa.String(1024), default=""),
            sa.Column("last_user_canonical", sa.String(1024), default=""),
            sa.Column("previous_verdict", sa.String(64), default=""),
            sa.Column("created_at", sa.DateTime, nullable=True))
    for col in ("priority", "last_index_status"):
        index(f"ix_gsc_crawl_queue_{col}", "gsc_crawl_queue", [col])


def downgrade():
    for t in ("gsc_crawl_queue", "gsc_audit_issues"):
        try:
            op.drop_table(t)
        except Exception:
            pass
