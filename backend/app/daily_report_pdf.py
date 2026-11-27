"""PDF builder for the consolidated weekly business report."""
from __future__ import annotations
from pathlib import Path
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

from .config import settings
from .media_store import MEDIA_DIR


def build_weekly_report_pdf(report) -> Path:
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("NLIH1", parent=styles["Heading1"], fontSize=20, textColor=colors.HexColor("#0B192C"))
    h2 = ParagraphStyle("NLIH2", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#A66A45"), spaceBefore=12)
    body = ParagraphStyle("NLIBody", parent=styles["BodyText"], fontSize=9, leading=13)
    data = json.loads(report.sections_json or "{}")
    sections = data.get("sections", {})
    labels = {
        "A": "Executive Summary", "B": "Export Intelligence", "C": "SEO Performance",
        "D": "Product Performance", "E": "Creative Studio", "F": "Marketing",
        "G": "Website Health", "H": "Sales", "I": "Analytics", "J": "Next Week's Action Plan",
    }
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    name = f"weekly-report-{report.week}.pdf"
    path = MEDIA_DIR / name
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                            topMargin=16*mm, bottomMargin=16*mm)
    story = [Paragraph("New Look Impex — Weekly Business Report", h1),
             Paragraph(f"Week: {report.week}", body), Spacer(1, 8)]
    for code, label in labels.items():
        story.append(Paragraph(f"{code}. {label}", h2))
        text = str(sections.get(code, "Not available.")).replace("\n", "<br/>")
        story.append(Paragraph(text[:6000], body))
    doc.build(story)
    return path


def build_growth_report_pdf(report) -> Path:
    """PDF for the consolidated weekly SEO & business growth report."""
    titles = {
        1: "Website Health", 2: "Google Search Console Performance", 3: "Improving & Declining Keywords",
        4: "Keywords With First-Page Potential", 5: "Country-Wise Organic Visibility",
        6: "New Keyword Opportunities", 7: "Competitor Findings", 8: "Product-Page Opportunities",
        9: "Technical SEO Issues", 10: "New & Qualified Buyer Enquiries", 11: "Completed Agent Tasks",
        12: "Failed / Pending Tasks", 13: "Published Changes & Verification", 14: "Next Week's Action Plan",
    }
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("NLIH1", parent=styles["Heading1"], fontSize=19, textColor=colors.HexColor("#0B192C"))
    h2 = ParagraphStyle("NLIH2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#A66A45"), spaceBefore=10)
    body = ParagraphStyle("NLIBody", parent=styles["BodyText"], fontSize=8.5, leading=12)
    data = json.loads(report.sections_json or "{}")
    sections = data.get("sections", {})
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    path = MEDIA_DIR / f"growth-report-{report.week}.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=16*mm, rightMargin=16*mm,
                            topMargin=14*mm, bottomMargin=14*mm)
    story = [Paragraph("New Look Impex — Weekly SEO & Business Growth Report", h1),
             Paragraph(f"Week {report.week} · {report.summary[:400]}", body), Spacer(1, 6)]
    for n, title in titles.items():
        story.append(Paragraph(f"{n}. {title}", h2))
        text = str(sections.get(str(n), "Not available.")).replace("\n", "<br/>")
        story.append(Paragraph(text[:5000], body))
    doc.build(story)
    return path
