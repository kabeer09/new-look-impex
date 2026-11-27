"""AI Help Desk Manager — agent messaging, tasks, reports, schedules.

Revision ID: 0004_ai_helpdesk
Revises: 0003_ai_command_centre
Create Date: 2026-11-25

The application calls Base.metadata.create_all() on startup, so missing tables
are created automatically. This revision documents the production schema for
PostgreSQL/Supabase and supports explicit `alembic upgrade head`.
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_ai_helpdesk"
down_revision = "0003_ai_command_centre"
branch_labels = None
depends_on = None

UID = sa.String(36)


def _common():
    return [sa.Column("id", UID, primary_key=True), sa.Column("created_at", sa.DateTime, nullable=True)]


def _guards():
    """Skip DDL already applied by create_all() at app startup."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = set(insp.get_table_names())
    _raw_create_index = op.create_index

    def create_table(name, *cols):
        if name not in tables:
            op.create_table(name, *cols)

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
    create_table("agent_messages",
        sa.Column("id", UID, primary_key=True),
        sa.Column("conversation_id", UID, nullable=True),
        sa.Column("task_id", UID, nullable=True),
        sa.Column("from_agent", sa.String(64), default=""),
        sa.Column("to_agent", sa.String(64), default=""),
        sa.Column("kind", sa.String(32), default="info"),
        sa.Column("subject", sa.String(255), default=""),
        sa.Column("body", sa.Text, default=""),
        sa.Column("references_json", sa.Text, default="[]"),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )
    create_index("ix_agent_messages_from", "agent_messages", ["from_agent"])
    create_index("ix_agent_messages_to", "agent_messages", ["to_agent"])
    create_index("ix_agent_messages_conversation", "agent_messages", ["conversation_id"])

    create_table("agent_tasks",
        sa.Column("id", UID, primary_key=True),
        sa.Column("title", sa.String(255), default=""),
        sa.Column("description", sa.Text, default=""),
        sa.Column("assigned_agent", sa.String(64), default=""),
        sa.Column("requesting_agent", sa.String(64), default=""),
        sa.Column("conversation_id", UID, nullable=True),
        sa.Column("priority", sa.String(16), default="normal"),
        sa.Column("status", sa.String(28), default="CREATED"),
        sa.Column("due_at", sa.DateTime, nullable=True),
        sa.Column("output_json", sa.Text, default="{}"),
        sa.Column("sources_json", sa.Text, default="[]"),
        sa.Column("approval_required", sa.Boolean, default=False),
        sa.Column("error", sa.Text, default=""),
        sa.Column("retries", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.Column("updated_at", sa.DateTime, nullable=True),
    )
    for name in ("assigned_agent", "status", "priority", "conversation_id"):
        create_index(f"ix_agent_tasks_{name}", "agent_tasks", [name])

    create_table("agent_task_dependencies",
        sa.Column("id", UID, primary_key=True),
        sa.Column("task_id", UID, nullable=False),
        sa.Column("depends_on", UID, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )
    create_index("ix_agent_task_deps_task", "agent_task_dependencies", ["task_id"])
    create_index("ix_agent_task_deps_on", "agent_task_dependencies", ["depends_on"])

    create_table("agent_collaborations",
        sa.Column("id", UID, primary_key=True),
        sa.Column("topic", sa.String(255), default=""),
        sa.Column("agents_json", sa.Text, default="[]"),
        sa.Column("status", sa.String(24), default="running"),
        sa.Column("result_json", sa.Text, default="{}"),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )

    create_table("agent_reports",
        sa.Column("id", UID, primary_key=True),
        sa.Column("agent_key", sa.String(64), default=""),
        sa.Column("week", sa.String(16), default=""),
        sa.Column("title", sa.String(255), default=""),
        sa.Column("content", sa.Text, default=""),
        sa.Column("data_json", sa.Text, default="{}"),
        sa.Column("status", sa.String(24), default="submitted"),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("agent_key", "week", name="uq_agent_report_week"),
    )
    create_index("ix_agent_reports_agent", "agent_reports", ["agent_key"])
    create_index("ix_agent_reports_week", "agent_reports", ["week"])

    create_table("helpdesk_conversations",
        sa.Column("id", UID, primary_key=True),
        sa.Column("title", sa.String(255), default="Help Desk"),
        sa.Column("user_email", sa.String(255), default=""),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.Column("updated_at", sa.DateTime, nullable=True),
    )
    create_table("helpdesk_messages",
        sa.Column("id", UID, primary_key=True),
        sa.Column("conversation_id", UID, nullable=False),
        sa.Column("role", sa.String(16), default="user"),
        sa.Column("content", sa.Text, default=""),
        sa.Column("actions_json", sa.Text, default="[]"),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )
    create_index("ix_helpdesk_messages_conv", "helpdesk_messages", ["conversation_id"])

    create_table("weekly_reports",
        sa.Column("id", UID, primary_key=True),
        sa.Column("week", sa.String(16), nullable=False),
        sa.Column("title", sa.String(255), default=""),
        sa.Column("sections_json", sa.Text, default="{}"),
        sa.Column("summary", sa.Text, default=""),
        sa.Column("status", sa.String(24), default="generated"),
        sa.Column("pdf_filename", sa.String(255), default=""),
        sa.Column("emailed", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime, nullable=True),
        sa.UniqueConstraint("week", name="uq_weekly_report_week"),
    )
    create_index("ix_weekly_reports_week", "weekly_reports", ["week"])

    create_table("website_monitoring",
        sa.Column("id", UID, primary_key=True),
        sa.Column("day", sa.String(16), default=""),
        sa.Column("check", sa.String(64), default=""),
        sa.Column("result_json", sa.Text, default="{}"),
        sa.Column("status", sa.String(24), default="ok"),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )
    create_index("ix_website_monitoring_day", "website_monitoring", ["day"])

    create_table("notification_preferences",
        sa.Column("id", UID, primary_key=True),
        sa.Column("event", sa.String(64), nullable=False),
        sa.Column("channel", sa.String(24), default="dashboard"),
        sa.Column("enabled", sa.Boolean, default=True),
        sa.Column("threshold", sa.String(64), default=""),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )
    create_table("automation_schedules",
        sa.Column("id", UID, primary_key=True),
        sa.Column("key", sa.String(64), nullable=False),
        sa.Column("cadence", sa.String(24), default="weekly"),
        sa.Column("day", sa.String(16), default="Friday"),
        sa.Column("time", sa.String(8), default="18:00"),
        sa.Column("timezone", sa.String(48), default="Asia/Kolkata"),
        sa.Column("enabled", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )


def downgrade():
    for table in ("automation_schedules", "notification_preferences", "website_monitoring",
                  "weekly_reports", "helpdesk_messages", "helpdesk_conversations", "agent_reports",
                  "agent_collaborations", "agent_task_dependencies", "agent_tasks", "agent_messages"):
        op.drop_table(table)
