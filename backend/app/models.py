"""Database models for all modules."""
from datetime import datetime, timezone
from sqlalchemy import (Boolean, Column, Date, DateTime, Float, ForeignKey, Integer,
                        Numeric, String, Text, UniqueConstraint, Index)
from .database import Base


def _now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="admin")  # admin | editor | viewer
    is_active = Column(Boolean, default=True)
    # auth_provider: local (password) or google (OAuth). Google users get an
    # unusable password_hash sentinel so password login can never succeed.
    auth_provider = Column(String(32), default="local")
    display_name = Column(String(255), default="")
    created_at = Column(DateTime, default=_now)


class WebsiteProperty(Base):
    __tablename__ = "website_properties"
    id = Column(Integer, primary_key=True)
    domain = Column(String(255), nullable=False)
    site_url = Column(String(512), default="")
    created_at = Column(DateTime, default=_now)


class Integration(Base):
    __tablename__ = "integrations"
    id = Column(Integer, primary_key=True)
    provider = Column(String(64), nullable=False)  # google_search_console | google_analytics
    status = Column(String(32), default="disconnected")  # disconnected|connected|error
    property_id = Column(String(512), default="")  # GSC site url or GA4 property id
    access_token = Column(Text, default="")
    refresh_token = Column(Text, default="")
    meta_json = Column(Text, default="{}")
    updated_at = Column(DateTime, default=_now, onupdate=_now)
    __table_args__ = (UniqueConstraint("provider", name="uq_integration_provider"),)


class TrackedKeyword(Base):
    __tablename__ = "tracked_keywords"
    id = Column(Integer, primary_key=True)
    keyword = Column(String(512), nullable=False)
    country = Column(String(64), default="")
    language = Column(String(16), default="en")
    product_category = Column(String(128), default="")
    intent = Column(String(32), default="commercial")  # informational|commercial|transactional|navigational
    source = Column(String(64), default="manual")  # manual|csv|gsc|ai
    status = Column(String(32), default="tracked")
    priority = Column(String(16), default="medium")
    target_url = Column(String(1024), default="")
    impressions = Column(Integer, nullable=True)
    clicks = Column(Integer, nullable=True)
    ctr = Column(Float, nullable=True)
    position = Column(Float, nullable=True)
    volume_estimate = Column(Integer, nullable=True)
    competition_estimate = Column(String(32), nullable=True)
    business_relevance = Column(Float, default=0.5)
    commercial_intent = Column(Float, default=0.5)
    opportunity_score = Column(Float, default=0.0)
    opportunity_factors = Column(Text, default="{}")
    cluster = Column(String(128), default="")
    related_keywords = Column(Text, default="[]")
    last_analysed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)
    __table_args__ = (
        UniqueConstraint("keyword", "country", name="uq_keyword_country"),
        Index("ix_kw_score", "opportunity_score"),
    )


class WebsitePage(Base):
    __tablename__ = "website_pages"
    id = Column(Integer, primary_key=True)
    url = Column(String(1024), unique=True, nullable=False)
    title = Column(String(512), default="")
    meta_description = Column(String(1024), default="")
    h1 = Column(String(512), default="")
    word_count = Column(Integer, default=0)
    status_code = Column(Integer, nullable=True)
    is_indexable = Column(Boolean, default=True)
    target_keyword = Column(String(512), default="")
    last_crawled_at = Column(DateTime, nullable=True)


class SeoPage(Base):
    """Admin-configurable SEO metadata for a static page (homepage, /wholesale,
    /export, regional pages, …). The frontend reads these to emit unique titles,
    meta descriptions and canonical URLs without a code deploy."""
    __tablename__ = "seo_pages"
    id = Column(Integer, primary_key=True)
    path = Column(String(512), unique=True, nullable=False, index=True)
    title = Column(String(512), default="")
    meta_description = Column(String(1024), default="")
    canonical_url = Column(String(1024), default="")
    og_image_url = Column(String(1024), default="")
    published = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class SeoAudit(Base):
    __tablename__ = "seo_audits"
    id = Column(Integer, primary_key=True)
    url = Column(String(1024), nullable=False)
    checks_json = Column(Text, default="{}")
    issues_json = Column(Text, default="[]")
    score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_now)


