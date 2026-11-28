"""Additive Growth Controller task columns.

Revision ID: 0008_growth_controller
Revises: 0007_gsc_indexing_audit
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_growth_controller"
down_revision = "0007_gsc_indexing_audit"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("agent_tasks")}
    if "component" not in cols:
        op.add_column("agent_tasks", sa.Column("component", sa.String(128), default=""))
    if "evidence_json" not in cols:
        op.add_column("agent_tasks", sa.Column("evidence_json", sa.Text, default="{}"))
    names = {i.get("name") for i in sa.inspect(bind).get_indexes("agent_tasks")}
    if "ix_agent_tasks_component" not in names:
        op.create_index("ix_agent_tasks_component", "agent_tasks", ["component"])


def downgrade():
    try:
        op.drop_index("ix_agent_tasks_component", table_name="agent_tasks")
    except Exception:
        pass
    for col in ("evidence_json", "component"):
        try:
            op.drop_column("agent_tasks", col)
        except Exception:
            pass
