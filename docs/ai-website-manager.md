# AI Website Manager

Admin route: `/admin/ai-manager` (admin/editor only, via existing Google sign-in).

## What is implemented

- **Chat** backed by the configured LLM provider (`LLM_PROVIDER` / `LLM_API_BASE` / `LLM_MODEL` / `LLM_API_KEY`, server-side only).
- **DB-persisted** chat sessions, messages, action logs and change history (new tables, created by the existing schema bootstrap).
- **Whitelisted tool calling** — the LLM may only propose these tools; each is validated and executed server-side:
  - read-only: `get_website_overview`, `search_products`, `get_analytics`
  - mutations: `update_product`, `create_product`, `update_site_content`, `create_banner`, `update_seo_page`
- **Preview → Publish → Rollback** for every mutation. Before/after JSON is stored in `website_change_history` with status `pending | published | reverted`.
- **In-chat file uploads** using the existing media store (`/api/ai-manager/upload`), with rights metadata recorded. Returned URLs can be passed to `create_product` / `create_banner`.
- **Activity log**, **pending changes**, **website overview** and per-conversation history in the sidebar.
- **No fake responses** — if no LLM provider is configured, the assistant says so and performs no actions.

## Live content path

Content changes are applied to the same database the public site reads. `site_content` hero changes appear at `/` after publish (the homepage reads `/api/public/site-content`). Product and banner changes feed the existing product/collections/banner APIs. No git/deploy is needed for routine content edits once this code is deployed.

## Security

- Admin/editor role required on every endpoint.
- No unrestricted SQL/shell access; fixed tool whitelist.
- File type/size validation is inherited from `media_store` (JPG/JPEG/PNG/WebP/GIF/PDF; 8 MB, SVG not accepted).
- All tool attempts are audit-logged with params, result, status and user.

## Not yet included (intentional scope)

- Voice input, multilingual translation automation, blog-post authoring, FAQ and navigation editing through chat, image generation. These can be added as additional whitelisted tools without changing the architecture.
