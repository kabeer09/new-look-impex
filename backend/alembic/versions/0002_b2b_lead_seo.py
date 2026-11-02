"""Add B2B/CSV-sync + lead + SEO-page columns (additive).

- products: external_product_id, capacity, price_visibility, stock_status
- enquiries (leads): reference, phone, product_id
- seo_pages: new table for admin-configurable page metadata
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_b2b_lead_seo"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _cols_exist(bind, table):
    insp = sa.inspect(bind)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    existing_p = _cols_exist(bind, "products")
    with op.batch_alter_table("products") as b:
        if "external_product_id" not in existing_p:
            b.add_column(sa.Column("external_product_id", sa.String(255), server_default=""))
        if "capacity" not in existing_p:
            b.add_column(sa.Column("capacity", sa.String(128), server_default=""))
        if "price_visibility" not in existing_p:
            b.add_column(sa.Column("price_visibility", sa.String(32), server_default="on_request"))
        if "stock_status" not in existing_p:
            b.add_column(sa.Column("stock_status", sa.String(32), server_default=""))
    op.create_index("ix_products_external_product_id", "products", ["external_product_id"], unique=False)

    existing_e = _cols_exist(bind, "enquiries")
    with op.batch_alter_table("enquiries") as b:
        if "reference" not in existing_e:
            b.add_column(sa.Column("reference", sa.String(64), nullable=True))
        if "phone" not in existing_e:
            b.add_column(sa.Column("phone", sa.String(64), server_default=""))
        if "product_id" not in existing_e:
            b.add_column(sa.Column("product_id", sa.Integer(), nullable=True))
    op.create_index("ix_enquiries_reference", "enquiries", ["reference"], unique=True)
    op.create_index("ix_enquiries_product_id", "enquiries", ["product_id"], unique=False)

    op.create_table(
        "seo_pages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("path", sa.String(512), nullable=False),
        sa.Column("title", sa.String(512), server_default=""),
        sa.Column("meta_description", sa.String(1024), server_default=""),
        sa.Column("canonical_url", sa.String(1024), server_default=""),
        sa.Column("og_image_url", sa.String(1024), server_default=""),
        sa.Column("published", sa.Boolean(), server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_seo_pages_path", "seo_pages", ["path"], unique=True)


def downgrade() -> None:
    op.drop_table("seo_pages")
    op.drop_index("ix_enquiries_product_id", table_name="enquiries")
    op.drop_index("ix_enquiries_reference", table_name="enquiries")
    with op.batch_alter_table("enquiries") as b:
        b.drop_column("product_id")
        b.drop_column("phone")
        b.drop_column("reference")
    op.drop_index("ix_products_external_product_id", table_name="products")
    with op.batch_alter_table("products") as b:
        b.drop_column("stock_status")
        b.drop_column("price_visibility")
        b.drop_column("capacity")
        b.drop_column("external_product_id")
