# Cloudflare Setup Guide — New Look Impex

## Overview

Cloudflare sits in front of `https://www.newlookimpex.store/` and the backend API
at `https://api.newlookimpex.store/` (Render). It provides:

- DNS proxy (orange-cloud) — hides origin IP
- HTTPS enforcement (HSTS)
- DDoS protection (L3/L4/L7)
- WAF managed rules (SQL injection, XSS, bad bots)
- Bot protection (Cloudflare Bot Management / Super Bot Fight Mode)
- Rate limiting (edge-level IP throttling)
- Security event monitoring (Cloudflare dashboard + logs)

---

## Step 1: Add Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **"Add a site"**, enter `newlookimpex.store`
3. Select the **Free plan** (sufficient for DDoS + basic WAF)
4. Cloudflare scans existing DNS records — add any missing:
   - `A` / `AAAA` for `newlookimpex.store` → Vercel IP (or CNAME if Vercel provides)
   - `CNAME` for `www.newlookimpex.store` → `newlookimpex.store` or Vercel target
   - `CNAME` for `api.newlookimpex.store` → `new-look-impex-api.onrender.com`
5. Cloudflare provides two nameservers (e.g. `iana.ns.cloudflare.com`, `odin.ns.cloudflare.com`)
6. **At Hostinger**, replace the domain's nameservers with Cloudflare's values
7. Wait for propagation (usually < 1 hour)

---

## Step 2: DNS Proxy Configuration (Orange Cloud)

In Cloudflare DNS settings:

| Record | Type | Name | Value | Proxy Status |
|--------|------|------|-------|--------------|
| 1 | A / CNAME | `newlookimpex.store` | Vercel target / IP | **Proxy (orange cloud)** |
| 2 | CNAME | `www` | `newlookimpex.store` | **Proxy (orange cloud)** |
| 3 | CNAME | `api` | `new-look-impex-api.onrender.com` | **Proxy (orange cloud)** |
| 4 | TXT | `@` | SPF record for Gmail | DNS only (grey cloud) |
| 5 | TXT | `@` | DMARC record | DNS only (grey cloud) |

> **Orange cloud = Cloudflare proxied.** All HTTP(S) traffic passes through Cloudflare
> where DDoS, WAF, bot protection, and rate limiting are enforced.

---

## Step 3: HTTPS Enforcement

1. **SSL/TLS tab → Overview:** Set to **"Full (Strict)"** — Cloudflare→origin uses HTTPS.
   - Render and Vercel both provide valid certificates.
2. **SSL/TLS tab → Edge Certificates:**
   - Enable **"Always Use HTTPS"** (HTTP → HTTPS redirect)
   - Enable **"Automatic HTTPS Rewrites"**
   - Enable **"HSTS"** (set max-age to at least 6 months, include subdomains)
   - Enable **"No TLS 1.0/1.1"** (allow only 1.2+)
   - Enable **"Opportunistic Encryption"** (optional)

---

## Step 4: DDoS Protection

Cloudflare Free plan includes:

- **L3/L4 DDoS protection** — automatic, always on
- **HTTP DDoS protection** — automatic, always on

**Recommended Free-plan settings:**

1. **Security → DDoS → HTTP DDoS Protection:**
   - Managed rule: keep default sensitivity ("Medium")
   - Create a custom rule to challenge suspicious paths:
     - Field: `URI Path` → contains `/api/admin` → Action: `Challenge`
     - Field: `URI Path` → contains `/api/discounts` → Action: `Challenge`
     - Field: `URI Path` → contains `/api/public/enquiries` → Action: `Challenge` (rate-limit instead, see below)

2. **Create a Managed Rule override** (if on Pro+): tune sensitivity per path.
   - Free plan uses global Medium — sufficient for most attacks.

---

## Step 5: WAF Managed Rules

1. **Security → WAF → Create Rule:**
   - **"SQL Injection Protection"** — Action: `Block` (or `Challenge` to reduce false positives)
   - **"Cross-Site Scripting (XSS) Protection"** — Action: `Block` / `Challenge`
   - **"WordPress Protection"** — disable (not using WordPress)
   - **"Cloudflare Specials"** — enable common bad bot / scanner signatures

