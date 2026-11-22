"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loading } from "@/components/public/States";

type Kind = "object" | "list" | "strings";
type Section = { key: string; label: string; desc: string; kind: Kind; fields?: string[] };
const SECTIONS: Section[] = [
  { key: "hero", label: "Homepage hero", desc: "Main headline, video and poster image.", kind: "object", fields: ["headline", "subline", "video", "poster", "cta", "cta_link"] },
  { key: "marquee", label: "Marquee strip", desc: "Scrolling text under the hero.", kind: "object", fields: ["text"] },
  { key: "contact", label: "Homepage contact block", desc: "Address, phones and emails shown on the homepage.", kind: "object", fields: ["address", "phones", "emails", "whatsapp", "gstin"] },
  { key: "metalcraft_cards", label: "Metalcraft cards", desc: "Image cards in the metalcraft section.", kind: "list", fields: ["img", "category", "title", "cta", "href", "alt"] },
  { key: "gift_cards", label: "Gifting cards", desc: "Festive and corporate gifting cards.", kind: "list", fields: ["img", "title", "text", "cta", "href", "alt"] },
  { key: "gallery_cards", label: "Gallery cards", desc: "Video and photo tiles. kind = video or image.", kind: "list", fields: ["kind", "src", "poster", "title", "text", "href", "alt"] },
  { key: "mfg_blocks", label: "Manufacturing blocks", desc: "Capability blocks with numbers.", kind: "list", fields: ["num", "title", "text"] },
  { key: "material_tiles", label: "Material tiles", desc: "Shop-by-material tiles. Leave img empty for a text-only tile.", kind: "list", fields: ["title", "text", "href", "img", "alt"] },
  { key: "journal_cards", label: "Journal cards", desc: "Craft journal cards linking to the blog.", kind: "list", fields: ["img", "title", "text", "href", "alt"] },
  { key: "export_markets", label: "Export markets", desc: "Country chips shown on the homepage.", kind: "list", fields: ["code", "label", "href"] },
  { key: "season_cards", label: "Seasonal / festive cards", desc: "Festival cards with images. Keep the id values (used for date matching).", kind: "list", fields: ["id", "market", "title", "note", "img", "alt", "href"] },
  { key: "popup_images", label: "Discount popup images", desc: "One image URL per line.", kind: "strings" },
  { key: "shop_category_tiles", label: "Shop by Category tiles", desc: "Homepage category tiles. family = Copper, Brass or Mixed. cats = comma-separated category slugs for live counts.", kind: "list", fields: ["img", "title", "text", "href", "alt", "family", "cats"] },
  { key: "home_faq", label: "Homepage FAQ", desc: "Questions and answers shown on the homepage and in search structured data.", kind: "list", fields: ["q", "a"] },
  { key: "footer_company", label: "Footer · Company links", desc: "Links in the Company column.", kind: "list", fields: ["label", "href"] },
  { key: "footer_shop", label: "Footer · Shop links", desc: "Links in the Shop column.", kind: "list", fields: ["label", "href"] },
  { key: "footer_guides", label: "Footer · Guides links", desc: "Links in the Guides column.", kind: "list", fields: ["label", "href"] },
  { key: "footer_regions", label: "Footer · Regions links", desc: "Links in the Regions column.", kind: "list", fields: ["label", "href"] },
];

type Val = any;

