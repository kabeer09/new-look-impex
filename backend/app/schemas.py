"""Pydantic schemas."""
from datetime import datetime, date
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator


# Fields where an explicit null is meaningful and must be preserved.
_KEEP_NONE = {"price", "category_id", "product_id", "impressions", "clicks",
              "ctr", "position", "follow_up_at"}
# Fields where null means "empty list".
_NULL_LISTS = {"tags", "variant_data", "spec_data", "collection_ids",
               "image_urls", "keywords", "related_keywords", "fields"}
# Fields where null means False.
_NULL_BOOLS = {"consent", "price_on_request", "featured", "is_active",
               "requires_approval", "is_primary"}


class _NullCoercing(BaseModel):
    """Base for all input schemas: explicit JSON nulls are coerced to the
    field's empty value instead of raising 422. Browsers and AI importers
    routinely send null for cleared/unknown optional fields; rejecting them
    breaks product saves (e.g. moq=null). Genuinely required fields still
    fail validation when empty (min_length etc. run after coercion)."""

    @model_validator(mode="before")
    @classmethod
    def _coerce_nulls(cls, data):
        if isinstance(data, dict):
            for k, v in list(data.items()):
                if v is None and k not in _KEEP_NONE:
                    if k in _NULL_LISTS:
                        data[k] = []
                    elif k in _NULL_BOOLS:
                        data[k] = False
                    else:
                        data[k] = ""
        return data


class LoginIn(_NullCoercing):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class KeywordIn(_NullCoercing):
    keyword: str = Field(min_length=2, max_length=512)
    country: str = ""
    language: str = "en"
    product_category: str = ""
    intent: Optional[str] = None
    source: str = "manual"
    target_url: str = ""
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    ctr: Optional[float] = None
    position: Optional[float] = None


class KeywordOut(KeywordIn):
    id: int
    opportunity_score: float
    opportunity_factors: Any = {}
    business_relevance: float = 0.0
    commercial_intent: float = 0.0
    cluster: str = ""
    status: str = "tracked"
    priority: str = "medium"
    related_keywords: Any = []


class AuditRunIn(_NullCoercing):
    url: str


class SearchToPageIn(_NullCoercing):
    keyword: str = Field(min_length=2)
    country: str = ""


class ContentGenIn(_NullCoercing):
    kind: str = "product_description"
    keyword: str = ""
    product: str = ""
    country: str = ""
    target_url: str = ""


class EnquiryPublicIn(_NullCoercing):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    company: str = ""
    phone: str = ""  # WhatsApp / phone
    country: str = ""
    product_id: Optional[int] = None
    product_interest: str = ""
    quantity: str = ""
    message: str = Field(min_length=5)
    consent: bool = False
    landing_page: str = ""
    referrer: str = ""
    campaign: str = ""
    # Honeypot field - hidden via CSS, should remain empty for humans
    website_url: str = ""


class EnquiryStatusIn(_NullCoercing):
    status: str
    notes: str = ""
    follow_up_at: Optional[datetime] = None


# ================= COMMERCE SCHEMAS =================

class CategoryIn(_NullCoercing):
    name: str = Field(min_length=1, max_length=255)
    slug: str = ""
    description: str = ""
    image_url: str = ""
    parent_id: Optional[int] = None
    seo_title: str = ""
    seo_description: str = ""
    featured: bool = False
    sort_order: int = 0
    status: str = "published"


class CollectionIn(_NullCoercing):
    name: str = Field(min_length=1, max_length=255)
    slug: str = ""
    description: str = ""
    image_url: str = ""
    seo_title: str = ""
    seo_description: str = ""
    featured: bool = False
    sort_order: int = 0
    status: str = "published"


class VariantIn(_NullCoercing):
    name: str = Field(min_length=1, max_length=255)
    sku: str = ""
    price: Optional[float] = None
    moq: str = ""
    sort_order: int = 0


class SpecIn(_NullCoercing):
    key: str = Field(min_length=1, max_length=255)
    value: str = ""


class ProductIn(_NullCoercing):
    name: str = Field(min_length=1, max_length=512)
    slug: str = ""
    external_product_id: str = ""  # source-catalogue id (preserved for re-sync)
    short_description: str = ""
    description: str = ""
    category_id: Optional[int] = None
    material: str = ""
    capacity: str = ""
    finish: str = ""
    color: str = ""
    dimensions: str = ""
    weight: str = ""
    sku: str = ""
    tags: list[str] = []
    moq: str = ""
    lead_time: str = ""
    packaging_info: str = ""
    price: Optional[float] = None
    currency: str = "USD"
    price_on_request: bool = True
    # "" = not specified (derive from price_on_request) | public | on_request | hidden
    price_visibility: str = ""
    stock_status: str = ""  # "" | in_stock | out_of_stock | made_to_order
    featured: bool = False
    sort_order: int = 0
    status: str = "draft"
    seo_title: str = ""
    seo_description: str = ""
    variant_data: list[VariantIn] = []
    spec_data: list[SpecIn] = []
    collection_ids: list[int] = []
    image_urls: list[str] = []


class RFQItemIn(_NullCoercing):
    product_id: Optional[int] = None
    product_name: str = Field(min_length=1, max_length=512)
    quantity: str = Field(min_length=1, max_length=128)
    unit: str = ""
    notes: str = ""


class RFQIn(_NullCoercing):
    full_name: str = Field(min_length=2, max_length=255)
    business_email: EmailStr
    company_name: str = ""
    country: str = ""
    phone: str = ""
    target_price: str = ""
    delivery_timeframe: str = ""
    additional_requirements: str = ""
    consent: bool = False
    items: list[RFQItemIn] = Field(min_length=1)


class RFQStatusIn(_NullCoercing):
    status: str
    notes: str = ""


class BuyerIn(_NullCoercing):
    company_name: str = Field(min_length=1, max_length=512)
    website: str = ""
    country: str = ""
    buyer_category: str = ""
    product_relevance: str = ""
    contact_name: str = ""
    contact_email: str = ""
    phone: str = ""
    source_url: str = ""
    source_type: str = "manual"
    notes: str = ""


class BuyerOutreachIn(_NullCoercing):
    channel: str = "email"


class EventIn(_NullCoercing):
    event_type: str = Field(min_length=1, max_length=64)
    url: str = ""
    product_id: Optional[int] = None
    country: str = ""
    referrer: str = ""
    campaign: str = ""


class SeoPageIn(_NullCoercing):
    path: str = Field(min_length=1, max_length=512)
    title: str = ""
    meta_description: str = ""
    canonical_url: str = ""
    og_image_url: str = ""
    published: bool = True