class SeoRecommendation(Base):
    __tablename__ = "seo_recommendations"
    id = Column(Integer, primary_key=True)
    title = Column(String(512), nullable=False)
    explanation = Column(Text, default="")
    evidence = Column(Text, default="")
    url = Column(String(1024), default="")
    target_keyword = Column(String(512), default="")
    expected_benefit = Column(String(1024), default="")  # labelled estimate
    confidence = Column(String(16), default="medium")
    priority = Column(String(16), default="medium")
    effort = Column(String(16), default="medium")
    proposed_change = Column(Text, default="{}")
    risks = Column(Text, default="")
    requires_approval = Column(Boolean, default=True)
    status = Column(String(32), default="new")  # new|pending|approved|rejected|scheduled|published|failed|monitoring|completed
    result_plan = Column(Text, default="")
    dedupe_key = Column(String(512), default="", index=True)
    created_at = Column(DateTime, default=_now)
    decided_at = Column(DateTime, nullable=True)
    decided_by = Column(String(255), default="")


class ContentDraft(Base):
    __tablename__ = "content_drafts"
    id = Column(Integer, primary_key=True)
    kind = Column(String(64), default="product_description")
    target_url = Column(String(1024), default="")
    target_keyword = Column(String(512), default="")
    title = Column(String(512), default="")
    body = Column(Text, default="")
    meta_title = Column(String(512), default="")
    meta_description = Column(String(1024), default="")
    faqs_json = Column(Text, default="[]")
    status = Column(String(32), default="draft")
    created_at = Column(DateTime, default=_now)


class ContentVersion(Base):
    __tablename__ = "content_versions"
    id = Column(Integer, primary_key=True)
    url = Column(String(1024), nullable=False)
    field_name = Column(String(128), nullable=False)
    old_value = Column(Text, default="")
    new_value = Column(Text, default="")
    recommendation_id = Column(Integer, ForeignKey("seo_recommendations.id"), nullable=True)
    approved_by = Column(String(255), default="")
    created_at = Column(DateTime, default=_now)


class PublishingLog(Base):
    __tablename__ = "publishing_logs"
    id = Column(Integer, primary_key=True)
    recommendation_id = Column(Integer, ForeignKey("seo_recommendations.id"), nullable=True)
    url = Column(String(1024), default="")
    action = Column(String(64), default="publish")
    result = Column(String(32), default="success")
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=_now)


class AnalyticsDaily(Base):
    __tablename__ = "analytics_daily"
    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False, index=True)
    source = Column(String(32), default="gsc")  # gsc|ga|manual|sample
    url = Column(String(1024), default="")
    query = Column(String(512), default="")
    clicks = Column(Integer, default=0)
    impressions = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)
    position = Column(Float, nullable=True)
    sessions = Column(Integer, default=0)
    __table_args__ = (UniqueConstraint("date", "source", "url", "query", name="uq_analytics_day"),)


