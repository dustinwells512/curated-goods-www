"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { items } from "@/data/items";
import { getVisitData } from "./VisitTracker";

export default function ContactForm({
  preselectedItem,
}: {
  preselectedItem?: string;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const loadTimeRef = useRef(Date.now());

  // Track page load time for time-on-page metric
  useEffect(() => {
    loadTimeRef.current = Date.now();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot check — if filled, silently "succeed"
    if (data.get("website")) {
      setStatus("success");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    const timeOnPage = Math.round((Date.now() - loadTimeRef.current) / 1000);
    const visitData = getVisitData();

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone") || "",
          items: data.getAll("items"),
          type: data.get("type") || "inquiry",
          message: data.get("message"),
          timeOnPage,
          visitCount: visitData.visitCount,
          firstVisit: visitData.firstVisit,
          referrer: document.referrer || "",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Submission failed");
      }

      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-green-900">
          Message Sent!
        </h3>
        <p className="mt-2 text-sm text-green-700">
          Thanks for reaching out. Check your inbox &mdash; I&apos;ve sent a
          follow-up with a couple of questions so we can prepare for our conversation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status === "error" && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-warm-700"
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="Your name"
            autoComplete="name"
            className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-warm-900 placeholder:text-warm-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-warm-700"
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-warm-900 placeholder:text-warm-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="mb-1.5 block text-sm font-medium text-warm-700"
        >
          Phone (optional)
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          placeholder="(555) 123-4567"
          autoComplete="tel"
          className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-warm-900 placeholder:text-warm-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-warm-700">
          Items of Interest
        </label>
        <div className="rounded-lg border border-warm-200 bg-white p-3 space-y-2">
          {items
            .filter((item) => item.status === "available" && !item.externalUrl)
            .map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-warm-900 transition-colors hover:bg-warm-50 cursor-pointer"
            >
              <input
                type="checkbox"
                name="items"
                value={item.id}
                defaultChecked={preselectedItem === item.id}
                className="h-4 w-4 rounded border-warm-300 text-accent focus:ring-accent"
              />
              <span>{item.title}</span>
              <span className="ml-auto text-xs text-warm-400">{item.price}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-warm-400">Select all that interest you</p>
      </div>

      <div>
        <label
          htmlFor="type"
          className="mb-1.5 block text-sm font-medium text-warm-700"
        >
          I&apos;d Like To
        </label>
        <select
          id="type"
          name="type"
          defaultValue="inquiry"
          className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-warm-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="inquiry">Ask a Question</option>
          <option value="offer">Make an Offer</option>
          <option value="purchase">Purchase These Items</option>
          <option value="schedule">Schedule a Viewing</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="message"
          className="mb-1.5 block text-sm font-medium text-warm-700"
        >
          Message *
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder="Tell me what you're interested in..."
          className="w-full rounded-lg border border-warm-200 bg-white px-4 py-2.5 text-sm text-warm-900 placeholder:text-warm-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Honeypot — hidden from real users */}
      <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-light disabled:opacity-50"
      >
        {status === "submitting" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
