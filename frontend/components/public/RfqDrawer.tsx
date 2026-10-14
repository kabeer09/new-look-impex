"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRfqCart } from "@/lib/rfq";
import { whatsappLink } from "@/lib/api";

export function RfqDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const cart = useRfqCart();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Enquiry list">
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-ivory shadow-2xl flex flex-col focus:outline-none"
      >
        <div className="flex items-center justify-between p-4 border-b border-sand bg-white">
          <h2 className="font-serif font-bold text-navy text-lg">Enquiry List ({cart.count})</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-semibold">Your enquiry list is empty</p>
              <p className="text-sm text-gray mt-1">Add products from the catalogue, then request a wholesale quote.</p>
              <Link href="/products" className="btn btn-primary btn-sm mt-4" onClick={onClose}>
                Browse products
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.product_id} className="card !p-4">
                <div className="flex justify-between gap-2">
                  <Link href={`/products/${item.product_id}`} className="font-medium text-navy hover:underline" onClick={onClose}>
                    {item.product_name}
                  </Link>
                  <button className="text-red-700 text-xs hover:underline" onClick={() => cart.remove(item.product_id)} aria-label={`Remove ${item.product_name}`}>
                    Remove
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-gray" htmlFor={`qty-${item.product_id}`}>
                    Qty
                  </label>
                  <input
                    id={`qty-${item.product_id}`}
                    type="number"
                    min={1}
                    className="input !w-24 !py-1"
                    value={item.quantity}
                    onChange={(e) => cart.setQuantity(item.product_id, parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <input
                  className="input !py-1 mt-2"
                  placeholder="Notes for this item (optional)"
                  value={item.notes || ""}
                  onChange={(e) => cart.setNote(item.product_id, e.target.value)}
                  aria-label={`Notes for ${item.product_name}`}
                />
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="p-4 border-t border-sand bg-white space-y-2">
            <Link href="/request-quote" className="btn btn-primary w-full" onClick={onClose}>
              Request Quote ({cart.count} {cart.count === 1 ? "item" : "items"})
            </Link>
            <a className="btn btn-outline w-full" href={whatsappLink("Hi, I would like a wholesale quotation for products in my RFQ cart.")} target="_blank" rel="noopener noreferrer">
              WhatsApp Enquiry
            </a>
            <button className="btn btn-ghost w-full" onClick={() => cart.clear()}>
              Clear cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
