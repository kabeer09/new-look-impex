"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface Integration {
  id: string;
  name: string;
  type: "api" | "service" | "plugin";
  status: "connected" | "disconnected" | "error";
  endpoint?: string | null;
  last_sync?: string | null;
  description?: string | null;
  sort_order: number;
}

interface IntegrationFormValues {
  name: string;
  type: "api" | "service" | "plugin";
  endpoint: string;
  description: string;
  is_connected: boolean;
  sort_order: number;
}

function fetchIntegrations(setIntegrations: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<Integration[]>("/api/integrations", {
        method: "GET",
      });
      setIntegrations(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };
}

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchIntegrations(setIntegrations, setLoading, setError)();
  }, []);

  const handleDelete = async (integrationId: string) => {
    if (confirm("Are you sure you want to disconnect this integration?")) {
      try {
        await api(`/api/integrations/${integrationId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchIntegrations(setIntegrations, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to disconnect integration");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Integrations & API</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Add Integration
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
                  checked={selectedIntegrations.length === integrations.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIntegrations(integrations.map((i) => i.id));
                    } else {
                      setSelectedIntegrations([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Endpoint</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Last Sync</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => (
              <tr key={integration.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIntegrations.includes(integration.id)}
                    onChange={(e) =>
                      setSelectedIntegrations(
                        e.target.checked
                          ? [...selectedIntegrations, integration.id]
                          : selectedIntegrations.filter((id) => id !== integration.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{integration.name}</td>
                <td>
                  {integration.type === "api"
                    ? "API"
                    : integration.type === "service"
                      ? "Service"
                      : "Plugin"}
                </td>
                <td>
                  <span
                    className={
                      integration.status === "connected"
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : integration.status === "error"
                          ? "bg-red-100 text-red-800 text-xs font-medium"
                          : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {integration.status}
                  </span>
                </td>
                <td>{integration.endpoint || "—"}</td>
                <td>{integration.last_sync || "—"}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingIntegration(integration)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => handleDelete(integration.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Disconnect
                  </button>
                </td>
              </tr>
            ))}
            {integrations.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No integrations found. Add your first integration.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedIntegrations.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedIntegrations.length} integration{'s' + (selectedIntegrations.length > 1 ? 's' : '')} selected
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
                selectedIntegrations.forEach((id) => handleDelete(id));
                setSelectedIntegrations([]);
                setBulkModalOpen(false);
              }}
              className="btn btn-sm btn-ghost"
            >
              Disconnect Selected
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
            {editing ? "Edit Integration" : "Add Integration"}
          </h2>
          <p>Integration form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}