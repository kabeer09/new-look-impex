"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function Enq() {
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const load = () => api<any>("/api/enquiries").then((d) => setItems(d.items || (Array.isArray(d) ? d : []))).catch((e) => setMsg(String(e)));
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Enquiries / CRM</h1>
        <a className="btn-ghost btn" href="http://localhost:8000/api/enquiries/export">Export CSV</a>
      </div>
      <p className="text-xs text-gray">Private lead data — never exposed publicly. No keyword-to-lead claim without evidence.</p>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="card">
        {items.length === 0 ? <p className="text-sm">No enquiries yet.</p> :
          <table className="data">
            <thead><tr><th>Name</th><th>Email</th><th>Country</th><th>Product</th><th>Status</th><th>Score</th></tr></thead>
            <tbody>{items.map((e: any) => <tr key={e.id}><td>{e.name}</td><td>{e.email}</td><td>{e.country}</td><td>{e.product_interest}</td><td>{e.status}</td><td>{e.score}</td></tr>)}</tbody>
          </table>}
      </div>
    </div>
  );
}
