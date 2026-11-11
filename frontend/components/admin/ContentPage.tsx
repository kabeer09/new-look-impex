"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface PageContent {
  id: string;
  title: string;
  slug: string;
  content?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  is_published: boolean;
  sort_order: number;
}

interface PageContentFormValues {
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  is_published: boolean;
  sort_order: number;
}

function fetchPageContent(setPageContent: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<PageContent[]>("/api/page-content", {
        method: "GET",
      });
      setPageContent(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load page content");
    } finally {
      setLoading(false);
    }
  };
}

export function ContentPage() {
  const [pageContent, setPageContent] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingContent, setEditingContent] = useState<PageContent | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchPageContent(setPageContent, setLoading, setError)();
  }, []);

  const handleDelete = async (pageId: string) => {
    if (confirm("Are you sure you want to archive this page?")) {
      try {
        await api(`/api/page-content/${pageId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchPageContent(setPageContent, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to archive page");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Website Page Content</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Add Page
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
                  checked={selectedContent.length === pageContent.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedContent(pageContent.map((p) => p.id));
                    } else {
                      setSelectedContent([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Slug</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageContent.map((page) => (
              <tr key={page.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedContent.includes(page.id)}
                    onChange={(e) =>
                      setSelectedContent(
                        e.target.checked
                          ? [...selectedContent, page.id]
                          : selectedContent.filter((id) => id !== page.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{page.title}</td>
                <td>{page.slug || "—"}</td>
                <td>
                  <span
                    className={
                      page.is_published
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {page.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td>{page.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingContent(page)}
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
            {pageContent.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">
                  No page content found. Add your first page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedContent.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedContent.length} page{'s' + (selectedContent.length > 1 ? 's' : '')} selected
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="btn btn-sm btn-primary"
            >
              Bulk Update Status
            </button>
            <button
              onClick={() => {
                selectedContent.forEach((id) => handleDelete(id));
                setSelectedContent([]);
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
            {editing ? "Edit Page" : "Add Page"}
          </h2>
          <p>Page content form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}