class Enquiry(Base):
    """A buyer lead / wholesale enquiry (the spec's "Lead" entity)."""
    __tablename__ = "enquiries"
    id = Column(Integer, primary_key=True)
    # Unique reference shown to the buyer and used for support lookups.
    reference = Column(String(64), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    company = Column(String(255), default="")
    phone = Column(String(64), default="")  # WhatsApp / phone
    country = Column(String(64), default="")
    # Optional link to the product that prompted the enquiry.
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    product_interest = Column(String(255), default="")
    quantity = Column(String(64), default="")
    # Buyer's preferred quotation currency (Phase 6) — display/quote preference only.
    preferred_currency = Column(String(8), default="")
    message = Column(Text, default="")
    consent = Column(Boolean, default=False)
    source = Column(String(64), default="website")
    landing_page = Column(String(1024), default="")
    referrer = Column(String(1024), default="")
    campaign = Column(String(512), default="")
    status = Column(String(32), default="new")  # new|qualified|contacted|quoted|won|lost|spam
    score = Column(Float, default=0.0)
    notes = Column(Text, default="")
    follow_up_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"
    id = Column(Integer, primary_key=True)
    workflow = Column(String(128), nullable=False)
    status = Column(String(32), default="success")
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    actor = Column(String(255), default="")
    action = Column(String(128), nullable=False)
    entity = Column(String(128), default="")
    entity_id = Column(String(64), default="")
    detail = Column(Text, default="")
    created_at = Column(DateTime, default=_now)


# ================= COMMERCE / CATALOGUE =================

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    image_url = Column(String(1024), default="")
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    seo_title = Column(String(512), default="")
    seo_description = Column(String(1024), default="")
    featured = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    status = Column(String(32), default="published")  # draft | published | archived
    created_at = Column(DateTime, default=_now)
    __table_args__ = (Index("ix_category_status", "status"),)


class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, default="")
    image_url = Column(String(1024), default="")
    seo_title = Column(String(512), default="")
    seo_description = Column(String(1024), default="")
    featured = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    status = Column(String(32), default="published")
    created_at = Column(DateTime, default=_now)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    # Identifier from the source catalogue (e.g. linker.store). Preserved so the
    # record can be re-synchronised with the upstream store on later imports.
    external_product_id = Column(String(255), default="", index=True)
    name = Column(String(512), nullable=False)
    slug = Column(String(512), unique=True, nullable=False, index=True)
    short_description = Column(Text, default="")
    description = Column(Text, default="")
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    material = Column(String(255), default="")
    capacity = Column(String(128), default="")  # only when confirmed (e.g. "1000 ml")
    finish = Column(String(255), default="")
    color = Column(String(255), default="")
    dimensions = Column(String(255), default="")
    weight = Column(String(128), default="")
    sku = Column(String(128), default="", index=True)
    tags = Column(Text, default="[]")  # JSON list
    moq = Column(String(128), default="")  # only when confirmed
    lead_time = Column(String(128), default="")  # only when confirmed
    packaging_info = Column(Text, default="")
    price = Column(Float, nullable=True)  # optional; null = not published
    currency = Column(String(8), default="USD")
    price_on_request = Column(Boolean, default=True)
    # public | on_request | hidden — explicit price display control for the CSV
    # import / storefront. Kept in sync with price_on_request on save.
    price_visibility = Column(String(32), default="on_request")
    # "" (unknown/not tracked) | in_stock | out_of_stock | made_to_order
    stock_status = Column(String(32), default="")
    featured = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    status = Column(String(32), default="draft")  # draft | published | archived
    seo_title = Column(String(512), default="")
    seo_description = Column(String(1024), default="")
    # Provenance: where this record was imported from (e.g. merchant's own
    # live site). Used for dedupe and admin review.
    source_url = Column(String(1024), default="", index=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
    __table_args__ = (
        Index("ix_product_status", "status"),
        Index("ix_product_featured", "featured"),
        Index("ix_product_category", "category_id", "status"),
    )


class ProductImage(Base):
    __tablename__ = "product_images"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(1024), nullable=False)
    alt_text = Column(String(512), default="")
    is_primary = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    # Image rights: own | supplier_authorised | licensed | ai_generated
    source = Column(String(32), default="")
    permission = Column(String(512), default="")
    # Concept (AI-generated) imagery — never a photograph of a real product.
    is_concept = Column(Boolean, default=False)


class ProductVariant(Base):
    __tablename__ = "product_variants"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(128), default="")
    price = Column(Float, nullable=True)
    moq = Column(String(128), default="")
    sort_order = Column(Integer, default=0)


class ProductSpec(Base):
    __tablename__ = "product_specs"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(255), nullable=False)
    value = Column(Text, default="")


class ProductCollection(Base):
    __tablename__ = "product_collections"
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True)


class ProductSlugRedirect(Base):
    """Permanent slug history: old_slug -> product. Powers 308 redirects so
    renamed products keep their rankings and inbound links."""
    __tablename__ = "product_slug_redirects"
    id = Column(Integer, primary_key=True)
    old_slug = Column(String(512), unique=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    created_at = Column(DateTime, default=_now)


# ================= PRODUCT REVIEWS =================
class ProductReview(Base):
    __tablename__ = "product_reviews"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewer_name = Column(String(255), nullable=False)
    reviewer_email = Column(String(255), default="")
    rating = Column(Integer, nullable=False)  # 1-5
    title = Column(String(512), default="")
    body = Column(Text, default="")
    status = Column(String(32), default="pending")  # pending | approved | rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)


# ================= DISCOUNT CODES =================
class CampaignSend(Base):
    """One row per automated campaign email blast (announcement / reminder),
    so each seasonal sale emails subscribers exactly once."""
    __tablename__ = "campaign_sends"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)  # e.g. "AUTUMN25:announcement"
    campaign = Column(String(128), default="")
    kind = Column(String(32), default="announcement")  # announcement | reminder
    recipients = Column(Integer, default=0)
    sent_ok = Column(Integer, default=0)
    sent_at = Column(DateTime, default=_now)


