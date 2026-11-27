"""24/7 autonomous growth: worker controls, SEO data, issues, changes, reports.

Revision ID: 0005_autonomous_growth
Revises: 0004_ai_helpdesk

create_all() creates these on startup; this revision documents the production
schema and allows explicit `alembic upgrade head` on PostgreSQL/Supabase.
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_autonomous_growth"
down_revision = "0004_ai_helpdesk"
branch_labels = None
depends_on = None
UID = sa.String(36)


def _guards():
    """Skip DDL already applied by create_all() at app startup."""
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    _raw_create_table = op.create_table
    _raw_create_index = op.create_index

    def create_table(name, *cols):
        if name not in tables:
            _raw_create_table(name, *cols)

    def create_index(name, table, cols, **kw):
        if name in {i.get("name") for i in sa.inspect(bind).get_indexes(table)}:
            return
        try:
            _raw_create_index(name, table, cols, **kw)
        except Exception:
            pass

    return create_table, create_index


def upgrade():
    create_table, create_index = _guards()
    create_table("agent_controls",
        sa.Column("id", UID, primary_key=True), sa.Column("agent_key", sa.String(64), nullable=False, unique=True),
        sa.Column("paused", sa.Boolean, default=False), sa.Column("status", sa.String(24), default="idle"),
        sa.Column("last_heartbeat", sa.DateTime, nullable=True), sa.Column("last_error", sa.Text, default=""),
        sa.Column("tasks_completed", sa.Integer, default=0), sa.Column("tasks_failed", sa.Integer, default=0),
        sa.Column("updated_at", sa.DateTime, nullable=True))
    create_index("ix_agent_controls_agent", "agent_controls", ["agent_key"])

    create_table("worker_state", sa.Column("key", sa.String(64), primary_key=True),
                    sa.Column("value", sa.Text, default=""), sa.Column("updated_at", sa.DateTime, nullable=True))

    create_table("agent_task_leases",
        sa.Column("id", UID, primary_key=True), sa.Column("task_id", UID, nullable=False, unique=True),
        sa.Column("worker_id", sa.String(64), default=""), sa.Column("leased_at", sa.DateTime, nullable=True),
        sa.Column("expires_at", sa.DateTime, nullable=True))
    create_index("ix_agent_task_leases_worker", "agent_task_leases", ["worker_id"])

    create_table("automation_runs",
        sa.Column("id", UID, primary_key=True), sa.Column("job", sa.String(64), nullable=False),
        sa.Column("period", sa.String(32), nullable=False), sa.Column("worker_id", sa.String(64), default=""),
        sa.Column("status", sa.String(24), default="running"), sa.Column("error", sa.Text, default=""),
        sa.Column("started_at", sa.DateTime, nullable=True), sa.Column("finished_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("job", "period", name="uq_automation_job_period"))
    create_index("ix_automation_runs_job", "automation_runs", ["job"])

    create_table("seo_keywords",
        sa.Column("id", UID, primary_key=True), sa.Column("keyword", sa.String(255), nullable=False),
        sa.Column("country", sa.String(16), default="global"), sa.Column("intent", sa.String(32), default="informational"),
        sa.Column("source", sa.String(24), default="candidate"), sa.Column("clicks", sa.Integer, default=0),
        sa.Column("impressions", sa.Integer, default=0), sa.Column("ctr", sa.Text, default=""),
        sa.Column("position", sa.Text, default=""), sa.Column("target_url", sa.String(512), default=""),
        sa.Column("priority", sa.String(16), default="normal"), sa.Column("status", sa.String(24), default="new"),
        sa.Column("checked_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("keyword", "country", "source", name="uq_seo_keyword"))
    create_index("ix_seo_keywords_keyword", "seo_keywords", ["keyword"])

    create_table("seo_snapshots",
        sa.Column("id", UID, primary_key=True), sa.Column("period", sa.String(16), nullable=False),
        sa.Column("source", sa.String(32), default=""), sa.Column("clicks", sa.Integer, nullable=True),
        sa.Column("impressions", sa.Integer, nullable=True), sa.Column("ctr", sa.Text, default=""),
        sa.Column("average_position", sa.Text, default=""), sa.Column("indexed_pages", sa.Integer, nullable=True),
        sa.Column("organic_sessions", sa.Integer, nullable=True), sa.Column("note", sa.Text, default=""),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("period", "source", name="uq_seo_snapshot"))

    create_table("growth_issues",
        sa.Column("id", UID, primary_key=True), sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(16), default="medium"), sa.Column("subject", sa.String(255), default=""),
        sa.Column("evidence", sa.Text, default=""), sa.Column("suggested_agent", sa.String(64), default=""),
        sa.Column("status", sa.String(24), default="open"), sa.Column("task_id", UID, nullable=True),
        sa.Column("detected_at", sa.DateTime, nullable=True), sa.Column("resolved_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("kind", "subject", "status", name="uq_growth_issue"))

    create_table("website_changes",
        sa.Column("id", UID, primary_key=True), sa.Column("kind", sa.String(64), default=""),
        sa.Column("target", sa.String(255), default=""), sa.Column("before_json", sa.Text, default="{}"),
        sa.Column("after_json", sa.Text, default="{}"), sa.Column("approval_id", UID, nullable=True),
        sa.Column("applied_by", sa.String(128), default=""), sa.Column("status", sa.String(24), default="applied"),
        sa.Column("verification", sa.Text, default=""), sa.Column("created_at", sa.DateTime, nullable=True),
        sa.Column("rolled_back_at", sa.DateTime, nullable=True))

    create_table("growth_reports",
        sa.Column("id", UID, primary_key=True), sa.Column("week", sa.String(16), nullable=False, unique=True),
        sa.Column("title", sa.String(255), default=""), sa.Column("sections_json", sa.Text, default="{}"),
        sa.Column("summary", sa.Text, default=""), sa.Column("pdf_filename", sa.String(255), default=""),
        sa.Column("emailed", sa.Boolean, default=False), sa.Column("created_at", sa.DateTime, nullable=True))


def downgrade():
    for t in ("growth_reports", "website_changes", "growth_issues", "seo_snapshots", "seo_keywords",
              "automation_runs", "agent_task_leases", "worker_state", "agent_controls"):
        op.drop_table(t)
