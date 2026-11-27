"""AI Command Centre: agents, tasks, approvals, knowledge, snapshots, follow-ups.

Revision ID: 0003_ai_command_centre
Revises: 0002_b2b_lead_seo
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_ai_command_centre"
down_revision = "0002_b2b_lead_seo"
branch_labels = None
depends_on = None


def upgrade():
    # create_all() in the app already creates missing tables; this revision makes
    # the schema explicit for deployments that run Alembic.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    meta = sa.MetaData()

    tables = [
        ("ai_agents", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("key", sa.String(64), nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("role", sa.Text), sa.Column("instructions", sa.Text),
            sa.Column("tools_json", sa.Text), sa.Column("restrictions", sa.Text),
            sa.Column("enabled", sa.Boolean), sa.Column("created_at", sa.DateTime),
            sa.Column("updated_at", sa.DateTime),
        ]),
        ("ai_tasks", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("session_id", sa.Integer), sa.Column("user_email", sa.String(255)),
            sa.Column("request", sa.Text), sa.Column("status", sa.String(24)),
            sa.Column("agents_json", sa.Text), sa.Column("result_json", sa.Text),
            sa.Column("error", sa.Text), sa.Column("created_at", sa.DateTime),
            sa.Column("updated_at", sa.DateTime),
        ]),
        ("ai_task_steps", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("task_id", sa.String(36)), sa.Column("agent_key", sa.String(64)),
            sa.Column("action", sa.String(128)), sa.Column("status", sa.String(24)),
            sa.Column("output_json", sa.Text), sa.Column("error", sa.Text),
            sa.Column("created_at", sa.DateTime),
        ]),
        ("ai_approvals", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("task_id", sa.String(36)), sa.Column("agent_key", sa.String(64)),
            sa.Column("kind", sa.String(64)), sa.Column("title", sa.String(255)),
            sa.Column("summary", sa.Text), sa.Column("previous_json", sa.Text),
            sa.Column("proposed_json", sa.Text), sa.Column("status", sa.String(24)),
            sa.Column("requested_by", sa.String(255)), sa.Column("decided_by", sa.String(255)),
            sa.Column("decided_at", sa.DateTime), sa.Column("notes", sa.Text),
            sa.Column("created_at", sa.DateTime),
        ]),
        ("ai_execution_logs", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("task_id", sa.String(36)), sa.Column("agent_key", sa.String(64)),
            sa.Column("event", sa.String(64)), sa.Column("detail_json", sa.Text),
            sa.Column("status", sa.String(24)), sa.Column("user_email", sa.String(255)),
            sa.Column("created_at", sa.DateTime),
        ]),
        ("business_knowledge", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("category", sa.String(64)), sa.Column("key", sa.String(128)),
            sa.Column("value", sa.Text), sa.Column("source", sa.String(512)),
            sa.Column("verified", sa.Boolean), sa.Column("created_at", sa.DateTime),
            sa.Column("updated_at", sa.DateTime),
        ]),
        ("analytics_snapshots", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("period", sa.String(32)), sa.Column("metric", sa.String(64)),
            sa.Column("value", sa.Float), sa.Column("source", sa.String(64)),
            sa.Column("created_at", sa.DateTime),
        ]),
        ("sales_followups", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("enquiry_id", sa.Integer), sa.Column("buyer_id", sa.Integer),
            sa.Column("due_at", sa.DateTime), sa.Column("channel", sa.String(24)),
            sa.Column("status", sa.String(24)), sa.Column("subject", sa.String(255)),
            sa.Column("body", sa.Text), sa.Column("created_by", sa.String(64)),
            sa.Column("created_at", sa.DateTime),
        ]),
        ("creative_assets", [
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("title", sa.String(255)), sa.Column("kind", sa.String(64)),
            sa.Column("file_url", sa.String(1024)), sa.Column("source_images_json", sa.Text),
            sa.Column("rights", sa.String(64)), sa.Column("status", sa.String(24)),
            sa.Column("created_by", sa.String(64)), sa.Column("created_at", sa.DateTime),
        ]),
    ]
    for name, cols in tables:
        if name not in existing:
            sa.Table(name, meta, *cols).create(bind)
    for name, col in (("ai_tasks", "session_id"), ("ai_approvals", "task_id"),
                      ("ai_task_steps", "task_id"), ("sales_followups", "enquiry_id")):
        try:
            op.create_index(f"ix_{name}_{col}", name, [col])
        except Exception:
            pass
    # create_all() adds these model-level constraints locally; an Alembic-only
    # deployment must get them too (deduplicate legacy rows first).
    for table, cols, constraint in (
        ("business_knowledge", ["category", "key"], "uq_bk_category_key"),
        ("analytics_snapshots", ["period", "metric", "source"], "uq_snap_period_metric"),
    ):
        names = {c.get("name") for c in sa.inspect(bind).get_unique_constraints(table)}
        if constraint in names:
            continue
        grouped = ", ".join(cols)
        op.execute(f"DELETE FROM {table} WHERE id NOT IN "
                   f"(SELECT MIN(id) FROM {table} GROUP BY {grouped})")
        op.create_unique_constraint(constraint, table, cols)


def downgrade():
    for name in ("creative_assets", "sales_followups", "analytics_snapshots",
                 "business_knowledge", "ai_execution_logs", "ai_approvals",
                 "ai_task_steps", "ai_tasks", "ai_agents"):
        op.drop_table(name)