class DiscountCode(Base):
    __tablename__ = "discount_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    description = Column(String(512), default="")
    discount_type = Column(String(16), default="percent")  # percent | fixed
    discount_value = Column(Float, default=0)
    min_order_qty = Column(Integer, default=0)
    max_uses = Column(Integer, default=0)  # 0 = unlimited
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    starts_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    source = Column(String(32), default="manual")  # manual | campaign (auto-synced)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============ SITE CONTROL (campaigns + editable homepage content) ============
class Campaign(Base):
    """Admin-managed sale campaign with explicit start/end scheduling."""
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), default="")
    short = Column(String(128), default="")
    emoji = Column(String(32), default="")
    percent = Column(Integer, default=0)
    tagline = Column(String(512), default="")
    blurb = Column(Text, default="")
    cta = Column(String(255), default="")
    image_url = Column(String(1024), default="")
    starts_at = Column(DateTime, nullable=True, index=True)
    ends_at = Column(DateTime, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class SiteContent(Base):
    """Editable public-site content block. value is JSON (list/object/string)."""
    __tablename__ = "site_content"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(128), unique=True, nullable=False, index=True)
    label = Column(String(255), default="")
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=_now, onupdate=_now)


# ================= RFQ =================

class RFQ(Base):
    __tablename__ = "rfqs"
    id = Column(Integer, primary_key=True)
    reference_number = Column(String(64), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    business_email = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255), default="")
    country = Column(String(128), default="")
    phone = Column(String(64), default="")
    target_price = Column(String(128), default="")
    delivery_timeframe = Column(String(128), default="")
    additional_requirements = Column(Text, default="")
    preferred_currency = Column(String(8), default="")
    consent = Column(Boolean, default=False)
    status = Column(String(32), default="new")  # new | contacted | quoted | won | lost
    notes = Column(Text, default="")
    items_hash = Column(String(128), default="", index=True)
    created_at = Column(DateTime, default=_now)


class RFQItem(Base):
    __tablename__ = "rfq_items"
    id = Column(Integer, primary_key=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(512), nullable=False)
    quantity = Column(String(128), default="")
    unit = Column(String(64), default="")
    notes = Column(Text, default="")


class RfqDraft(Base):
    """Abandoned-RFQ recovery — a quote request the buyer started but never sent.

    The public form autosaves here (keyed by an anonymous per-browser draft key
    generated in localStorage — no account, no IP stored) so the team can follow
    up on warm, half-finished enquiries. `status` moves to "sent" automatically
    when the matching RFQ is submitted, and to "dismissed" from the admin panel.
    `items_json` is a snapshot of the RFQ cart at last save (context only).
    """
    __tablename__ = "rfq_drafts"
    id = Column(Integer, primary_key=True)
    draft_key = Column(String(64), nullable=False, unique=True, index=True)
    full_name = Column(String(255), default="")
    business_email = Column(String(255), default="", index=True)
    company_name = Column(String(255), default="")
    country = Column(String(128), default="")
    phone = Column(String(64), default="")
    target_price = Column(String(128), default="")
    delivery_timeframe = Column(String(128), default="")
    additional_requirements = Column(Text, default="")
    preferred_currency = Column(String(8), default="")
    items_json = Column(Text, default="[]")
    status = Column(String(32), default="open")  # open | sent | dismissed
    reminded_at = Column(DateTime, nullable=True)  # one gentle follow-up at most
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


# ================= BUYER RESEARCH / CRM =================

class Buyer(Base):
    __tablename__ = "buyers"
    id = Column(Integer, primary_key=True)
    company_name = Column(String(512), nullable=False)
    website = Column(String(1024), default="")
    country = Column(String(128), default="")
    buyer_category = Column(String(128), default="")  # home decor retailer | gift shop | importer | ...
    product_relevance = Column(String(512), default="")
    contact_name = Column(String(255), default="")
    contact_email = Column(String(255), default="")  # only when user-provided/verified
    phone = Column(String(64), default="")
    source_url = Column(String(1024), default="")
    source_type = Column(String(64), default="manual")  # manual | csv | directory | exhibitor_list
    date_collected = Column(Date, nullable=True)
    verification_status = Column(String(32), default="unverified")  # unverified | pending | verified
    notes = Column(Text, default="")
    lead_score = Column(Float, default=0.0)
    qualification_json = Column(Text, default="{}")  # {score, factors, explanation}
    outreach_status = Column(String(32), default="not_contacted")  # not_contacted|contacted|replied|interested|not_interested|unsubscribed|do_not_contact
    created_at = Column(DateTime, default=_now)
    __table_args__ = (Index("ix_buyer_outreach", "outreach_status"),)


