"use client";
import { WHATSAPP_TEXT } from "@/lib/api";
import { useWhatsappNumber } from "@/hooks/useWhatsapp";

/** Click-to-chat WhatsApp link using the admin-configured number. Re-renders when
 *  the live setting loads (falls back to the bundled default until then). */
export function WhatsAppLink({
  text = WHATSAPP_TEXT,
  children,
  className,
  track,
}: {
  text?: string;
  children: React.ReactNode;
  className?: string;
  track?: () => void;
}) {
  const number = useWhatsappNumber();
  const href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={track}
      data-wa-number={number}
    >
      {children}
    </a>
  );
}
