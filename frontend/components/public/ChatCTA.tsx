"use client";
import type { ReactNode } from "react";
import { openNliChat } from "@/lib/assistant";

/**
 * "Open the live chat" button for server components (they can't attach
 * onClick handlers themselves). Renders a plain <button> so it inherits
 * whatever btn classes the caller passes.
 */
export function ChatCTA({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={() => openNliChat()}>
      {children}
    </button>
  );
}