class OutreachRecord(Base):
    __tablename__ = "outreach_records"
    id = Column(Integer, primary_key=True)
    buyer_id = Column(Integer, ForeignKey("buyers.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(32), default="email")
    subject = Column(String(512), default="")
    body = Column(Text, default="")
    status = Column(String(32), default="draft")  # draft | approved | sent | failed | suppressed
    provider_response = Column(Text, default="")
    reply_status = Column(String(32), default="")
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)


# ================= SETTINGS / MEDIA / ANALYTICS =================

class BusinessSetting(Base):
    __tablename__ = "business_settings"
    id = Column(Integer, primary_key=True)
    key = Column(String(128), unique=True, nullable=False)
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class MediaFile(Base):
    __tablename__ = "media_files"
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), unique=True, nullable=False)
    original_name = Column(String(255), default="")
    content_type = Column(String(128), default="")
    size = Column(Integer, default=0)
    alt_text = Column(String(512), default="")
    # Image rights: own | supplier_authorised | licensed | ai_generated
    source = Column(String(32), default="")
    permission = Column(String(512), default="")
    has_thumb = Column(Boolean, default=False)
    has_webp = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=_now)


class ProductImport(Base):
    __tablename__ = "product_imports"
    id = Column(Integer, primary_key=True)
    kind = Column(String(32), nullable=False)  # image | csv | url | concept | watch
    filename = Column(String(255), default="")
    source_url = Column(String(1024), default="")
    rights_source = Column(String(32), default="")
    category_id = Column(Integer, nullable=True)
    status = Column(String(32), default="previewed")  # previewed | saved | partial | failed
    items_json = Column(Text, default="[]")
    error = Column(Text, default="")
    created_by = Column(String(255), default="")
    created_at = Column(DateTime, default=_now)


# ================= AI CATALOGUE PIPELINE =================

# Pipeline statuses for AI-managed products (spec §3). Stored on
# ProductSeoProfile.status; "published" mirrors products.status="published".
PIPELINE_STATUSES = ("pending", "analyzing", "ai_generated", "needs_review",
                     "approved", "published", "failed")


class ProductSeoProfile(Base):
    """Full AI-generated product & SEO payload for one product (spec §5-§9).

    One row per product in the AI catalogue pipeline. Holds the structured AI
    output (descriptions, IndiaMART-style keywords, Google metadata, image SEO,
    JSON-LD, B2B info) as JSON blobs so the admin can edit every field before
    approving. Nothing here is public until the product is published AND the
    profile is approved — the pipeline never auto-publishes."""
    __tablename__ = "product_seo_profiles"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"),
                        nullable=False, index=True, unique=True)
    # pending | analyzing | ai_generated | needs_review | approved | published | failed
    status = Column(String(32), default="pending", index=True)
    # Provenance: "ai:<model>" or "rule-based (no vision provider)".
    source = Column(String(128), default="")
    # Facts observed in the image vs assumptions — kept separate (spec §4/§15).
    observed_json = Column(Text, default="{}")
    descriptions_json = Column(Text, default="{}")   # short/detailed/b2b/manufacturer/indiamart/buyer
    keywords_json = Column(Text, default="{}")       # primary/secondary/long_tail/… groups
    seo_json = Column(Text, default="{}")            # title/meta/slug/focus/OG/canonical
    image_seo_json = Column(Text, default="[]")      # per-image alt/title/caption/description
    schema_json = Column(Text, default="{}")         # JSON-LD blocks
    b2b_json = Column(Text, default="{}")            # manufacturer/exporter/wholesale info
    needs_verification_json = Column(Text, default="[]")
    error = Column(Text, default="")
    generated_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(255), default="")
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
    __table_args__ = (Index("ix_seo_profile_status", "status"),)


class ProductScanFile(Base):
    """Hash registry for the product-photo scan folder (spec §3/§14).

    One row per file ever seen in PRODUCT_SCAN_DIR. Originals are never moved
    or deleted; re-scans skip registered paths, and sha256/phash prevent the
    same photo (or a near-identical copy) from creating duplicate products."""
    __tablename__ = "product_scan_files"
    id = Column(Integer, primary_key=True)
    # Path relative to the scan root — stable identifier across scans.
    rel_path = Column(String(1024), unique=True, nullable=False, index=True)
    sha256 = Column(String(64), nullable=False, index=True)
    # Perceptual (average) hash, hex-encoded 64-bit — near-duplicate detection.
    phash = Column(String(16), default="", index=True)
    size = Column(Integer, default=0)
    original_name = Column(String(255), default="")
    # Media-store filename after ingestion (descriptive name + derivatives).
    media_filename = Column(String(255), default="")
    # Product this image belongs to (set once ingested/attached).
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"),
                        nullable=True, index=True)
    # new | ingested | attached | duplicate | failed
    status = Column(String(32), default="new", index=True)
    detail = Column(Text, default="")
    first_seen_at = Column(DateTime, default=_now)
    ingested_at = Column(DateTime, nullable=True)
    __table_args__ = (Index("ix_scan_file_sha", "sha256"),)


