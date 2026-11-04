"""Automated seasonal sale campaigns — zero manual work.

One campaign is active at a time based on today's (UTC) date. All date
ranges recur every year, so the calendar keeps rolling forever:

    Jan 01-15  🎆 NEWYEAR25        New Year Sale            25%
    Feb 07-14  💝 LOVE15           Valentine's Day Sale     15%
    Mar 10-31  🌸 SPRING20         Spring Festival Sale     20%
    Apr 10-20  🐣 EASTER15         Easter Sale              15%
    May 01-10  💐 MOTHER20         Mother's Day Sale        20%
    Jun 12-21  👔 FATHER20         Father's Day Sale        20%
    Jul 01-31  ☀️ SUMMER25         Summer Sale              25%
    Aug 10-17  🇮🇳 FREEDOM15        Independence Day Sale    15%
    Sep 01-30  🪔 FESTIVE20        Festive Season Preview   20%
    Oct 01-14  🍂 AUTPREP15        Autumn Preview Sale      15%
    Oct 15-31  🎃 HALLOWEEN30      Halloween Sale           30%
    Nov 01-19  🍁 AUTUMN25         Autumn Sale              25%
    Nov 20-30  🛍️ BLACKFRIDAY30    Black Friday Sale        30%
    Dec 01-26  🎄 XMAS25           Christmas Sale           25%
    Dec 27-31  ⏳ NYEAR20          New Year Countdown       20%
    (gaps)     🤝 WELCOME10        Welcome Offer            10% (evergreen)

GET /api/public/active-campaign returns the live campaign and auto-syncs
its discount code (plus the next one) into the `discount_codes` table so
checkout validation always works — no DB seeding, no deploys.
"""
from datetime import date, datetime
from typing import Optional

from .models import DiscountCode

