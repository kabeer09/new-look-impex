"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface Keyword {
  id: string;
  keyword: string;
  search_volume?: number | null;
  difficulty?: number | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
}

interface KeywordFormValues {
  keyword: string;
  search_volume: number;
  difficulty: number;
  is_active: boolean;
  sort_order: number;
}

function fetchKeywords(setKeywords: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<Keyword[]>("/api/keywords", {
        method: "GET",
      });
      setKeywords(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load keywords");
    } finally {
      setLoading(false);
    }
  };
}

export function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchKeywords(setKeywords, setLoading, setError)();
  }, []);

  const handleDelete = async (keywordId: string) => {
    if (confirm("Are you sure you want to archive this keyword?")) {
      try {
        await api(`/api/keywords/${keywordId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchKeywords(setKeywords, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to archive keyword");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Keywords Management</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Add Keyword
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
                  checked={selectedKeywords.length === keywords.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedKeywords(keywords.map((k) => k.id));
                    } else {
                      setSelectedKeywords([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Keyword</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Search Volume</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Difficulty</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((keyword) => (
              <tr key={keyword.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedKeywords.includes(keyword.id)}
                    onChange={(e) =>
                      setSelectedKeywords(
                        e.target.checked
                          ? [...selectedKeywords, keyword.id]
                          : selectedKeywords.filter((id) => id !== keyword.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{keyword.keyword}</td>
                <td>{keyword.search_volume || "—"}</td>
                <td>{keyword.difficulty || "—"}</td>
                <td>
                  <span
                    className={
                      keyword.is_active
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {keyword.is_active ? "Active" : "Archived"}
                  </span>
                </td>
                <td>{keyword.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingKeyword(keyword)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(keyword.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {keywords.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No keywords found. Add your first keyword.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedKeywords.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedKeywords.length} keyword{'s' + (selectedKeywords.length > 1 ? 's' : '')} selected
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
                selectedKeywords.forEach((id) => handleDelete(id));
                setSelectedKeywords([]);
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
            {editing ? "Edit Keyword" : "Add Keyword"}
          </h2>
          <p>Keywords form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}