export default function SiteContentEditor() {
  const [active, setActive] = useState(SECTIONS[0].key);
  const [draft, setDraft] = useState<Record<string, Val>>({});
  const [original, setOriginal] = useState<Record<string, Val>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Record<string, Val>>("/api/site-content")
      .then((d) => { setDraft(d || {}); setOriginal(d || {}); })
      .catch((e) => setMsg(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const section = SECTIONS.find((s) => s.key === active)!;
  const current = draft[active];
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);

  const begin = () => {
    const init: Val = section.kind === "list" ? [Object.fromEntries((section.fields || []).map((f) => [f, ""]))]
      : section.kind === "strings" ? [] : Object.fromEntries((section.fields || []).map((f) => [f, ""]));
    setDraft((d) => ({ ...d, [active]: init }));
  };
  const setObj = (k: string, v: string) => setDraft((d) => ({ ...d, [active]: { ...(d[active] || {}), [k]: v } }));
  const setList = (idx: number, k: string, v: string) => setDraft((d) => {
    const rows = [...(d[active] || [])]; rows[idx] = { ...rows[idx], [k]: v }; return { ...d, [active]: rows };
  });
  const addRow = () => setDraft((d) => ({ ...d, [active]: [...(d[active] || []), Object.fromEntries((section.fields || []).map((f) => [f, ""]))] }));
  const delRow = (idx: number) => setDraft((d) => ({ ...d, [active]: (d[active] || []).filter((_: any, i: number) => i !== idx) }));
  const moveRow = (idx: number, dir: -1 | 1) => setDraft((d) => {
    const rows = [...(d[active] || [])]; const j = idx + dir;
    if (j < 0 || j >= rows.length) return d;
    [rows[idx], rows[j]] = [rows[j], rows[idx]]; return { ...d, [active]: rows };
  });
  const setStrings = (text: string) => setDraft((d) => ({ ...d, [active]: text.split("\n").map((s) => s.trim()).filter(Boolean) }));

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const items = SECTIONS.map((s) => ({ key: s.key, label: s.label, value: draft[s.key] ?? null }));
      await api("/api/site-content", { method: "PUT", body: JSON.stringify({ items }) });
      setOriginal(JSON.parse(JSON.stringify(draft)));
      setMsg("Saved — the live website now shows this content.");
    } catch (e) { setMsg(`Save failed: ${String(e)}`); }
    finally { setSaving(false); }
  };

  if (loading) return <Loading label="Loading site content…" />;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><Link href="/admin/site-control" className="link text-sm">← Site Control</Link>
          <h1 className="text-2xl font-bold mt-1">Homepage Content</h1>
          <p className="text-sm text-gray mt-1">Edit the images and text shown on your live homepage. Changes appear immediately.</p></div>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="card bg-ivory"><p className="text-xs text-navy">Image URLs can be copied from <Link className="link" href="/admin/media">Media</Link>. Leave a section untouched to keep the site default.</p></div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="card !p-2 h-fit space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setActive(s.key)}
              className={`w-full text-left px-3 py-2 text-sm rounded ${active === s.key ? "bg-navy text-white" : "text-navy hover:bg-sand"}`}>
              {s.label}{draft[s.key] !== undefined && <span className="ml-1 text-xs">•</span>}
            </button>
          ))}
        </nav>

        <section className="card">
          <h2 className="font-semibold text-navy">{section.label}</h2>
          <p className="text-xs text-gray mb-4">{section.desc}</p>

          {current === undefined && <div className="text-center py-8">
            <p className="text-sm text-gray mb-3">This section is using the site default.</p>
            <button className="btn btn-outline btn-sm" onClick={begin}>Start editing this section</button>
          </div>}

          {current !== undefined && section.kind === "object" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {(section.fields || []).map((f) => (
                <label key={f} className="block"><span className="text-xs font-semibold text-navy capitalize">{f.replace(/_/g, " ")}</span>
                  <input className="input mt-1" value={String(current[f] ?? "")} onChange={(e) => setObj(f, e.target.value)} /></label>
              ))}
            </div>
          )}

          {current !== undefined && section.kind === "strings" && (
            <textarea rows={8} className="input" value={(current || []).join("\n")} onChange={(e) => setStrings(e.target.value)} />
          )}

          {current !== undefined && section.kind === "list" && (
            <div className="space-y-4">
              {(current || []).map((row: any, idx: number) => (
                <div key={idx} className="border border-sand rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <b className="text-sm text-navy">Row {idx + 1}</b>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => moveRow(idx, -1)}>↑</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => moveRow(idx, 1)}>↓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => delRow(idx)}>Remove</button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {(section.fields || []).map((f) => (
                      <label key={f} className="block"><span className="text-xs font-semibold text-navy capitalize">{f.replace(/_/g, " ")}</span>
                        <input className="input mt-1" value={String(row[f] ?? "")} onChange={(e) => setList(idx, f, e.target.value)} /></label>
                    ))}
                  </div>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={addRow}>+ Add row</button>
            </div>
          )}

          {current !== undefined && <div className="flex gap-2 mt-5 pt-4 border-t border-sand">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty}>Save changes</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setDraft((d) => { const n = { ...d }; delete n[active]; return n; })}>Reset to default</button>
          </div>}
        </section>
      </div>
    </div>
  );
}
