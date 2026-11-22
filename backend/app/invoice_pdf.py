"""Premium B2B invoice PDF (proforma/commercial/sales), sharing the quotation
PDF's visual system. Real data only — no invented figures. Multi-page with
repeating table headers; logo, bank details, totals and signature included.
"""
from __future__ import annotations

import io
import json
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, Image as RLImage,
                                KeepTogether, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle)

from .media_store import file_path
from .quotation_pdf import (_brand_logo, _fit_image, _header_footer, money,
                            NAVY, ESPRESSO, COPPER, GOLD, IVORY, CHAMPAGNE, GRAY)

TITLE = {"proforma": "PROFORMA INVOICE", "commercial": "COMMERCIAL INVOICE",
         "sales": "SALES INVOICE", "custom": "INVOICE"}


def _styles():
    return {
        "brand": ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=18, textColor=NAVY, spaceAfter=6, leading=22),
        "brandsub": ParagraphStyle("brandsub", fontName="Helvetica", fontSize=7.5, textColor=COPPER, spaceAfter=4, leading=10),
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=20, textColor=ESPRESSO, alignment=TA_RIGHT, leading=24),
        "h": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=10, textColor=colors.white),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=8.5, textColor=NAVY, leading=12),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=7.5, textColor=GRAY, leading=10),
        "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=7.5, textColor=NAVY, leading=9.5),
        "cellb": ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=7.5, textColor=NAVY, leading=9.5),
        "cellw": ParagraphStyle("cellw", fontName="Helvetica-Bold", fontSize=7.5, textColor=colors.white, leading=9.5),
        "terms": ParagraphStyle("terms", fontName="Helvetica", fontSize=7.5, textColor=ESPRESSO, leading=10.5),
        "total": ParagraphStyle("total", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, alignment=TA_RIGHT),
    }


def _panel(title, paras, band, width):
    cell = Table([[p] for p in paras], colWidths=[width - 12])
    cell.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"),
                              ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                              ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    inner = Table([[Paragraph(title, ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=10, textColor=colors.white))], [cell]], colWidths=[width])
    inner.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), band),
                               ("BACKGROUND", (0, 1), (0, 1), colors.white),
                               ("VALIGN", (0, 0), (-1, -1), "TOP"),
                               ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                               ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                               ("BOX", (0, 0), (-1, -1), 0.5, CHAMPAGNE)]))
    return inner


