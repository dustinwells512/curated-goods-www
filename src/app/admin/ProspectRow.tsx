"use client";

import { useState, useRef, useCallback } from "react";
import type { Prospect } from "./AdminDashboard";
import { TIMELINE_LABELS } from "./AdminDashboard";

const STATUSES = ["new", "contacted", "interested", "closed"] as const;
const RISK_LEVELS = ["green", "yellow", "red"] as const;
const RISK_LABELS: Record<string, string> = { green: "OK", yellow: "Caution", red: "Risk" };

const RISK_COLORS: Record<string, { text: string; border: string }> = {
  green: { text: "#28a745", border: "#28a745" },
  yellow: { text: "#856404", border: "#ffc107" },
  red: { text: "#dc3545", border: "#dc3545" },
};

export default function ProspectRow({
  prospect,
  onDelete,
  onStatusChange,
}: {
  prospect: Prospect;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: string) => void;
}) {
  const autoRisk = prospect.metadata?.fraudFlag ?? "green";
  const [status, setStatus] = useState(prospect.meta_status ?? "new");
  const [risk, setRisk] = useState(prospect.meta_risk ?? autoRisk);
  const [notes, setNotes] = useState(prospect.meta_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (newStatus: string, newNotes: string, newRisk?: string) => {
      setSaving(true);
      setSaved(false);

      const body: Record<string, string> = { status: newStatus, notes: newNotes };
      if (newRisk !== undefined) body.risk = newRisk;

      await fetch(`/api/admin/submissions/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [prospect.id]
  );

  const debouncedSaveNotes = useCallback(
    (newNotes: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => save(status, newNotes), 800);
    },
    [status, save]
  );

  const date = new Date(prospect.created_at);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const meta = prospect.metadata;
  const fraudReasons = meta?.fraudReasons ?? [];
  const geo = meta?.geo;
  const timeOnPage = meta?.timeOnPage;
  const visitCount = meta?.visitCount;
  const firstVisit = meta?.firstVisit;
  const timeline = prospect.values.timeline;
  const item = prospect.values.item;

  const riskStyle = RISK_COLORS[risk] ?? RISK_COLORS.green;

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-warm-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm whitespace-nowrap text-warm-600" style={{ fontSize: "0.8rem" }}>
          {dateStr}
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <select
            className="px-2 py-1 border rounded-md text-xs font-semibold bg-white cursor-pointer"
            style={{ color: riskStyle.text, borderColor: riskStyle.border }}
            value={risk}
            title={fraudReasons.join("\n")}
            onChange={(e) => {
              setRisk(e.target.value);
              save(status, notes, e.target.value);
            }}
          >
            {RISK_LEVELS.map((r) => (
              <option key={r} value={r}>
                {RISK_LABELS[r]}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-warm-800">
          {prospect.values.name ?? ""}
        </td>
        <td className="px-4 py-3 text-sm">
          <a href={`mailto:${prospect.values.email}`} className="text-accent hover:text-accent-light">
            {prospect.values.email}
          </a>
          {meta?.emailDomain && (
            <div className="text-xs text-warm-400 mt-0.5">
              {meta.isDisposableEmail ? "Disposable" : meta.isFreeEmail ? "Free email" : meta.emailDomain}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-warm-600">
          {prospect.values.phone ?? ""}
        </td>
        <td className="px-4 py-3 text-sm text-warm-600 whitespace-nowrap">
          {item ?? "--"}
        </td>
        <td className="px-4 py-3 text-sm text-warm-600 whitespace-nowrap">
          {timeline ? TIMELINE_LABELS[timeline] || timeline : "--"}
        </td>
        <td className="px-4 py-3 text-sm text-warm-600 max-w-[200px] truncate">
          {prospect.values.message ?? ""}
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <select
            className="px-2 py-1.5 border border-warm-200 rounded-md text-sm bg-white cursor-pointer focus:outline-none focus:border-accent"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              save(e.target.value, notes);
              onStatusChange(prospect.id, e.target.value);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} className="px-4 pb-4 border-b border-warm-100">
            <div className="flex flex-col gap-3 pt-1">
              {/* Intel section */}
              <div>
                <span className="inline-block text-[0.7rem] font-semibold uppercase text-warm-400 tracking-wide mb-1">
                  Intel
                </span>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {geo && (
                    <span className="text-xs text-warm-500">
                      {[geo.city, geo.region, geo.countryCode].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {geo?.isp && <span className="text-xs text-warm-500">{geo.isp}</span>}
                  {geo?.proxy && <span className="text-xs text-red-600 font-medium">VPN/Proxy</span>}
                  {geo?.hosting && <span className="text-xs text-red-600 font-medium">Datacenter IP</span>}
                  {timeOnPage !== undefined && (
                    <span className="text-xs text-warm-500">
                      {timeOnPage < 60 ? `${timeOnPage}s` : `${Math.floor(timeOnPage / 60)}m ${timeOnPage % 60}s`} on page
                    </span>
                  )}
                  {visitCount !== undefined && visitCount > 1 && (
                    <span className="text-xs text-green-700">
                      {visitCount} visits{firstVisit ? ` (first: ${new Date(firstVisit).toLocaleDateString("en-US", { month: "short", day: "numeric" })})` : ""}
                    </span>
                  )}
                  {visitCount !== undefined && visitCount <= 1 && (
                    <span className="text-xs text-warm-500">1st visit</span>
                  )}
                  {meta?.isDuplicate && (
                    <span className="text-xs text-yellow-700 font-medium">
                      Repeat ({meta.duplicateCount} prev)
                    </span>
                  )}
                  {fraudReasons.length > 0 && risk !== "green" && (
                    <span
                      className="text-xs italic"
                      style={{ color: risk === "red" ? "#dc3545" : "#856404" }}
                    >
                      {fraudReasons.join("; ")}
                    </span>
                  )}
                  {item && (
                    <span className="text-xs text-warm-500">
                      Inquired about: <strong>{item}</strong>
                    </span>
                  )}
                  {!geo && timeOnPage === undefined && risk === "green" && (
                    <span className="text-xs text-warm-300">No intel available</span>
                  )}
                </div>
              </div>

              {/* Full message */}
              {prospect.values.message && (
                <div>
                  <span className="inline-block text-[0.7rem] font-semibold uppercase text-warm-400 tracking-wide mb-1">
                    Full Message
                  </span>
                  <p className="text-sm text-warm-700 whitespace-pre-wrap bg-warm-50 rounded-md p-3">
                    {prospect.values.message}
                  </p>
                </div>
              )}

              {/* Notes section */}
              <div className="relative">
                <span className="inline-block text-[0.7rem] font-semibold uppercase text-warm-400 tracking-wide mb-1">
                  Notes
                </span>
                <textarea
                  className="w-full min-w-[280px] px-3 py-2 border border-warm-200 rounded-md text-sm font-[inherit] resize-y min-h-[100px] leading-relaxed focus:outline-none focus:border-accent"
                  value={notes}
                  placeholder="Add notes..."
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    debouncedSaveNotes(e.target.value);
                  }}
                />
                {saving && <div className="text-xs text-warm-400 mt-1">Saving...</div>}
                {saved && <div className="text-xs text-accent mt-1">Saved</div>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {!confirmDelete ? (
                  <button
                    className="px-3 py-1.5 border border-warm-200 rounded-md text-xs cursor-pointer bg-white text-warm-400 hover:border-red-500 hover:text-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(true);
                    }}
                  >
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-red-600 font-semibold" onClick={(e) => e.stopPropagation()}>
                    <span>Are you sure?</span>
                    <button
                      className="px-3 py-1.5 bg-red-600 text-white border border-red-600 rounded-md text-xs cursor-pointer hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        await fetch(`/api/admin/submissions/${prospect.id}`, {
                          method: "DELETE",
                        });
                        onDelete(prospect.id);
                      }}
                    >
                      {deleting ? "Deleting..." : "Yes, delete"}
                    </button>
                    <button
                      className="px-3 py-1.5 border border-warm-200 rounded-md text-xs cursor-pointer bg-white text-warm-500"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