class Banner(Base):
    __tablename__ = "banners"
    id = Column(Integer, primary_key=True)
    placement = Column(String(64), default="home_hero", index=True)
    title = Column(String(255), default="")
    subtitle = Column(String(512), default="")
    image_url = Column(String(1024), nullable=False)
    cta_text = Column(String(128), default="")
    cta_link = Column(String(512), default="")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_now)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    id = Column(Integer, primary_key=True)
    event_type = Column(String(64), nullable=False, index=True)  # product_view|rfq_add|rfq_submit|catalogue_download|contact_click|whatsapp_click
    url = Column(String(1024), default="")
    product_id = Column(Integer, nullable=True)
    country = Column(String(128), default="")
    referrer = Column(String(1024), default="")
    campaign = Column(String(512), default="")
    created_at = Column(DateTime, default=_now)
# ================= SECURITY MODELS =================

class LoginAttempt(Base):
    """Records login attempts (success/failure) for security monitoring."""
    __tablename__ = "login_attempts"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(64), nullable=False, index=True)
    user_agent = Column(String(512), default="")
    success = Column(Boolean, default=False, index=True)
    failure_reason = Column(String(255), default="")
    created_at = Column(DateTime, default=_now, index=True)


class BlockedIP(Base):
    """IP addresses temporarily or permanently blocked from the admin/API."""
    __tablename__ = "blocked_ips"
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(64), unique=True, nullable=False, index=True)
    reason = Column(String(255), default="")
    blocked_at = Column(DateTime, default=_now)
    expires_at = Column(DateTime, nullable=True)  # NULL = permanent block
    blocked_by = Column(String(255), default="system")
    created_at = Column(DateTime, default=_now)


class SecurityEvent(Base):
    """Security-relevant events for monitoring and alerting."""
    __tablename__ = "security_events"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)  # failed_login|turnstile_fail|rate_limit|sql_injection|xss|csrf|unauthorized_admin
    ip_address = Column(String(64), nullable=False, index=True)
    user_email = Column(String(255), nullable=True, index=True)
    path = Column(String(1024), default="")
    detail = Column(Text, default="")
    severity = Column(String(16), default="medium")  # low|medium|high|critical
    created_at = Column(DateTime, default=_now, index=True)


class UserSession(Base):
    """Tracks active user sessions for revocation/monitoring."""
    __tablename__ = "user_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, index=True)  # hash of JWT
    refresh_token_hash = Column(String(255), nullable=True, index=True)
    ip_address = Column(String(64), default="")
    user_agent = Column(String(512), default="")
    created_at = Column(DateTime, default=_now)
    last_activity = Column(DateTime, default=_now, onupdate=_now)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String(255), default="")


class TwoFactorSecret(Base):
    """Stores TOTP secrets for users with 2FA enabled."""
    __tablename__ = "two_factor_secrets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    secret = Column(String(255), nullable=False)  # base32-encoded TOTP secret
    enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


# ================= END SECURITY MODELS =================


