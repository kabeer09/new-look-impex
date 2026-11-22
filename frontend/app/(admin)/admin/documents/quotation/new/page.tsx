"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DocumentStudio } from "@/components/admin/DocumentStudio";
import { Loading } from "@/components/public/States";

function NewQuotationInner() {
  const params = useSearchParams();
  const fromQuote = params.get("from");
  return <DocumentStudio kind="quotation" fromQuote={fromQuote ? Number(fromQuote) : undefined} />;
}

export default function NewQuotation() {
  return <Suspense fallback={<Loading label="Opening quotation studio…" />}><NewQuotationInner /></Suspense>;
}