CALENDAR = [
    {"code": "NEWYEAR25", "name": "New Year Sale", "short": "New Year", "emoji": "🎆",
     "percent": 25, "range": (1, 1, 1, 15),
     "tagline": "Start the year in style — fresh stock, fresh prices",
     "blurb": "Kick off the new year with a flat discount across Copper & Brass collections. New-year production slots are open for bulk orders.",
     "cta": "Shop the New Year Sale"},
    {"code": "LOVE15", "name": "Valentine's Day Sale", "short": "Valentine's", "emoji": "💝",
     "percent": 15, "range": (2, 7, 2, 14),
     "tagline": "Gifts forged in metal — for the ones you love",
     "blurb": "A flat discount on gifting favourites — copper drinkware sets and engraved brass décor, gift-wrapped and ready for February 14th.",
     "cta": "Shop Valentine's Gifts"},
    {"code": "SPRING20", "name": "Spring Festival Sale", "short": "Spring", "emoji": "🌸",
     "percent": 20, "range": (3, 10, 3, 31),
     "tagline": "Spring refresh for retail shelves worldwide",
     "blurb": "Storewide spring savings — refresh your shelves with hand-hammered copper and blooming brass florals.",
     "cta": "Shop the Spring Sale"},
    {"code": "EASTER15", "name": "Easter Sale", "short": "Easter", "emoji": "🐣",
     "percent": 15, "range": (4, 10, 4, 20),
     "tagline": "Table-worthy brass & copper for the Easter season",
     "blurb": "Easter savings on serving and table décor picks — trays, bowls and centrepieces finished for spring tables.",
     "cta": "Shop the Easter Sale"},
    {"code": "MOTHER20", "name": "Mother's Day Sale", "short": "Mother's Day", "emoji": "💐",
     "percent": 20, "range": (5, 1, 5, 10),
     "tagline": "Happy Mother's Day — gifts as timeless as her",
     "blurb": "Mother's Day savings on gift-ready copper drinkware and keepsake brass décor. Custom gift packaging available.",
     "cta": "Shop Mother's Day Gifts"},
    {"code": "FATHER20", "name": "Father's Day Sale", "short": "Father's Day", "emoji": "👔",
     "percent": 20, "range": (6, 12, 6, 21),
     "tagline": "Happy Father's Day — for the man who has everything",
     "blurb": "Father's Day savings — copper mugs, bar sets and brass accents he will actually keep.",
     "cta": "Shop Father's Day Gifts"},
    {"code": "SUMMER25", "name": "Summer Sale", "short": "Summer", "emoji": "☀️",
     "percent": 25, "range": (7, 1, 7, 31),
     "tagline": "High summer, hot prices — storewide savings",
     "blurb": "Summer-long savings — copper pitchers and barware shine in July. Stock up before the festive buying season.",
     "cta": "Shop the Summer Sale"},
    {"code": "FREEDOM15", "name": "Independence Day Sale", "short": "Independence Day", "emoji": "🇮🇳",
     "percent": 15, "range": (8, 10, 8, 17),
     "tagline": "Crafted in India — proud of it",
     "blurb": "Celebrating India's Independence Day with savings on the heritage craft of Moradabad's metalworkers.",
     "cta": "Shop the Independence Day Sale"},
    {"code": "FESTIVE20", "name": "Festive Season Preview", "short": "Festive", "emoji": "🪔",
     "percent": 20, "range": (9, 1, 9, 30),
     "tagline": "Diwali & festive buying starts here — order early",
     "blurb": "The festive preview — brass urlis, diyas and lanterns ahead of the Diwali rush. Book production slots early.",
     "cta": "Shop the Festive Preview"},
    {"code": "AUTPREP15", "name": "Autumn Preview Sale", "short": "Autumn Preview", "emoji": "🍂",
     "percent": 15, "range": (10, 1, 10, 14),
     "tagline": "Autumn is coming — new stock just landed",
     "blurb": "Early-autumn savings — first pick of new copper cookware and brass décor before Halloween week.",
     "cta": "Shop the Autumn Preview"},
    {"code": "HALLOWEEN30", "name": "Halloween Sale", "short": "Halloween", "emoji": "🎃",
     "percent": 30, "range": (10, 15, 10, 31),
     "tagline": "Trick or treat — treat yourself",
     "blurb": "The biggest spooky-season discount on all Copper & Brass collections — this week only. While stock lasts.",
     "cta": "Shop the Halloween Sale"},
    {"code": "AUTUMN25", "name": "Autumn Sale", "short": "Autumn", "emoji": "🍁",
     "percent": 25, "range": (11, 1, 11, 19),
     "tagline": "Autumn styling, autumn savings",
     "blurb": "Storewide autumn savings — hand-hammered copper and engraved brass, fresh from Moradabad workshops.",
     "cta": "Shop the Autumn Sale"},
    {"code": "BLACKFRIDAY30", "name": "Black Friday Sale", "short": "Black Friday", "emoji": "🛍️",
     "percent": 30, "range": (11, 20, 11, 30),
     "tagline": "The biggest sale of the year — Black Friday & Cyber Monday",
     "blurb": "Our biggest discount of the year, live through Black Friday and Cyber Monday. While stock lasts.",
     "cta": "Shop Black Friday"},
    {"code": "XMAS25", "name": "Christmas Sale", "short": "Christmas", "emoji": "🎄",
     "percent": 25, "range": (12, 1, 12, 26),
     "tagline": "Merry Christmas — handmade gifts from Moradabad",
     "blurb": "Christmas savings on heirloom-quality brass and copper gifts, beautifully wrapped. Order before shipping cut-offs.",
     "cta": "Shop the Christmas Sale"},
    {"code": "NYEAR20", "name": "New Year Countdown", "short": "New Year", "emoji": "⏳",
     "percent": 20, "range": (12, 27, 12, 31),
     "tagline": "Countdown to the new year — last chance prices",
     "blurb": "Final sale days of the year — prices reset when the calendar turns. Lock in new-year stock now.",
     "cta": "Shop the Countdown Sale"},
]