# ================= QUOTATION MANAGEMENT =================
class QuotationSetting(Base):
    """Single-row exporter defaults + default terms for quotations."""
    __tablename__ = "quotation_settings"
    id = Column(Integer, primary_key=True)
    company_name = Column(String(255), default="New Look Impex")
    address = Column(Text, default="")
    contact_person = Column(String(255), default="")
    email = Column(String(255), default="")
    phone = Column(String(128), default="")
    whatsapp = Column(String(128), default="")
    website = Column(String(512), default="https://www.newlookimpex.store")
    gstin = Column(String(128), default="")
    iec = Column(String(128), default="")
    default_currency = Column(String(16), default="USD")
    default_terms = Column(Text, default="")
    validity_days = Column(Integer, default=30)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Quotation(Base):
    """A B2B quotation prepared by the exporter for one buyer."""
    __tablename__ = "quotations"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(64), unique=True, nullable=False, index=True)  # NLI-QTN-YYYY-####
    status = Column(String(24), default="draft", index=True)  # draft|sent|accepted|rejected|expired
    # exporter snapshot (editable per quote; prefilled from QuotationSetting)
    exporter = Column(Text, default="")  # JSON blob of exporter fields
    # buyer fields
    buyer_company = Column(String(255), default="")
    buyer_contact = Column(String(255), default="")
    buyer_email = Column(String(255), default="")
    buyer_phone = Column(String(128), default="")
    buyer_whatsapp = Column(String(128), default="")
    buyer_country = Column(String(128), default="", index=True)
    buyer_address = Column(Text, default="")
    buyer_type = Column(String(128), default="")
    buyer_notes = Column(Text, default="")
    # commercial terms
    currency = Column(String(16), default="USD")
    shipping_method = Column(String(64), default="")
    incoterm = Column(String(32), default="")
    shipping_charges = Column(Numeric(14, 2), default=0)
    packing_charges = Column(Numeric(14, 2), default=0)
    sample_charges = Column(Numeric(14, 2), default=0)
    discount = Column(Numeric(14, 2), default=0)
    tax = Column(Numeric(14, 2), default=0)
    port_loading = Column(String(255), default="")
    port_destination = Column(String(255), default="")
    delivery_time = Column(String(255), default="")
    production_lead = Column(String(255), default="")
    payment_terms = Column(Text, default="")
    advance_pct = Column(Numeric(6, 2), default=0)
    balance_terms = Column(Text, default="")
    quote_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True, index=True)
    terms = Column(Text, default="")
    buyer_qa = Column(Text, default="")  # buyer questions + your answers (JSON list)
    subtotal = Column(Numeric(14, 2), default=0)
    grand_total = Column(Numeric(14, 2), default=0)
    pdf_filename = Column(String(512), default="")
    pdf_url = Column(String(1024), default="")
    created_by = Column(String(255), default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class QuotationItem(Base):
    """One product line on a quotation."""
    __tablename__ = "quotation_items"
    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, nullable=True)  # link to catalogue when selected
    sku = Column(String(128), default="")
    name = Column(String(512), default="")
    description = Column(Text, default="")
    material = Column(String(128), default="")
    dimensions = Column(String(255), default="")
    weight = Column(String(128), default="")
    images = Column(Text, default="")  # JSON array of media URLs
    quantity = Column(Numeric(14, 3), default=0)
    unit = Column(String(64), default="pcs")
    unit_price = Column(Numeric(14, 2), default=0)
    moq = Column(String(128), default="")
    packaging = Column(Text, default="")
    line_total = Column(Numeric(14, 2), default=0)
    sort_order = Column(Integer, default=0)


