"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface SeoPage {
  id: string;
  title: string;
  slug: string;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  is_active: boolean;
  sort_order: number;
}

interface SeoPageFormValues {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  is_active: boolean;
  sort_order: number;
}

function fetchSeoPages(setSeoPages: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<SeoPage[]>("/api/seo-pages", {
        method: "GET",
      });
      setSeoPages(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load SEO pages");
    } finally {
      setLoading(false);
    }
  };
}

export function SeoPagesPage() {
  const [seoPages, setSeoPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingSeoPage, setEditingSeoPage] = useState<SeoPage | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchSeoPages(setSeoPages, setLoading, setError)();
  }, []);

  const handleDelete = async (seoPageId: string) => {
    if (confirm("Are you sure you want to archive this SEO page?")) {
      try {
        await api(`/api/seo-pages/${seoPageId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchSeoPages(setSeoPages, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to archive SEO page");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">SEO Pages Management</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Create SEO Page
        </button>
      </div>

      {error && (
        <div className="alert-error mb-6">
          <p>{error}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-card p-4 shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground opacity-70">
                <input
                  type="checkbox"
                  checked={selectedPages.length === seoPages.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPages(seoPages.map((p) => p.id));
                    } else {
                      setSelectedPages([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Slug</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Meta Title</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Meta Description</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {seoPages.map((page) => (
              <tr key={page.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(page.id)}
                    onChange={(e) =>
                      setSelectedPages(
                        e.target.checked
                          ? [...selectedPages, page.id]
                          : selectedPages.filter((id) => id !== page.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{page.title}</td>
                <td>{page.slug || "—"}</td>
                <td>{page.meta_title || "—"}</td>
                <td>{page.meta_description || "—"}</td>
                <td>
                  <span
                    className={
                      page.is_active
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {page.is_active ? "Active" : "Archived"}
                  </span>
                </td>
                <td>{page.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingSeoPage(page)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {seoPages.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No SEO pages found. Create your first SEO page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedPages.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedPages.length} page{'s' + (selectedPages.length > 1 ? 's' : '')} selected
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="btn btn-sm btn-primary"
            >
              Bulk Update Sort Order
            </button>
            <button
              onClick={() => {
                selectedPages.forEach((id) => handleDelete(id));
                setSelectedPages([]);
                setBulkModalOpen(false);
              }}
              className="btn btn-sm btn-ghost"
            >
              Archive Selected
            </button>
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
          <h2 className="text-xl font-bold mb-4">
            {editing ? "Edit SEO Page" : "Create SEO Page"}
          </h2>
          <p>SEO page form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}