2. **Custom WAF rules (Free plan allows 5 custom rules):**

   | Rule Name | Field | Operator | Value | Action |
   |-----------|-------|----------|-------|--------|
   | Block path traversal | URI Path | contains | `../` | Block |
   | Block admin from non-Cloudflare | URI Path | starts with | `/api/admin` | Challenge |
   | Block admin from non-Cloudflare | URI Path | starts with | `/admin` | Challenge |
   | Limit POST to enquiry endpoints | URI Path | equals | `/api/public/enquiries` | Challenge (rate) |
   | Block common scanners | User Agent | contains | `sqlmap` | Block |
   | Block common scanners | User Agent | contains | `nikto` | Block |
   | Block common scanners | User Agent | contains | `masscan` | Block |

3. **IP Access Rules (optional):**
   - If admin is only accessed from known IPs, add an Allow rule for those IPs on `/api/admin/*` and `/admin/*`
   - Block known bad regions if there is no legitimate traffic (optional, Free plan has limited IP rules)

---

## Step 6: Bot Protection

1. **Security → Bots → Bot Fight Mode:** Enable **"On"**
   - Free plan: basic bot detection and challenge for automated clients
2. **Super Bot Fight Mode** (Pro+): enable for stricter detection
   - Not required for Free plan, but recommended if budget allows

**Action:** `Managed Challenge` — bots get a JS challenge; real users pass silently.

---

## Step 7: Rate Limiting (Edge)

1. **Security → WAF → Create Rule:**
   - **Field:** `CF-Account-ID` is not relevant — use:
   - **Field:** `Request URI Path` → `starts with` → `/api/public/enquiries`
   - **Action:** `Rate limit`
   - **Threshold:** 5 requests per 10 minutes per IP
   - **Action:** `Challenge`

2. **Another rate-limit rule:**
   - **Field:** `Request URI Path` → `starts with` → `/api/public/rfqs`
   - **Threshold:** 5 requests per 10 minutes per IP
   - **Action:** `Challenge`

3. **Another rate-limit rule:**
   - **Field:** `Request URI Path` → `starts with` → `/api/auth`
   - **Threshold:** 5 requests per 15 minutes per IP
   - **Action:** `Challenge`

> These Cloudflare edge limits work **in addition to** backend rate limits (Redis-backed).
> They stop attacks before they reach the origin server.

---

## Step 8: Security Event Monitoring

1. **Security → Events:** View all WAF, bot, and DDoS events
   - Filter by rule, action, country, IP
   - Export logs (Logpush requires paid plan; Free plan shows recent events in UI)
2. **Analytics → Security:** Overview of blocked threats
3. **Set up alerts (optional):**
   - Email notifications for high-severity events
   - Webhook to SIEM (paid plans)

---

## Step 9: Origin IP Protection

After Cloudflare is active:

1. **At Hostinger:** Ensure the origin server (Render / Vercel) only accepts traffic from Cloudflare IPs if possible.
   - Render does not natively support IP allowlisting on free tier — rely on Cloudflare WAF + strong backend auth.
   - If possible, configure Render firewall / ingress rules to accept only Cloudflare IP ranges (download from `https://www.cloudflare.com/ips/`).

2. **Do not expose the `onrender.com` URL publicly.** All traffic should go through `api.newlookimpex.store` (Cloudflare proxied).

---

## Step 10: Verification Checklist

- [ ] Nameservers at Hostinger point to Cloudflare
- [ ] DNS records are orange-cloud (proxied)
- [ ] SSL/TLS = Full (Strict)
- [ ] Always Use HTTPS = ON
- [ ] HSTS enabled (180+ days)
- [ ] WAF custom rules created (SQLi, XSS, path traversal, bad bots)
- [ ] Bot Fight Mode = ON
- [ ] Rate limit rules created for `/api/public/enquiries`, `/api/public/rfqs`, `/api/auth`
- [ ] Security Events page loads and shows traffic
- [ ] Site loads over HTTPS at `https://www.newlookimpex.store`
- [ ] API loads over HTTPS at `https://api.newlookimpex.store`
- [ ] Origin IP not leaked in DNS (no A/AAAA records pointing to origin without proxy)

---

## Recommended Cloudflare Page Rules / Transform Rules (Optional)

- **Cache static assets:** Cache CSS/JS/images for 1 month to reduce origin load
- **Bypass cache for `/api/*`:** API responses are dynamic, do not cache
- **Redirect non-www to www:** `newlookimpex.store/*` → `https://www.newlookimpex.store/$1` (301)

---

## Support

- Cloudflare docs: https://developers.cloudflare.com/
- Cloudflare IPs: https://www.cloudflare.com/ips/ (for origin allowlisting)
- Free plan limits: 5 custom WAF rules, 3 page rules, Bot Fight Mode included