# ================= DOCUMENT STUDIO (quotations + invoices) =================
class CompanyProfile(Base):
    """Single-row company/exporter profile for all documents, incl. bank details."""
    __tablename__ = "company_profiles"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), default="New Look Impex")
    logo = Column(String(512), default="")  # media filename
    contact_person = Column(String(255), default="")
    address = Column(Text, default="")
    city = Column(String(128), default="")
    state = Column(String(128), default="")
    country = Column(String(128), default="India")
    postal_code = Column(String(64), default="")
    email = Column(String(255), default="")
    phone = Column(String(128), default="")
    whatsapp = Column(String(128), default="")
    website = Column(String(512), default="https://www.newlookimpex.store")
    gstin = Column(String(128), default="")
    iec = Column(String(128), default="")
    bank_name = Column(String(255), default="")
    account_holder = Column(String(255), default="")
    account_number = Column(String(255), default="")
    ifsc = Column(String(128), default="")
    swift = Column(String(128), default="")
    bank_address = Column(Text, default="")
    default_currency = Column(String(16), default="USD")
    validity_days = Column(Integer, default=30)
    default_quote_terms = Column(Text, default="")
    default_invoice_terms = Column(Text, default="")
    prefix_quotation = Column(String(32), default="NLI-QTN")
    prefix_pi = Column(String(32), default="NLI-PI")
    prefix_ci = Column(String(32), default="NLI-CI")
    prefix_invoice = Column(String(32), default="NLI-INV")
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class DocBuyer(Base):
    """A saved buyer reused across documents (independent of CRM leads)."""
    __tablename__ = "doc_buyers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), default="")
    company = Column(String(255), default="", index=True)
    contact = Column(String(255), default="")
    email = Column(String(255), default="")
    phone = Column(String(128), default="")
    whatsapp = Column(String(128), default="")
    country = Column(String(128), default="", index=True)
    billing_address = Column(Text, default="")
    shipping_address = Column(Text, default="")
    city = Column(String(128), default="")
    state = Column(String(128), default="")
    postal_code = Column(String(64), default="")
    tax_id = Column(String(128), default="")
    reference = Column(String(128), default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class Invoice(Base):
    """A proforma/commercial/sales invoice prepared manually."""
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(64), unique=True, nullable=False, index=True)
    doc_type = Column(String(24), default="proforma", index=True)  # proforma|commercial|sales|custom
    status = Column(String(24), default="draft", index=True)  # draft|sent|paid|partial|overdue
    exporter = Column(Text, default="")  # JSON snapshot
    buyer = Column(Text, default="")  # JSON snapshot (works for unsaved buyers)
    buyer_id = Column(Integer, nullable=True)  # link when saved buyer used
    currency = Column(String(16), default="USD")
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True, index=True)
    po_number = Column(String(128), default="")
    ref_quotation = Column(String(128), default="")
    order_number = Column(String(128), default="")
    # charges
    subtotal = Column(Numeric(14, 2), default=0)
    discount = Column(Numeric(14, 2), default=0)
    packing_charges = Column(Numeric(14, 2), default=0)
    freight_charges = Column(Numeric(14, 2), default=0)
    insurance = Column(Numeric(14, 2), default=0)
    other_charges = Column(Numeric(14, 2), default=0)
    tax = Column(Numeric(14, 2), default=0)
    grand_total = Column(Numeric(14, 2), default=0)
    amount_paid = Column(Numeric(14, 2), default=0)
    balance_due = Column(Numeric(14, 2), default=0)
    payment_status = Column(String(24), default="unpaid", index=True)  # unpaid|partial|paid|overdue
    payment_method = Column(String(128), default="")
    payment_reference = Column(String(128), default="")
    payment_date = Column(Date, nullable=True)
    payment_terms = Column(Text, default="")
    shipping_method = Column(String(64), default="")
    incoterm = Column(String(32), default="")
    port_loading = Column(String(255), default="")
    port_destination = Column(String(255), default="")
    delivery_time = Column(String(255), default="")
    packaging = Column(Text, default="")
    bank_details = Column(Text, default="")  # JSON snapshot
    show_bank = Column(Boolean, default=True)
    terms = Column(Text, default="")
    notes = Column(Text, default="")
    pdf_filename = Column(String(512), default="")
    created_by = Column(String(255), default="")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class InvoiceItem(Base):
    """One product line on an invoice."""
    __tablename__ = "invoice_items"
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, nullable=True)
    sku = Column(String(128), default="")
    name = Column(String(512), default="")
    title = Column(String(512), default="")
    description = Column(Text, default="")
    material = Column(String(128), default="")
    size = Column(String(128), default="")
    dimensions = Column(String(255), default="")
    weight = Column(String(128), default="")
    finish = Column(String(128), default="")
    images = Column(Text, default="")
    quantity = Column(Numeric(14, 3), default=0)
    unit = Column(String(64), default="pcs")
    unit_price = Column(Numeric(14, 2), default=0)
    discount_pct = Column(Numeric(6, 2), default=0)
    tax_pct = Column(Numeric(6, 2), default=0)
    line_total = Column(Numeric(14, 2), default=0)
    sort_order = Column(Integer, default=0)



# ================= AI WEBSITE MANAGER =================

class AiChatSession(Base):
    """A conversation between an admin and the AI website manager."""
    __tablename__ = "ai_chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="New conversation")
    user_email = Column(String(255), default="", index=True)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class AiChatMessage(Base):
    """One message in an AI manager conversation."""
    __tablename__ = "ai_chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(16), nullable=False)  # user | assistant
    content = Column(Text, default="")
    actions_json = Column(Text, default="[]")  # summary of tool actions
    attachments_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=_now)


class AiActionLog(Base):
    """Audit trail for every tool the AI attempts to run."""
    __tablename__ = "ai_action_logs"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=True, index=True)
    user_email = Column(String(255), default="", index=True)
    user_request = Column(Text, default="")
    tool = Column(String(64), default="", index=True)
    params_json = Column(Text, default="{}")
    result_json = Column(Text, default="{}")
    status = Column(String(24), default="completed", index=True)  # completed|pending|failed|reverted
    error = Column(Text, default="")
    created_at = Column(DateTime, default=_now)


class WebsiteChangeHistory(Base):
    """Before/after snapshots for preview, publish and rollback."""
    __tablename__ = "website_change_history"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=True, index=True)
    user_email = Column(String(255), default="", index=True)
    entity_type = Column(String(64), default="", index=True)  # product|site_content|banner|seo_page
    entity_id = Column(String(64), default="", index=True)
    label = Column(String(255), default="")
    previous_json = Column(Text, default="{}")
    proposed_json = Column(Text, default="{}")
    status = Column(String(24), default="pending", index=True)  # pending|published|reverted|failed
    created_at = Column(DateTime, default=_now)
    published_at = Column(DateTime, nullable=True)