EVERGREEN = {
    "code": "WELCOME10", "name": "Welcome Offer", "short": "Welcome", "emoji": "🤝",
    "percent": 10,
    "tagline": "New buyers welcome — 10% off your first order",
    "blurb": "A standing welcome to New Look Impex — Moradabad's premier copper & brass manufacturer. New buyers save on their first order.",
    "cta": "Shop the Welcome Offer",
}

_LAST_SYNC = {"key": None}


def _pick(d: date) -> dict:
    """Return the campaign whose (recurring) range contains `d`, else evergreen."""
    for c in CALENDAR:
        sm, sd, em, ed = c["range"]
        try:
            start = date(d.year, sm, sd)
            end = date(d.year, em, ed)
        except ValueError:  # bad calendar row — never break the site
            continue
        if start <= d <= end:
            return {**c, "_start": start, "_end": end}
    return {**EVERGREEN, "_start": date(d.year, 1, 1), "_end": date(d.year, 12, 31)}


def _next_after(d: date) -> Optional[dict]:
    starts = []
    for c in CALENDAR:
        sm, sd = c["range"][0], c["range"][1]
        for y in (d.year, d.year + 1):
            try:
                s = date(y, sm, sd)
                if s > d:
                    starts.append((s, c))
            except ValueError:
                continue
    if not starts:
        return None
    starts.sort(key=lambda t: t[0])
    s, c = starts[0]
    return {**c, "_start": s, "_end": date(s.year, c["range"][2], c["range"][3])}


def _summary(c: dict) -> dict:
    evergreen = c["code"] == EVERGREEN["code"]
    ends_label = "always on" if evergreen else c["_end"].strftime("%d %B").lstrip("0")
    return {
        "code": c["code"],
        "name": c["name"],
        "short": c["short"],
        "emoji": c["emoji"],
        "percent": int(c["percent"]),
        "tagline": c["tagline"],
        "blurb": c["blurb"],
        "cta": c["cta"],
        "starts_at": datetime(c["_start"].year, c["_start"].month, c["_start"].day, 0, 0, 0).isoformat(),
        "ends_at": datetime(c["_end"].year, c["_end"].month, c["_end"].day, 23, 59, 59).isoformat(),
        "ends_label": ends_label,
    }


def active_campaign(now: Optional[datetime] = None) -> dict:
    d = (now or datetime.utcnow()).date()
    out = _summary(_pick(d))
    nxt = _next_after(d)
    if nxt:
        ns = _summary(nxt)
        out["next"] = {"code": ns["code"], "name": ns["name"], "percent": ns["percent"],
                       "starts_at": ns["starts_at"], "ends_at": ns["ends_at"],
                       "description": f"{ns['name']} — flat {ns['percent']}% OFF"}
    return out


def ensure_discount_codes(db, camps: list) -> None:
    """Upsert campaign codes into discount_codes so checkout validation works.
    Self-healing: re-activates/re-dates codes if an admin deletes or edits them.
    Never raises — a DB hiccup must not break the storefront."""
    try:
        for c in camps:
            code = (c.get("code") or "").strip().upper()
            if not code:
                continue
            row = db.query(DiscountCode).filter(DiscountCode.code == code).first()
            if row is None:
                row = DiscountCode(code=code)
                db.add(row)
            row.description = c.get("description") or f"{c.get('name', code)} — flat {c.get('percent', 0)}% OFF"
            row.discount_type = "percent"
            row.discount_value = float(c.get("percent") or 0)
            row.is_active = True
            row.starts_at = datetime.fromisoformat(c["starts_at"]) if c.get("starts_at") else None
            row.expires_at = datetime.fromisoformat(c["ends_at"]) if c.get("ends_at") else None
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


def sync_if_changed(db, camp: dict) -> None:
    """Throttle DB writes: sync only when the active campaign window changes."""
    key = f"{camp['code']}:{camp['ends_at']}"
    if _LAST_SYNC["key"] == key:
        return
    _LAST_SYNC["key"] = key
    camps = [camp]
    if camp.get("next"):
        camps.append(camp["next"])
    ensure_discount_codes(db, camps)
