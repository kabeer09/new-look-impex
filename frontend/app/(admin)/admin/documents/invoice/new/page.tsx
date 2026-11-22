"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DocumentStudio } from "@/components/admin/DocumentStudio";
import { Loading } from "@/components/public/States";

function NewInvoiceInner() {
  const params = useSearchParams();
  const fromQuote = params.get("from");
  return <DocumentStudio kind="invoice" fromQuote={fromQuote ? Number(fromQuote) : undefined} />;
}

export default function NewInvoice() {
  return <Suspense fallback={<Loading label="Opening invoice studio…" />}><NewInvoiceInner /></Suspense>;
}
