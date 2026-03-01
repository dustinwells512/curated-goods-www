"use client";

import { useState } from "react";
import type { Prospect } from "./AdminDashboard";
import ProspectRow from "./ProspectRow";

type Filter =
  | null
  | "new"
  | "contacted"
  | "interested"
  | "closed";

export default function ProspectList({ prospects: initial }: { prospects: Prospect[] }) {
  const [prospects, setProspects] = useState(initial);
  const [filter, setFilter] = useState<Filter>(null);

  const handleDelete = (id: string) => {
    setProspects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setProspects((prev) =>
      prev.map((p) => p.id === id ? { ...p, meta_status: newStatus } : p)
    );
  };

  const statusCounts = { new: 0, contacted: 0, interested: 0, closed: 0 };
  for (const p of prospects) {
    const s = (p.meta_status ?? "new") as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s]++;
  }

  const filtered = filter
    ? prospects.filter((p) => (p.meta_status ?? "new") === filter)
    : prospects;

  function card(
    label: string,
    value: number,
    key: Filter,
    color?: string,
  ) {
    const active = filter === key;
    return (
      <div
        className={`bg-white p-5 rounded-lg text-center shadow-sm cursor-pointer border-2 transition-all select-none ${
          active ? "border-accent shadow-md" : "border-transparent hover:shadow-md"
        }`}
        onClick={() => setFilter(active ? null : key)}
      >
        <div className="text-3xl font-bold" style={color ? { color } : { color: "#2c5545" }}>
          {value}
        </div>
        <div className="text-xs text-warm-500 uppercase mt-1">{label}</div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-4 mb-6">
        {card("Total", prospects.length, null)}
        {card("New", statusCounts.new, "new", "#0c5460")}
        {card("Contacted", statusCounts.contacted, "contacted", "#856404")}
        {card("Interested", statusCounts.interested, "interested", "#155724")}
        {card("Closed", statusCounts.closed, "closed", "#383d41")}
      </div>

      {filter && (
        <div className="inline-flex items-center gap-2 bg-warm-100 text-warm-700 px-3 py-1.5 rounded-full text-sm mb-4">
          Showing: <strong>{filter}</strong>
          <button
            onClick={() => setFilter(null)}
            className="bg-transparent border-none text-warm-400 cursor-pointer text-xs px-1 hover:text-red-500"
          >
            Clear
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-warm-400">
          <p>{filter ? `No ${filter} submissions.` : "No submissions yet. Inquiries will appear here."}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Risk</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Email</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Phone</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Item</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Timeline</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Message</th>
                <th className="text-left px-4 py-3 border-b-2 border-warm-100 text-xs uppercase text-warm-400 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProspectRow key={p.id} prospect={p} onDelete={handleDelete} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
