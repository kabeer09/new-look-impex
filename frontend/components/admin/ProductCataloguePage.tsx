"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { setAuthFailureCategory, getAuthFailureCategory } from "@/lib/api";

interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  category?: string | null;
  material?: string | null;
  price: string;
  status: "published" | "draft";
  featured: boolean;
  images: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
}

interface ProductFormValues {
  name: string;
  slug: string;
  sku: string;
  category: string;
  material: string;
  price: string;
  status: "published" | "draft";
  featured: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
}

function fetchProducts(productsSetter: any, setLoading: any, setError: any) {
  return async () => {
    try {
      setLoading(true);
      const res = await api<Product[]>("api/products", {
        method: "GET",
      });
      productsSetter(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };
}

export function ProductCataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts(setProducts, setLoading, setError)();
  }, []);

  const handleDelete = async (productId: string) => {
    if (confirm("Are you sure you want to archive this product?")) {
      try {
        await api(`/api/products/${productId}`, {
          method: "DELETE",
        });
        setAuthFailureCategory("none");
        fetchProducts(setProducts, setLoading, setError)();
      } catch (err: any) {
        setAuthFailureCategory("invalid_credentials");
        setError(err.message || "Failed to archive product");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-lg">Products & Catalogue</h2>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          Create Product
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
                  checked={selectedProducts.length === products.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProducts(products.map((p) => p.id));
                    } else {
                      setSelectedProducts([]);
                    }
                  }}
                />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left text-xs font-medium text-muted-foreground">SKU</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Price</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={(e) =>
                      setSelectedProducts(
                        e.target.checked
                          ? [...selectedProducts, product.id]
                          : selectedProducts.filter((id) => id !== product.id)
                      )
                    }
                  />
                </td>
                <td className="font-medium">{product.name}</td>
                <td>{product.sku || "—"}</td>
                <td>{product.category || "—"}</td>
                <td>{product.price}</td>
                <td>
                  <span
                    className={
                      product.status === "published"
                        ? "bg-green-100 text-green-800 text-xs font-medium me-2"
                        : "bg-yellow-100 text-yellow-800 text-xs font-medium"
                    }
                  >
                    {product.status}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 text-sm font-medium hover:underline ml-2"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">
                  No products found. Create your first product.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedProducts.length > 0 && (
        <div className="mt-6 p-4 bg-secondary/10 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {selectedProducts.length} product{'s' + (selectedProducts.length > 1 ? 's' : '')} selected
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="btn btn-sm btn-primary"
            >
              Bulk Update Prices
            </button>
            <button
              onClick={() => {
                selectedProducts.forEach((id) => handleDelete(id));
                setSelectedProducts([]);
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
          <h2 className="text-xl font-bold mb-4">Product Form</h2>
          <p>Product form modal - under construction</p>
          <button type="button" onClick={() => setModalOpen(false)} className="mt-4 btn btn-ghost">
            Cancel
          </button>
        </div>
      )}
    </>
  );
}