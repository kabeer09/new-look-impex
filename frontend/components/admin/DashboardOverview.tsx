"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

export function DashboardOverview() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const res = await api<any>("/admin/dashboard/metrics", {
          method: "GET",
        });
        setMetrics(res);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch dashboard metrics");
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 py-8">
        <div className="rounded-lg bg-secondary/20 p-6 text-center">
          <svg className="mx-auto mb-3 h-12 w-12 opacity-50" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M12 6v6l4 4m4-4v6l4 4m-4-4v6l4 4m-4-4v6l4 4m0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0-12a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm.664 6.146L8.943 9.825a2 2 0 0 1 1.276-.829l.615.615a2 2 0 0 1 .829 1.275l-2.526 2.526a2 2 0 0 1-1.275.829L4.976 17.7a2 2 0 0 1-1.275.828l-.615-.615a2 2 0 0 1-.829-1.275L2.226 8.125a2 2 0 0 1 1.276-.828l2.526-2.526z" />
          </svg>
          <p className="mt-2 text-sm text-muted-foreground">Loading dashboard data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-error/10 p-6 text-center">
        <p className="text-sm font-medium text-error">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">Dashboard metrics unavailable</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-2 gap-4 py-8">
        <div className="rounded-lg bg-secondary/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-medium"></p>
        </div>
        <div className="rounded-lg bg-secondary/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">Active Products</p>
          <p className="text-2xl font-medium"></p>
        </div>
        <div className="rounded-lg bg-secondary/20 p-4 text-center">
          <p className="text-sm text-muted-forecast">Draft Products</p>
          <p className="text-2xl font-medium"></p>
        </div>
        <div className="rounded-lg bg-secondary/20 p-4 text-center">
          <p className="text-sm text-muted-forecast">Missing Images</p>
          <p className="text-2xl font-medium"></p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Total Products</p>
        <p className="text-3xl font-bold">{metrics?.totalProducts || 0}</p>
        <p className="text-sm text-muted-foreground">133 in catalogue</p>
      </div>
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Active Products</p>
        <p className="text-3xl font-bold">{metrics?.activeProducts || 0}</p>
        <p className="text-sm text-muted-foreground">Currently listed</p>
      </div>
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Draft Products</p>
        <p className="text-3xl font-bold">{metrics?.draftProducts || 0}</p>
        <p className="text-sm text-muted-foreground">Pending review</p>
      </div>
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-forecast">Missing Images</p>
        <p className="text-3xl font-bold">{metrics?.missingImages || 0}</p>
        <p className="text-sm text-muted-foreground">Need product photos</p>
      </div>
    </div>
  );
}