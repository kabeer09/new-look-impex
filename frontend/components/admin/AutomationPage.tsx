"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface AutomationRule {
  id: string;
  name: string;
  description?: string | null;
  trigger: "product_update" | "order_placed" | "stock_change" | "customer_registration";
  action: "email_notify" | "webhook" | "api_call" | "database_update";
  is_active: boolean;
  sort_order: number;
  config?: string | null;
}

interface AutomationRuleFormValues {
  name: string;
  description: string;
  trigger: "product_update" | "order_placed" | "stock_change" | "customer_registration";
  action: "email_notify" | "webhook" | "api_call" | "database_update";
  is_active: boolean;
  sort_order: number;
}

function fetchAutomationRules(setRules: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<AutomationRule[]>("/api/automation-rules", {
        method: "GET",
      });
      setRules(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load automation rules");
    } finally {
      setLoading(false);
    }
  };
}

export function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchAutomationRules(setRules, setLoading, setError)();
  }, []);

  const handleDelete = async (ruleId: string) => {
    if (confirm("Are you sure you want to deactivate this automation rule?")) {
      try {
        await api(`/api/automation-rules/${ruleId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchAutomationRules(setRules, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to deactivate automation rule");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Automation & Workflows</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Add Automation Rule
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
                  checked={selectedRules.length === rules.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRules(rules.map((r) => r.id));
                    } else {
                      setSelectedRules([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Trigger</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Action</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={(e) =>
                      setSelectedRules(
                        e.target.checked
                          ? [...selectedRules, rule.id]
                          : selectedRules.filter((id) => id !== rule.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{rule.name}</td>
                <td>
                  {rule.trigger === "product_update"
                    ? "Product Update"
                    : rule.trigger === "order_placed"
                      ? "Order Placed"
                      : rule.trigger === "stock_change"
                        ? "Stock Change"
                        : "Customer Registration"}
                </td>
                <td>
                  {rule.action === "email_notify"
                    ? "Email Notify"
                    : rule.action === "webhook"
                      ? "Webhook"
                      : rule.action === "api_call"
                        ? "API Call"
                        : "Database Update"}
                </td>
                <td>
                  <span
                    className={
                      rule.is_active
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {rule.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{rule.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No automation rules found. Add your first rule.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRules.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedRules.length} rule{'s' + (selectedRules.length > 1 ? 's' : '')} selected
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
                selectedRules.forEach((id) => handleDelete(id));
                setSelectedRules([]);
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
            {editing ? "Edit Automation Rule" : "Add Automation Rule"}
          </h2>
          <p>Automation rule form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}