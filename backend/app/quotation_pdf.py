"""Premium B2B quotation PDF generator (copper/gold/navy export identity).

Renders a stored Quotation + its items into a branded, multi-page PDF with
product images, a price table (headers repeat across pages), commercial terms,
Terms & Conditions and a signature area. Uses verified quote data only.
"""
from __future__ import annotations

import io
import json
from datetime import date, datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, Image as RLImage,
                                KeepTogether, PageBreak, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle)
from PIL import Image as PILImage

from .media_store import file_path

NAVY = colors.HexColor("#24221F")
ESPRESSO = colors.HexColor("#211B17")
COPPER = colors.HexColor("#A66A45")
GOLD = colors.HexColor("#B08D57")
IVORY = colors.HexColor("#F8F5EE")
CHAMPAGNE = colors.HexColor("#EAE0D0")
GRAY = colors.HexColor("#6B7280")
EMERALD = colors.HexColor("#183D35")

CURRENCY_SYMBOL = {"USD": "$", "EUR": "€", "GBP": "£", "AED": "د.إ", "SAR": "﷼",
                   "INR": "₹", "AUD": "A$", "CAD": "C$"}


def money(value, currency: str) -> str:
    try:
        v = float(value or 0)
    except (TypeError, ValueError):
        v = 0.0
    sym = CURRENCY_SYMBOL.get((currency or "").upper(), "")
    return f"{sym}{v:,.2f}"


def _styles():
    return {
        "brand": ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=18,
                                textColor=NAVY, spaceAfter=6, leading=22),
        "brandsub": ParagraphStyle("brandsub", fontName="Helvetica", fontSize=7.5,
                                   textColor=COPPER, spaceAfter=4, leading=10),
        "qt": ParagraphStyle("qt", fontName="Helvetica-Bold", fontSize=26,
                             textColor=ESPRESSO, alignment=TA_RIGHT, leading=28),
        "h": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=10,
                            textColor=colors.white, spaceAfter=0),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.5,
                               textColor=NAVY, leading=12),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.5,
                                textColor=GRAY, leading=10),
        "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=7.5,
                               textColor=NAVY, leading=9.5),
        "cellb": ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=7.5,
                                textColor=NAVY, leading=9.5),
        "cellw": ParagraphStyle("cellw", fontName="Helvetica-Bold", fontSize=7.5,
                                textColor=colors.white, leading=9.5),
        "terms": ParagraphStyle("terms", fontName="Helvetica", fontSize=7.5,
                                textColor=ESPRESSO, leading=10.5),
        "total": ParagraphStyle("total", fontName="Helvetica-Bold", fontSize=9,
                                textColor=colors.white, alignment=TA_RIGHT),
    }


def _fit_image(url: str, w: float, h: float):
    """Resolve a stored media URL to a scaled ReportLab image, else None."""
    if not url:
        return None
    fn = url.rsplit("/", 1)[-1].split("?")[0]
    p = file_path(fn)
    try:
        if not p.exists():
            return None
        with PILImage.open(str(p)) as im:
            iw, ih = im.size
        scale = min(w / iw, h / ih, 1.0)
        return RLImage(str(p), width=iw * scale, height=ih * scale)
    except Exception:
        return None


def _brand_logo(size: float = 16 * mm):
    """Official NLI circular seal for the quotation header."""
    p = file_path("nli-logo.png")
    if not p.exists():
        return None
    try:
        return RLImage(str(p), width=size, height=size, mask="auto")
    except Exception:
        return None


def _header_footer(canvas, doc, number: str, company: str):
    canvas.saveState()
    page_w, page_h = A4
    # top band
    canvas.setFillColor(ESPRESSO)
    canvas.rect(0, page_h - 16 * mm, page_w, 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(18 * mm, page_h - 10 * mm, company or "New Look Impex")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(CHAMPAGNE)
    canvas.drawRightString(page_w - 18 * mm, page_h - 10 * mm,
                           "Brass & Copper Manufacturer & Exporter · Moradabad, India")
    # bottom band
    canvas.setFillColor(IVORY)
    canvas.rect(0, 0, page_w, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 5 * mm, f"{number}  ·  Page {doc.page}")
    canvas.drawRightString(page_w - 18 * mm, 5 * mm, "www.newlookimpex.store  ·  newlookimpex@gmail.com")
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 12 * mm, page_w - 18 * mm, 12 * mm)
    canvas.restoreState()


