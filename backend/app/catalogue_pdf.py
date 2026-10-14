"""Admin-controlled product catalogue PDF generator.
Only published products; excludes private supplier info; shows
'Pricing on request' when prices are not public."""
from __future__ import annotations
import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (Image as RLImage, PageBreak, Paragraph,
                                  SimpleDocTemplate, Spacer, Table,
                                  TableStyle)
from PIL import Image as PILImage

from . import models
from .database import SessionLocal
from .media_store import MEDIA_DIR

NAVY = colors.HexColor("#172A3A")
BRASS = colors.HexColor("#B08D57")
IVORY = colors.HexColor("#F8F5EF")
CHARCOAL = colors.HexColor("#252A2D")
GRAY = colors.HexColor("#6B7280")


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _local_image_path(url: str):
    """Return filesystem path for a locally stored media image, else None."""
    if not url:
        return None
    if "/api/media/files/" in url:
        fn = url.rsplit("/", 1)[-1]
        p = MEDIA_DIR / fn
        if p.exists():
            return str(p)
    return None


def _fit_image(path: str, max_w: float, max_h: float):
    try:
        with PILImage.open(path) as im:
            iw, ih = im.size
        scale = min(max_w / iw, max_h / ih, 1.0)
        return RLImage(path, width=iw * scale, height=ih * scale)
    except Exception:
        return None


def build_catalogue_pdf(product_ids: list[int] | None = None,
                          category_id: int | None = None,
                          collection_id: int | None = None,
                          business_info: dict | None = None) -> bytes:
    db = SessionLocal()
    try:
        q = db.query(models.Product).filter(models.Product.status == "published")
        if product_ids:
            q = q.filter(models.Product.id.in_(product_ids))
        if category_id:
            q = q.filter(models.Product.category_id == category_id)
        if collection_id:
            q = q.join(models.ProductCollection,
                           models.ProductCollection.product_id == models.Product.id) \
                .filter(models.ProductCollection.collection_id == collection_id)
        products = q.order_by(models.Product.sort_order, models.Product.id).all()

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
                                  leftMargin=18 * mm, rightMargin=18 * mm,
                                  topMargin=16 * mm, bottomMargin=16 * mm,
                                  title="New Look Impex — Product Catalogue")

        title_st = ParagraphStyle("title", fontName="Helvetica-Bold",
                                    fontSize=26, textColor=NAVY, spaceAfter=4)
        sub_st = ParagraphStyle("sub", fontName="Helvetica",
                                  fontSize=11, textColor=BRASS, spaceAfter=2)
        meta_st = ParagraphStyle("meta", fontName="Helvetica",
                                   fontSize=9, textColor=GRAY)
        h_st = ParagraphStyle("h", fontName="Helvetica-Bold",
                                fontSize=15, textColor=NAVY, spaceBefore=6,
                                spaceAfter=3)
        body_st = ParagraphStyle("body", fontName="Helvetica",
                                   fontSize=9.5, textColor=CHARCOAL,
                                   leading=13, spaceAfter=4)
        spec_st = ParagraphStyle("spec", fontName="Helvetica",
                                   fontSize=8.5, textColor=GRAY, leading=11)
        price_st = ParagraphStyle("price", fontName="Helvetica-Bold",
                                    fontSize=11, textColor=BRASS, spaceAfter=4)

        story = []
        info = business_info or {}
        story.append(Paragraph(info.get("business_name", "New Look Impex"), title_st))
        story.append(Paragraph("Copper & Brass Handicrafts · Wholesale & Export", sub_st))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            f"{info.get('location', 'Moradabad, Uttar Pradesh, India')} · "
            f"{info.get('email', 'newlookimpex@gmail.com')} · "
            f"{info.get('phones', '+91 8218251238 / +91 7500441239')}", meta_st))
        story.append(Paragraph(f"Catalogue generated {_now_str()}. "
                                 "Pricing on request — contact for wholesale quotations.",
                                 meta_st))
        story.append(Spacer(1, 8))
        # divider
        story.append(Table([[""]], colWidths=[174 * mm], rowHeights=[1],
                             style=TableStyle([("LINEBELOW", (0, 0), (-1, -1),
                                                  1.5, BRASS)])))
        story.append(Spacer(1, 10))

        if not products:
            story.append(Paragraph(
                "No published products match the selected filters.", body_st))
            doc.build(story)
            return buf.getvalue()

        for p in products:
            # image (first local image only)
            img_flow = None
            for im in db.query(models.ProductImage).filter(
                    models.ProductImage.product_id == p.id) \
                    .order_by(models.ProductImage.is_primary.desc()).all():
                path = _local_image_path(im.url)
                if path:
                    img_flow = _fit_image(path, 55 * mm, 55 * mm)
                    break
            if img_flow:
                t = Table([[img_flow,
                            [Paragraph(p.name, h_st),
                             Paragraph((p.short_description or
                                          p.description or "").replace("\n", " "),
                                         body_st),
                             _spec_table(p, db, spec_st),
                             _price_line(p, price_st)]]],
                            colWidths=[60 * mm, 114 * mm])
                t.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (1, 0), (1, 0), 8),
                ]))
                story.append(t)
            else:
                story.append(Paragraph(p.name, h_st))
                story.append(Paragraph((p.short_description or
                                          p.description or "").replace("\n", " "), body_st))
                story.append(_spec_table(p, db, spec_st))
                story.append(_price_line(p, price_st))
            story.append(Spacer(1, 6))
            story.append(Table([[""]], colWidths=[174 * mm], rowHeights=[0.5],
                                 style=TableStyle([("LINEBELOW", (0, 0), (-1, -1),
                                                      0.5, colors.HexColor("#E7DFD2"))])))
            story.append(Spacer(1, 8))

        doc.build(story)
        return buf.getvalue()
    finally:
        db.close()


