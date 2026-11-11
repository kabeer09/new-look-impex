"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
  alt_text?: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

interface MediaFormValues {
  alt_text: string;
  is_featured: boolean;
  sort_order: number;
}

function fetchMedia(setMedia: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<MediaItem[]>("/api/media", {
        method: "GET",
      });
      setMedia(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load media library");
    } finally {
      setLoading(false);
    }
  };
}

export function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchMedia(setMedia, setLoading, setError)();
  }, []);

  const handleDelete = async (mediaId: string) => {
    if (confirm("Are you sure you want to remove this media item?")) {
      try {
        await api(`/api/media/${mediaId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchMedia(setMedia, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to remove media item");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Media Library</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Upload Media
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
                  checked={selectedMedia.length === media.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMedia(media.map((m) => m.id));
                    } else {
                      setSelectedMedia([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Filename</th>
              <th className="text-left text-xs font-medium text-muted-foreground">URL</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Size</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Featured</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {media.map((item) => (
              <tr key={item.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedMedia.includes(item.id)}
                    onChange={(e) =>
                      setSelectedMedia(
                        e.target.checked
                          ? [...selectedMedia, item.id]
                          : selectedMedia.filter((id) => id !== item.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{item.filename}</td>
                <td>{item.url || "—"}</td>
                <td>{item.mime_type || "—"}</td>
                <td>{item.size > 1024 ? `${(item.size / 1024).toFixed(1)} KB` : `${item.size} bytes`}</td>
                <td>
                  <span
                    className={
                      item.is_featured
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {item.is_featured ? "Yes" : "No"}
                  </span>
                </td>
                <td>{item.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingMedia(item)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {media.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground py-8">
                  No media items found. Upload your first media file.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedMedia.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedMedia.length} item{'s' + (selectedMedia.length > 1 ? 's' : '')} selected
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="btn btn-sm btn-primary"
            >
              Bulk Update Featured
            </button>
            <button
              onClick={() => {
                selectedMedia.forEach((id) => handleDelete(id));
                setSelectedMedia([]);
                setBulkModalOpen(false);
              }}
              className="btn btn-sm btn-ghost"
            >
              Remove Selected
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
          <h2 className="text-xl font-bold mb-4">Media Item Form</h2>
          <p>Media library upload form - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}