def build_quotation_pdf(q, items, settings) -> bytes:
    """q/items/settings are SQLAlchemy objects (or dict-like). Returns PDF bytes."""
    currency = q.currency or "USD"
    st = _styles()
    exporter = {}
    try:
        exporter = json.loads(q.exporter or "{}") or {}
    except Exception:
        pass
    company = exporter.get("company_name") or "New Look Impex"

    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                          topMargin=22 * mm, bottomMargin=18 * mm,
                          title=f"Quotation {q.number}", author=company)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(
        id="main", frames=[frame],
        onPage=lambda c, d: _header_footer(c, d, q.number, company))])

    story = []
    # Title block — official seal beside the company name
    logo = _brand_logo()
    company_block = [
        Paragraph(company, st["brand"]),
        Paragraph("BRASS & COPPER HANDICRAFTS · MORADABAD, INDIA", st["brandsub"]),
        Paragraph((exporter.get("address") or "").replace("\n", "<br/>"), st["small"]),
        Paragraph(f"GSTIN: {exporter.get('gstin') or '-'}&nbsp;&nbsp; IEC: {exporter.get('iec') or '-'}", st["small"]),
        Paragraph(f"{exporter.get('email') or 'newlookimpex@gmail.com'} · {exporter.get('phone') or '+91 9808588603'}", st["small"]),
    ]
    left = [[logo, company_block]] if logo else [company_block]
    right = [
        Paragraph("QUOTATION", st["qt"]),
        Spacer(1, 4),
        Paragraph(f"<b>{q.number}</b>", st["body"]),
        Paragraph(f"Issue: {q.quote_date or date.today()}", st["small"]),
        Paragraph(f"Valid until: {q.expiry_date or '-'}", st["small"]),
    ]
    inner = Table(left, colWidths=([20 * mm, doc.width * 0.62 - 20 * mm] if logo else [doc.width * 0.62]))
    inner.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 6),
    ]))
    t = Table([[inner, right]], colWidths=[doc.width * 0.62, doc.width * 0.38])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 1.2, COPPER),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [t, Spacer(1, 8)]

    # Buyer + commercial info — header band (white on dark) + light content row
    def panel(title, body_paras, band_color):
        content_cell = Table([[p] for p in body_paras], colWidths=[doc.width * 0.5 - 12])
        content_cell.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ]))
        inner = Table([[Paragraph(title, st["h"])], [content_cell]], colWidths=[doc.width * 0.5])
        inner.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), band_color),
            ("BACKGROUND", (0, 1), (0, 1), colors.white),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("BOX", (0, 0), (-1, -1), 0.5, CHAMPAGNE),
        ]))
        return inner

    buyer_panel = panel("BUYER", [
        Paragraph(q.buyer_company or "-", st["body"]),
        Paragraph(f"Attn: {q.buyer_contact or '-'}", st["small"]),
        Paragraph(f"{q.buyer_email or '-'} · {q.buyer_phone or '-'}", st["small"]),
        Paragraph(f"{q.buyer_country or '-'} · {q.buyer_type or '-'}", st["small"]),
        Paragraph(q.buyer_address.replace("\n", "<br/>") if q.buyer_address else "", st["small"]),
    ], ESPRESSO)
    terms_panel = panel("COMMERCIAL TERMS", [
        Paragraph(f"Currency: {currency}", st["body"]),
        Paragraph(f"Shipping: {q.shipping_method or '-'} · Incoterm: {q.incoterm or '-'}", st["small"]),
        Paragraph(f"Port of loading: {q.port_loading or '-'}", st["small"]),
        Paragraph(f"Destination port: {q.port_destination or '-'}", st["small"]),
        Paragraph(f"Production lead: {q.production_lead or '-'} · Delivery: {q.delivery_time or '-'}", st["small"]),
        Paragraph(f"Payment: {q.payment_terms or '-'} (Advance {q.advance_pct or 0}%)", st["small"]),
    ], COPPER)
    t2 = Table([[buyer_panel, terms_panel]], colWidths=[doc.width * 0.5, doc.width * 0.5])
    t2.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                            ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]))
    story += [t2, Spacer(1, 10)]

    # Products table — header repeats across pages via repeatRows
    header = [Paragraph(x, st["cellw"]) for x in
              ["SKU", "Product", "Image", "Qty", "Unit Price", "Total"]]
    rows = [header]
    for it in items:
        imgs = []
        try:
            imgs = json.loads(it.images or "[]") or []
        except Exception:
            pass
        img = _fit_image(imgs[0], 20 * mm, 16 * mm) if imgs else None
        desc = (f"<b>{it.name or '-'}</b>"
                + (f"<br/>{it.description}" if it.description else "")
                + (f"<br/>Material: {it.material}" if it.material else "")
                + (f" · {it.dimensions}" if it.dimensions else "")
                + (f"<br/>MOQ: {it.moq}" if it.moq else "")
                + (f" · Pack: {it.packaging}" if it.packaging else ""))
        rows.append([
            Paragraph(it.sku or "-", st["cell"]),
            Paragraph(desc, st["cell"]),
            img or "",
            Paragraph(f"{it.quantity} {it.unit or ''}", st["cell"]),
            Paragraph(money(it.unit_price, currency), st["cell"]),
            Paragraph(money(it.line_total, currency), st["cellb"]),
        ])
    col_w = [doc.width * 0.13, doc.width * 0.37, doc.width * 0.12,
             doc.width * 0.10, doc.width * 0.14, doc.width * 0.14]
    tbl = Table(rows, colWidths=col_w, repeatRows=1)
    tstyle = [
        ("BACKGROUND", (0, 0), (-1, 0), ESPRESSO),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, CHAMPAGNE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, IVORY]),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]
    tbl.setStyle(TableStyle(tstyle))
    story += [Paragraph("PRODUCTS", st["h"]), Spacer(1, 3), tbl, Spacer(1, 8)]

    # Totals
    tot_rows = [
        ["Subtotal", money(q.subtotal, currency)],
        ["Shipping", money(q.shipping_charges, currency)],
        ["Packing", money(q.packing_charges, currency)],
        ["Sample", money(q.sample_charges, currency)],
        ["Discount", "-" + money(q.discount, currency)],
        ["Tax", money(q.tax, currency)],
        [Paragraph("GRAND TOTAL", st["total"]), Paragraph(money(q.grand_total, currency), st["total"])],
    ]
    tt = Table([[Paragraph(a, st["cell"]), Paragraph(b, st["cell"])] for a, b in tot_rows[:-1]]
               + [[tot_rows[-1][0], tot_rows[-1][1]]],
               colWidths=[doc.width * 0.7, doc.width * 0.3])
    tt.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BACKGROUND", (0, -1), (-1, -1), NAVY),
        ("TEXTCOLOR", (0, -1), (-1, -1), colors.white),
        ("LINEABOVE", (0, -1), (-1, -1), 0.8, GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story += [KeepTogether([Paragraph("SUMMARY", st["h"]), Spacer(1, 3), tt]), Spacer(1, 10)]

    # Terms & Conditions
    terms_lines = [l.strip() for l in (q.terms or "").splitlines() if l.strip()]
    if terms_lines:
        body = "<br/>".join(f"{i+1}. {l}" for i, l in enumerate(terms_lines))
        tc = Table([[Paragraph("<b>TERMS & CONDITIONS</b>", st["terms"])],
                    [Paragraph(body, st["terms"])]], colWidths=[doc.width])
        tc.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, 0), CHAMPAGNE),
            ("BOX", (0, 0), (-1, -1), 0.5, GOLD),
            ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story += [KeepTogether([tc]), Spacer(1, 10)]

    # Buyer questions & your manual answers (detailed enquiries)
    try:
        qa = json.loads(q.buyer_qa or "[]") or []
    except (TypeError, ValueError):
        qa = []
    if isinstance(qa, list) and qa:
        qa_rows = []
        for idx, pair in enumerate(qa):
            if isinstance(pair, dict):
                question = str(pair.get("q") or "").strip()
                answer = str(pair.get("a") or "").strip()
            else:
                question, answer = str(pair).strip(), ""
            if not question and not answer:
                continue
            qa_rows.append([
                Paragraph(f"<b>{idx+1}.</b> {escape(question)}", st["cell"]),
                Paragraph(escape(answer).replace("\n", "<br/>") if answer else "-", st["cell"]),
            ])
        if qa_rows:
            qt = Table(qa_rows, colWidths=[doc.width * 0.46, doc.width * 0.54])
            qt.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (0, -1), CHAMPAGNE),
                ("GRID", (0, 0), (-1, -1), 0.4, CHAMPAGNE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story += [Paragraph("YOUR QUESTIONS & OUR RESPONSES", st["h"]), Spacer(1, 3), qt, Spacer(1, 14)]

    # Signature area
    sig = Table([
        [Paragraph("For New Look Impex", st["body"]), Paragraph("Accepted by Buyer", st["body"])],
        ["\n\n_______________________\nAuthorized Signature",
         "\n\n_______________________\nName & Date"],
    ], colWidths=[doc.width * 0.5, doc.width * 0.5], rowHeights=[None, 45])
    sig.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story += [KeepTogether(sig)]

    doc.build(story)
    return buf.getvalue()