def build_invoice_pdf(inv, items, company) -> bytes:
    st = _styles()
    cur = inv.currency or "USD"
    exporter = json.loads(inv.exporter or "{}") or {}
    buyer = json.loads(inv.buyer or "{}") or {}
    bank = json.loads(inv.bank_details or "{}") or {}
    company_name = company.get("name") or exporter.get("company_name") or "New Look Impex"
    title = TITLE.get(inv.doc_type or "custom", "INVOICE")

    buf = io.BytesIO()
    doc = BaseDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                          topMargin=22 * mm, bottomMargin=18 * mm,
                          title=f"{title} {inv.number}", author=company_name)
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame],
        onPage=lambda c, d: _header_footer(c, d, inv.number, company_name))])

    story = []
    logo = _logo(company)
    cblock = [Paragraph(company_name, st["brand"]),
              Paragraph("BRASS & COPPER HANDICRAFTS · MORADABAD, INDIA", st["brandsub"]),
              Paragraph((exporter.get("address") or company.get("address") or "").replace("\n", "<br/>"), st["small"]),
              Paragraph(f"GSTIN: {exporter.get('gstin') or company.get('gstin') or '-'}&nbsp;&nbsp; IEC: {exporter.get('iec') or company.get('iec') or '-'}", st["small"]),
              Paragraph(f"{exporter.get('email') or company.get('email') or ''} · {exporter.get('phone') or company.get('phone') or ''}", st["small"])]
    left = [[logo, cblock]] if logo else [cblock]
    inner = Table(left, colWidths=([20 * mm, doc.width * 0.62 - 20 * mm] if logo else [doc.width * 0.62]))
    inner.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (0, 0), 6)]))
    right = [Paragraph(title, st["title"]), Spacer(1, 4), Paragraph(f"<b>{inv.number}</b>", st["body"]),
             Paragraph(f"Date: {inv.invoice_date or date.today()}", st["small"]),
             Paragraph(f"Due: {inv.due_date or '-'}", st["small"])]
    t = Table([[inner, right]], colWidths=[doc.width * 0.62, doc.width * 0.38])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 1.2, COPPER),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story += [t, Spacer(1, 8)]

    half = doc.width * 0.5
    buyer_panel = _panel("BILL TO", [
        Paragraph(buyer.get("company") or buyer.get("name") or "-", st["body"]),
        Paragraph(f"Attn: {buyer.get('contact') or '-'}", st["small"]),
        Paragraph((buyer.get("billing_address") or "").replace("\n", "<br/>"), st["small"]),
        Paragraph(f"{buyer.get('city') or ''} {buyer.get('state') or ''} {buyer.get('postal_code') or ''}", st["small"]),
        Paragraph(f"{buyer.get('country') or '-'} · Tax ID: {buyer.get('tax_id') or '-'}", st["small"]),
        Paragraph(f"{buyer.get('email') or ''} · {buyer.get('phone') or ''}", st["small"]),
    ], ESPRESSO, half)
    ref_paras = [Paragraph(f"PO: {inv.po_number or '-'} · Ref quote: {inv.ref_quotation or '-'} · Order: {inv.order_number or '-'}", st["body"]),
                 Paragraph(f"Currency: {cur} · Incoterm: {inv.incoterm or '-'} · Ship: {inv.shipping_method or '-'}", st["small"]),
                 Paragraph(f"Port of loading: {inv.port_loading or '-'} · Destination: {inv.port_destination or '-'}", st["small"]),
                 Paragraph(f"Delivery: {inv.delivery_time or '-'} · Payment: {inv.payment_terms or '-'}", st["small"])]
    ref_cell = Table([[p] for p in ref_paras], colWidths=[half - 12])
    ref_cell.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                  ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 1),
                                  ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    ref_panel = Table([[Paragraph("REFERENCES & TERMS", ParagraphStyle("hb", fontName="Helvetica-Bold", fontSize=10, textColor=colors.white))], [ref_cell]], colWidths=[half])
    ref_panel.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), COPPER), ("BACKGROUND", (0, 1), (0, 1), colors.white),
                                   ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                                   ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                                   ("BOX", (0, 0), (-1, -1), 0.5, CHAMPAGNE)]))
    outer = Table([[buyer_panel, ref_panel]], colWidths=[half, half])
    outer.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                               ("RIGHTPADDING", (0, 0), (-1, -1), 4)]))
    story += [outer, Spacer(1, 7)]

    header = [Paragraph(x, st["cellw"]) for x in ["SKU", "Product", "Image", "Qty", "Unit", "Unit Price", "Amount"]]
    rows = [header]
    for it in items:
        imgs = json.loads(it.images or "[]") or []
        img = _fit_image(imgs[0], 18 * mm, 14 * mm) if imgs else None
        desc = f"<b>{it.name or '-'}</b>"
        if it.title: desc += f"<br/>{it.title}"
        if it.description: desc += f"<br/>{it.description}"
        if it.material: desc += f"<br/>Material: {it.material}"
        if it.dimensions: desc += f"<br/>{it.dimensions}"
        rows.append([Paragraph(it.sku or "-", st["cell"]), Paragraph(desc, st["cell"]), img or "",
                     Paragraph(str(it.quantity), st["cell"]), Paragraph(it.unit or "pcs", st["cell"]),
                     Paragraph(money(it.unit_price, cur), st["cell"]), Paragraph(money(it.line_total, cur), st["cellb"])])
    cw = [doc.width * 0.15, doc.width * 0.27, doc.width * 0.10, doc.width * 0.09,
          doc.width * 0.08, doc.width * 0.15, doc.width * 0.16]
    tbl = Table(rows, colWidths=cw, repeatRows=1)
    tbl.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), ESPRESSO), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                             ("GRID", (0, 0), (-1, -1), 0.4, CHAMPAGNE), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, IVORY]),
                             ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [Paragraph("PRODUCTS", st["h"]), Spacer(1, 3), tbl, Spacer(1, 6)]

    tot_rows = [("Subtotal", inv.subtotal), ("Discount", -float(inv.discount or 0)),
                ("Packing", inv.packing_charges), ("Freight", inv.freight_charges),
                ("Insurance", inv.insurance), ("Other", inv.other_charges), ("Tax", inv.tax)]
    data = [[Paragraph(a, st["cell"]), Paragraph(money(b, cur), st["cell"])] for a, b in tot_rows]
    data += [[Paragraph("GRAND TOTAL", st["total"]), Paragraph(money(inv.grand_total, cur), st["total"])]]
    data += [[Paragraph("Amount paid", st["cell"]), Paragraph(money(inv.amount_paid, cur), st["cell"])],
             [Paragraph("Balance due", st["cellb"]), Paragraph(money(inv.balance_due, cur), st["cellb"])]]
    tt = Table(data, colWidths=[doc.width * 0.7, doc.width * 0.3])
    tt.setStyle(TableStyle([("ALIGN", (1, 0), (1, -1), "RIGHT"), ("BACKGROUND", (0, 7), (-1, 7), NAVY),
                            ("LINEABOVE", (0, 7), (-1, 7), 0.8, GOLD),
                            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    story += [KeepTogether([Paragraph("SUMMARY", st["h"]), Spacer(1, 3), tt]), Spacer(1, 8)]

    if inv.show_bank and any(bank.values()):
        lines = [Paragraph("<b>BANK DETAILS</b>", st["terms"])]
        for k, label in [("bank_name", "Bank"), ("account_holder", "Account holder"), ("account_number", "Account no."),
                         ("ifsc", "IFSC"), ("swift", "SWIFT/BIC"), ("bank_address", "Bank address")]:
            if bank.get(k): lines.append(Paragraph(f"{label}: {bank[k]}", st["terms"]))
        bt = Table([[l] for l in lines], colWidths=[doc.width])
        bt.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), CHAMPAGNE), ("BOX", (0, 0), (-1, -1), 0.5, GOLD),
                                ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 4)]))
        story += [KeepTogether([bt]), Spacer(1, 8)]

    terms_lines = [l.strip() for l in (inv.terms or "").splitlines() if l.strip()]
    if terms_lines:
        body = "<br/>".join(f"{i+1}. {l}" for i, l in enumerate(terms_lines))
        tc = Table([[Paragraph("<b>TERMS & CONDITIONS</b>", st["terms"])], [Paragraph(body, st["terms"])]], colWidths=[doc.width])
        tc.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), CHAMPAGNE), ("BOX", (0, 0), (-1, -1), 0.5, GOLD),
                                ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story += [KeepTogether([tc]), Spacer(1, 12)]

    sig_cell = ParagraphStyle("sig", fontName="Helvetica", fontSize=8, textColor=GRAY, leading=11)
    sig = Table([
        [Paragraph("For New Look Impex", st["body"]), Paragraph("Received by Buyer", st["body"])],
        [Paragraph("&nbsp;", sig_cell), Paragraph("&nbsp;", sig_cell)],
        [Paragraph("Authorized Signature", sig_cell), Paragraph("Name &amp; Date", sig_cell)],
    ], colWidths=[doc.width * 0.5, doc.width * 0.5], rowHeights=[None, 26, None])
    sig.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LINEABOVE", (0, 1), (0, 1), 0.6, NAVY), ("LINEABOVE", (1, 1), (1, 1), 0.6, NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    story += [KeepTogether(sig)]
    doc.build(story)
    return buf.getvalue()


def _logo(company):
    fn = company.get("logo") or "nli-logo.png"
    p = file_path(fn)
    if p.exists():
        try:
            return RLImage(str(p), width=16 * mm, height=16 * mm, mask="auto")
        except Exception:
            return None
    return _brand_logo()
