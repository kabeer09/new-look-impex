"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface Banner {
  id: string;
  title: string;
  slug: string;
  image_url?: string | null;
  link_url?: string | null;
  is_active: boolean;
  sort_order: number;
  position: "header" | "sidebar" | "footer" | "hero";
}

interface BannerFormValues {
  title: string;
  slug: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: number;
  position: "header" | "sidebar" | "footer" | "hero";
}

function fetchBanners(setBanners: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<Banner[]>("/api/banners", {
        method: "GET",
      });
      setBanners(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  };
}

export function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchBanners(setBanners, setLoading, setError)();
  }, []);

  const handleDelete = async (bannerId: string) => {
    if (confirm("Are you sure you want to deactivate this banner?")) {
      try {
        await api(`/api/banners/${bannerId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchBanners(setBanners, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to deactivate banner");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Banners Management</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Add Banner
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
                  checked={selectedBanners.length === banners.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBanners(banners.map((b) => b.id));
                    } else {
                      setSelectedBanners([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Title</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Slug</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Position</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner) => (
              <tr key={banner.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedBanners.includes(banner.id)}
                    onChange={(e) =>
                      setSelectedBanners(
                        e.target.checked
                          ? [...selectedBanners, banner.id]
                          : selectedBanners.filter((id) => id !== banner.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{banner.title}</td>
                <td>{banner.slug || "—"}</td>
                <td>
                  {banner.position === "header"
                    ? "Header"
                    : banner.position === "sidebar"
                      ? "Sidebar"
                      : banner.position === "footer"
                        ? "Footer"
                        : "Hero"}
                </td>
                <td>
                  <span
                    className={
                      banner.is_active
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {banner.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{banner.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingBanner(banner)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No banners found. Add your first banner.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedBanners.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedBanners.length} banner{'s' + (selectedBanners.length > 1 ? 's' : '')} selected
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
                selectedBanners.forEach((id) => handleDelete(id));
                setSelectedBanners([]);
                setBulkModalOpen(false);
              }}
              className="btn btn-sm btn-ghost"
            >
              Deactivate Selected
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
            {editing ? "Edit Banner" : "Add Banner"}
          </h2>
          <p>Banner form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}