def _spec_table(p: models.Product, db, spec_st) -> Table:
    specs = db.query(models.ProductSpec).filter(models.ProductSpec.product_id == p.id).all()
    rows = []
    if p.sku:
        rows.append(["SKU", p.sku])
    if p.material:
        rows.append(["Material", p.material])
    if p.finish:
        rows.append(["Finish", p.finish])
    if p.color:
        rows.append(["Colour", p.color])
    if p.dimensions:
        rows.append(["Dimensions", p.dimensions])
    if p.weight:
        rows.append(["Weight", p.weight])
    if p.moq:
        rows.append(["MOQ", p.moq])
    if p.lead_time:
        rows.append(["Lead time", p.lead_time])
    if p.packaging_info:
        rows.append(["Packaging", p.packaging_info])
    for s in specs:
        rows.append([s.key, s.value])
    if not rows:
        return Spacer(1, 0)
    t = Table([[Paragraph(f"<b>{k}</b>", spec_st), Paragraph(str(v), spec_st)]
                 for k, v in rows], colWidths=[32 * mm, 82 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    return t


def _price_line(p: models.Product, price_st) -> Paragraph:
    if p.price_on_request or p.price is None:
        return Paragraph("Pricing on request — contact for a wholesale quotation.", price_st)
    return Paragraph(f"Indicative price: {p.currency} {p.price:.2f} "
                       "(quoted per order)", price_st)


def get_business_info(db) -> dict:
    def get(key, default):
        row = db.query(models.BusinessSetting).filter(
            models.BusinessSetting.key == key).first()
        return row.value if row and row.value else default
    return {
        "business_name": get("business_name", "New Look Impex"),
        "location": get("location", "Moradabad, Uttar Pradesh, India"),
        "email": get("business_email", "newlookimpex@gmail.com"),
        "phones": get("business_phones", "+91 8218251238 / +91 7500441239"),
    }
