"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminSigninPage() {
  const { data, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await signIn("google", {
        callbackUrl: "/admin/overview",
      });
    } catch (error) {
      setError("Sign in failed. Please try again.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn("google", {
        callbackUrl: "/admin/overview",
      });
    } catch (error) {
      setError("Sign in failed. Please try again.");
    }
  };

  // Type-safe status check
  const isLoading = status === "loading";
  const isUnauthenticated = status === "unauthenticated";
  const isAuthenticated = status === "authenticated";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6 mt-20 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-indigo-600 mb-4">Admin Sign In</h2>
          <p className="text-gray-600 text-sm mb-8">Sign in to access the admin dashboard</p>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span>Loading session...</span>
            </div>
          ) : isUnauthenticated ? (
            <div>
              {error ? (
                <div className="bg-red-100 text-red-800 p-4 rounded mb-8">
                  <p>{error}</p>
                </div>
              ) : null}
              <button
                onClick={handleSignIn}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded hover:bg-indigo-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Continue with Google"}
              </button>
            </div>
          ) : isAuthenticated ? (
            <div>
              <p className="text-green-600 mb-8">Welcome! Redirecting to dashboard...</p>
              <button
                onClick={() => router.push("/admin/overview")}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-8">Unknown session state</p>
              <button onClick={handleSignIn} className="w-full bg-indigo-600 text-white py-3 px-4 rounded">
                Continue with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}