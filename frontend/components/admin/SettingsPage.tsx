"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface SiteSetting {
  key: string;
  value: string;
  description?: string | null;
  category?: string | null;
  is_public: boolean;
}

interface SiteSettingFormValues {
  key: string;
  value: string;
  description: string;
  category: string;
  is_public: boolean;
}

function fetchSettings(setSettings: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<SiteSetting[]>("/api/settings", {
        method: "GET",
      });
      setSettings(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SiteSetting | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedSettings, setSelectedSettings] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchSettings(setSettings, setLoading, setError)();
  }, []);

  const handleDelete = async (settingKey: string) => {
    if (confirm("Are you sure you want to archive this setting?")) {
      try {
        await api(`/api/settings/${settingKey}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchSettings(setSettings, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to archive setting");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Website Settings</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Add Setting
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
                  checked={selectedSettings.length === settings.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedSettings(settings.map((s) => s.key));
                    } else {
                      setSelectedSettings([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Key</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Value</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Public</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedSettings.includes(setting.key)}
                    onChange={(e) =>
                      setSelectedSettings(
                        e.target.checked
                          ? [...selectedSettings, setting.key]
                          : selectedSettings.filter((id) => id !== setting.key)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{setting.key}</td>
                <td>{setting.value || "—"}</td>
                <td>{setting.category || "—"}</td>
                <td>
                  <span
                    className={
                      setting.is_public
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {setting.is_public ? "Yes" : "No"}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingSetting(setting)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(setting.key)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {settings.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">
                  No settings found. Add your first setting.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSettings.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedSettings.length} setting{'s' + (selectedSettings.length > 1 ? 's' : '')} selected
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="btn btn-sm btn-primary"
            >
              Bulk Update Public Status
            </button>
            <button
              onClick={() => {
                selectedSettings.forEach((id) => handleDelete(id));
                setSelectedSettings([]);
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
            {editing ? "Edit Setting" : "Add Setting"}
          </h2>
          <p>Setting form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}