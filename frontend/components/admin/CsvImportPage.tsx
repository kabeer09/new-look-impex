"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";

interface CsvImportResult {
  total_rows: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    column: string;
    message: string;
  }>;
}

interface ProductRow {
  name: string;
  slug: string;
  sku: string;
  category: string;
  material: string;
  price: string;
  status: "published" | "draft";
  featured: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

function fetchImportResult(file: File, setImportResult: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await api<CsvImportResult>("/api/csv-import", {
        method: "POST",
        body: formData,
      });

      setImportResult(res);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to import CSV");
      setLoading(false);
    }
  };
}

export function CsvImportPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError("Please select a CSV file first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchImportResult(selectedFile, setImportResult, setLoading, setError)();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to import CSV");
      setLoading(false);
    }
  };

  const openFileSelector = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedFile(file);
        setError(null);
      }
    };
    input.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">CSV / Excel Import</h2>
        <div>
          <button onClick={openFileSelector} className="btn btn-outline">
            Select CSV File
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary ml-2"
          >
            Manual Entry
          </button>
        </div>
      </div>

      {selectedFile && (
        <div className="alert-info mb-6">
          <p className="text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({selectedFile.size > 1024 ? `${(selectedFile.size / 1024).toFixed(1)} KB` : `${selectedFile.size} bytes`})
          </p>
        </div>
      )}

      {importResult && (
        <div className="overflow-x-auto rounded-lg bg-card p-4 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold">Import Results</h3>
            <p className="text-sm text-muted-foreground">
              {importResult.successful} of {importResult.total_rows} products imported
            </p>
          </div>

          {importResult.failed > 0 && (
            <div className="alert-error mb-4">
              <p className="text-sm font-medium text-error">
                {importResult.failed} {importResult.failed === 1 ? "error" : "errors"}
              </p>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium margin-bottom-2">Errors</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground">Row</th>
                      <th className="text-left text-xs font-medium text-muted-foreground">Column</th>
                      <th className="text-left text-xs font-medium text-muted-foreground">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((err) => (
                      <tr key={err.row} className="border-b">
                        <td className="text-center font-medium">{err.row}</td>
                        <td>{err.column}</td>
                        <td>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              <strong>{importResult.successful}</strong> product{'s' + (importResult.successful !== 1 ? 's' : '')} successfully imported
            </p>
            <p className="text-xs text-muted-foreground">
              Check for any errors above and re-import if needed.
            </p>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 top-0 left-0 right-0 z-50 rounded-lg p-6 shadow-lg">
          <button
            type="button"
            className="absolute right-0 top-0 w-10 h-10 rounded-full bg-gray-200 p-2 hover:bg-gray-300 text-lg flex items-center justify-center"
            onClick={() => setModalOpen(false)}
            aria-label="Close"
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M4 7l16 16M4 12l16-16M4 12l16 16" />
            </svg>
          </button>
          <h2 className="text-xl font-bold mb-4">CSV Template</h2>
          <p className="text-sm text-muted-foreground">
            Download the template below and fill in your product data. Required columns:
            name, slug, sku, category, material, price, status, featured, seo_title,
            seo_description, seo_keywords
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="mt-4 btn btn-ghost"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}