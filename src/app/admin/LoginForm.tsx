"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const password = new FormData(e.currentTarget).get("password") as string;

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      setError("Invalid password");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-center text-2xl font-semibold text-warm-800 mb-6">
          Curated Goods — Admin
        </h2>
        {error && (
          <p className="text-red-600 text-center text-sm mb-4">{error}</p>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            required
            autoFocus
            className="w-full px-4 py-3 border border-warm-200 rounded-lg text-base mb-4 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent text-white border-none rounded-lg text-base font-semibold cursor-pointer transition-colors hover:bg-accent-light disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}
