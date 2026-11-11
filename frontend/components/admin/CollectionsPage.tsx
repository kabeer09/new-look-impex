"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  product_count?: number;
  is_active: boolean;
  sort_order: number;
}

interface CollectionFormValues {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

function fetchCollections(setCollections: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<Collection[]>("/api/collections", {
        method: "GET",
      });
      setCollections(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load collections");
    } finally {
      setLoading(false);
    }
  };
}

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchCollections(setCollections, setLoading, setError)();
  }, []);

  const handleDelete = async (collectionId: string) => {
    if (confirm("Are you sure you want to archive this collection?")) {
      try {
        await api(`/api/collections/${collectionId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchCollections(setCollections, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to archive collection");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Collections & NLI Groups</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Create Collection
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
                  checked={selectedCollections.length === collections.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCollections(collections.map((c) => c.id));
                    } else {
                      setSelectedCollections([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Slug</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Products</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => (
              <tr key={collection.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(collection.id)}
                    onChange={(e) =>
                      setSelectedCollections(
                        e.target.checked
                          ? [...selectedCollections, collection.id]
                          : selectedCollections.filter((id) => id !== collection.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{collection.name}</td>
                <td>{collection.slug || "—"}</td>
                <td>{collection.product_count || 0}</td>
                <td>
                  <span
                    className={
                      collection.is_active
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {collection.is_active ? "Active" : "Archived"}
                  </span>
                </td>
                <td>{collection.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingCollection(collection)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(collection.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No collections found. Create your first collection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCollections.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedCollections.length} collection{'s' + (selectedCollections.length > 1 ? 's' : '')} selected
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
                selectedCollections.forEach((id) => handleDelete(id));
                setSelectedCollections([]);
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
            {editing ? "Edit Collection" : "Create Collection"}
          </h2>
          <p>Collection form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}