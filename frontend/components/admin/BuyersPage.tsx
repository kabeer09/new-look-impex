"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface BuyerCompany {
  id: string;
  name: string;
  contact_person?: string | null;
  email: string;
  phone?: string | null;
  country?: string | null;
  company_type?: "buyer" | "company" | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
}

interface BuyerCompanyFormValues {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  company_type: "buyer" | "company";
  is_active: boolean;
  sort_order: number;
}

function fetchBuyers(setBuyers: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<BuyerCompany[]>("/api/buyers", {
        method: "GET",
      });
      setBuyers(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load buyers & companies");
    } finally {
      setLoading(false);
    }
  };
}

export function BuyersPage() {
  const [buyers, setBuyers] = useState<BuyerCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<BuyerCompany | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const navigate = useSearchParams();

  useEffect(() => {
    fetchBuyers(setBuyers, setLoading, setError)();
  }, []);

  const handleDelete = async (buyerId: string) => {
    if (confirm("Are you sure you want to archive this buyer/company?")) {
      try {
        await api(`/api/buyers/${buyerId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchBuyers(setBuyers, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to archive buyer/company");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Buyers & Companies</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Add Buyer/Company
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
                  checked={selectedBuyers.length === buyers.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBuyers(buyers.map((b) => b.id));
                    } else {
                      setSelectedBuyers([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Contact Person</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Email</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Phone</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Country</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Sort Order</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {buyers.map((buyer) => (
              <tr key={buyer.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedBuyers.includes(buyer.id)}
                    onChange={(e) =>
                      setSelectedBuyers(
                        e.target.checked
                          ? [...selectedBuyers, buyer.id]
                          : selectedBuyers.filter((id) => id !== buyer.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{buyer.name}</td>
                <td>{buyer.contact_person || "—"}</td>
                <td>{buyer.email}</td>
                <td>{buyer.phone || "—"}</td>
                <td>{buyer.country || "—"}</td>
                <td>
                  <span
                    className={
                      buyer.company_type === "buyer"
                        ? "bg-blue-100 text-blue-800 text-xs font-medium me-2"
                        : buyer.company_type === "company"
                          ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                          : "bg-gray-100 text-gray-800 text-xs font-medium"
                    }
                  >
                    {buyer.company_type || "—"}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      buyer.is_active
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {buyer.is_active ? "Active" : "Archived"}
                  </span>
                </td>
                <td>{buyer.sort_order}</td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingBuyer(buyer)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(buyer.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {buyers.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-muted-foreground py-8">
                  No buyers/companies found. Add your first entry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedBuyers.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedBuyers.length} entry{'s' + (selectedBuyers.length > 1 ? 's' : '')} selected
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
                selectedBuyers.forEach((id) => handleDelete(id));
                setSelectedBuyers([]);
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
            {editing ? "Edit Buyer/Company" : "Add Buyer/Company"}
          </h2>
          <p>Buyer/company form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}