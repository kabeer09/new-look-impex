"use client";
import { useParams } from "next/navigation";
import { QuotationForm } from "@/components/admin/QuotationForm";

export default function EditQuotationPage() {
  const params = useParams();
  const id = Number(params.id);
  if (!id || isNaN(id)) return <p className="text-sm">Invalid quotation id.</p>;
  return <QuotationForm id={id} />;
}
