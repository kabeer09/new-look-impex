"use client";
import { useParams } from "next/navigation";
import { DocumentStudio } from "@/components/admin/DocumentStudio";
export default function EditInvoice() {
  const params = useParams();
  const id = Number(params.id);
  if (!id) return <p className="text-sm">Invalid invoice.</p>;
  return <DocumentStudio kind="invoice" id={id} />;
}
