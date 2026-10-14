// Types matching docs/api-contract.md (v1.1) — Frontend mirror. Do not invent fields.

export interface Paged<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface ProductImage {
  id?: number;
  url: string;
  alt_text: string | null;
  /** Image rights provenance (contract §6). */
  source?: string | null;
  /** Free-text permission note, e.g. supplier name / licence ref. */
  permission?: string | null;
  /** AI-generated concept imagery — never present as a product photograph. */
  is_concept?: boolean | null;
  is_primary?: boolean | null;
}

export interface ProductCard {
  id: number;
  name: string;
  slug: string;
  short_description: string | null;
  category: CategoryRef | null;
  material: string | null;
  finish: string | null;
  color: string | null;
  price: number | null;
  currency: string | null;
  price_on_request: boolean;
  moq: string | null;
  lead_time: string | null;
  featured: boolean;
  image: ProductImage | null;
  tags: string[];
  /** Present in admin list/detail responses; absent from the public card shape. */
  status?: string;
  /** Present in admin list/detail responses; absent from the public card shape. */
  sku?: string | null;
}

export interface ProductVariant {
  name: string;
  sku?: string | null;
  price?: number | null;
  moq?: string | null;
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface CollectionRef {
  id: number;
  name: string;
  slug: string;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  dimensions: string | null;
  weight: string | null;
  sku: string | null;
  variants: ProductVariant[];
  specifications: ProductSpec[];
  images: ProductImage[];
  collections: CollectionRef[];
  seo_title: string | null;
  seo_description: string | null;
  packaging_info?: string | null;
  related: ProductCard[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  product_count: number;
  parent_id?: number | null;
  featured?: boolean | null;
  sort_order?: number | null;
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  product_count: number;
  featured?: boolean | null;
  sort_order?: number | null;
}

export interface Announcement {
  text: string;
  enabled: boolean;
}

export interface PublicSettings {
  business_name: string;
  location: string;
  email: string;
  phones: string[];
  announcement: Announcement | null;
  whatsapp_number: string;
  countries: string[];
  categories_nav: string[];
}

export interface ProductQuery {
  q?: string;
  category?: string;
  material?: string;
  finish?: string;
  style?: string;
  has_moq?: boolean;
  min_price?: number | string;
  max_price?: number | string;
  sort?: "newest" | "name" | "featured";
  page?: number;
  page_size?: number;
}

export interface RfqItemInput {
  product_id: number;
  product_name: string;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
}

export interface RfqInput {
  full_name: string;
  business_email: string;
  company_name: string;
  country: string;
  phone?: string;
  target_price?: string;
  delivery_timeframe?: string;
  additional_requirements?: string;
  consent: boolean;
  items: RfqItemInput[];
}

export interface RfqSubmitResult {
  reference_number: string;
  message: string;
  email_sent?: boolean;
  email_error?: string;
}

export interface RfqItem {
  id?: number;
  product_id?: number | null;
  product_name: string;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
}

export interface Rfq {
  id: number;
  reference_number: string;
  full_name: string;
  business_email: string;
  company_name: string;
  country: string;
  phone: string | null;
  target_price: string | null;
  delivery_timeframe: string | null;
  additional_requirements: string | null;
  consent: boolean;
  status: string;
  item_count: number;
  total_quantity: number;
  created_at: string;
  items?: RfqItem[];
}

export interface Qualification {
  score: number;
  factors: unknown;
  explanation: string;
}

export interface OutreachRecord {
  id: number;
  draft_id?: number | null;
  subject: string | null;
  body: string | null;
  source?: string | null;
  approved?: boolean | null;
  status?: string | null;
  provider_result?: unknown;
  created_at?: string;
}

export interface Buyer {
  id: number;
  company_name: string;
  website: string | null;
  country: string | null;
  buyer_category: string | null;
  product_relevance: string | null;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  source_url: string | null;
  source_type: string | null;
  date_collected: string | null;
  verification_status: "unverified" | "verified" | "pending" | string;
  notes: string | null;
  lead_score: number | null;
  qualification?: Qualification | null;
  outreach_status: string;
  created_at: string;
}

export interface BuyerInput {
  company_name: string;
  website?: string;
  country?: string;
  buyer_category?: string;
  product_relevance?: string;
  contact_name?: string;
  contact_email?: string;
  phone?: string;
  source_url?: string;
  source_type?: string;
  notes?: string;
}

export interface MediaFile {
  id: number;
  filename: string;
  url: string;
  size: number;
  content_type: string;
  uploaded_at: string;
  /** Image rights provenance (contract §6). */
  rights_source?: string | null;
  /** Free-text permission note, e.g. supplier name / licence ref. */
  permission?: string | null;
  alt_text?: string | null;
}

export interface EnquiryInput {
  name: string;
  email: string;
  country?: string;
  product_interest?: string;
  message?: string;
}

export type EventType =
  | "product_view"
  | "rfq_add"
  | "rfq_submit"
  | "catalogue_download"
  | "contact_click"
  | "whatsapp_click";

export interface EventInput {
  event_type: EventType;
  url?: string;
  product_id?: number;
  country?: string;
  referrer?: string;
  campaign?: string;
}

export interface CatalogueMeta {
  product_count: number;
  generated_at: string;
  includes: string[];
}

export interface EventsSummary {
  product_views: number | null;
  rfq_adds: number | null;
  rfq_submits: number | null;
  catalogue_downloads: number | null;
  contact_clicks: number | null;
  whatsapp_clicks: number | null;
  by_day?: unknown[];
}

export interface DashboardSummary {
  data_source?: string;
  data_note?: string;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  avg_position?: number | null;
  keywords_tracked?: number | null;
  recommendations_pending?: number | null;
  pages?: number | null;
  published_changes?: number | null;
  enquiries_total?: number | null;
  enquiries_qualified?: number | null;
  clicks_by_day?: { date: string; clicks: number; impressions: number }[];
  top_pages?: { url: string; clicks: number }[];
  enquiries_by_country?: { country: string; count: number }[];
  // Extended (v1.1)
  products_published?: number | null;
  products_draft?: number | null;
  products_total?: number | null;
  rfqs_total?: number | null;
  rfqs_new?: number | null;
  buyers_total?: number | null;
  buyers_qualified?: number | null;
  catalogue_downloads?: number | null;
  events_summary?: EventsSummary | null;
  most_requested_products?: { product_name: string; count: number }[];
}

export interface ProductInput {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  category_id?: number | null;
  material?: string;
  finish?: string;
  color?: string;
  dimensions?: string;
  weight?: string;
  sku?: string;
  tags?: string[];
  moq?: string | null;
  lead_time?: string;
  packaging_info?: string;
  price?: number | null;
  currency?: string;
  price_on_request?: boolean;
  featured?: boolean;
  status?: "draft" | "published" | "archived";
  seo_title?: string;
  seo_description?: string;
  variant_data?: ProductVariant[];
  spec_data?: ProductSpec[];
  collection_ids?: number[];
  image_urls?: string[];
}

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  parent_id?: number | null;
  seo_title?: string;
  seo_description?: string;
  featured?: boolean;
  sort_order?: number;
}

export interface CollectionInput {
  name: string;
  slug?: string;
  description?: string;
  image_url?: string;
  seo_title?: string;
  seo_description?: string;
  featured?: boolean;
  sort_order?: number;
}

export interface ImportResult {
  created?: number;
  updated?: number;
  skipped_duplicates?: number;
  errors?: unknown[];
}

// --- AI Product Import + AI SEO (contract §6) ---

export type ImageRightsSource = "own" | "supplier_authorised" | "licensed" | "ai_generated";

export interface Banner {
  id: number;
  placement: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_text: string | null;
  cta_link: string | null;
  sort_order: number | null;
  is_active: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  role: "admin" | "editor" | "viewer";
  is_active: boolean;
  auth_provider: string;
  display_name: string;
  created_at: string | null;
}

export const RIGHTS_SOURCES: { value: ImageRightsSource; label: string }[] = [
  { value: "own", label: "Own photography" },
  { value: "supplier_authorised", label: "Supplier-authorised" },
  { value: "licensed", label: "Licensed image" },
  { value: "ai_generated", label: "AI-generated (concept only)" },
];

export interface AISuggestion {
  name: string | null;
  category_id?: number | null;
  description: string | null;
  material?: string | null;
  finish?: string | null;
  color?: string | null;
  dimensions?: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  slug: string | null;
  alt_text: string | null;
  keywords: string[];
  media_filenames: string[];
  /** Field names that are null/uncertain and need human verification. */
  needs_verification: string[];
}

export interface AIPreviewResponse {
  import_id: string;
  source: string;
  items: AISuggestion[];
  warnings: string[];
  capped?: boolean;
}

export interface ProductImport {
  id: number | string;
  kind: string;
  filename: string | null;
  source_url: string | null;
  rights_source: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface SeoSuggestionSet {
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
  primary_keyword?: string | null;
  related_keywords?: string[] | null;
  description?: string | null;
  alt_text?: string | null;
  internal_links?: string[] | null;
}

export interface SeoGenerateResponse {
  suggestions: SeoSuggestionSet;
  warnings: { missing: string[]; duplicates: string[] };
  source: string;
}
