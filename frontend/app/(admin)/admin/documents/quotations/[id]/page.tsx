"use client";
import { useParams } from "next/navigation";
import { DocumentStudio } from "@/components/admin/DocumentStudio";
export default function EditQuotation() {
  const params = useParams();
  const id = Number(params.id);
  if (!id) return <p className="text-sm">Invalid quotation.</p>;
  return <DocumentStudio kind="quotation" id={id} />;
}
