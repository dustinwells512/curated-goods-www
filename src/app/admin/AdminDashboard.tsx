import { getSupabase } from "@/lib/supabase";
import ProspectList from "./ProspectList";
import LogoutButton from "./LogoutButton";

export type Prospect = {
  id: string;
  form_id: string;
  site_id: string;
  values: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    item?: string;
    timeline?: string;
    type?: string;
  };
  metadata: {
    timeOnPage?: number;
    ip?: string;
    geo?: {
      country?: string;
      countryCode?: string;
      region?: string;
      city?: string;
      isp?: string;
      proxy?: boolean;
      hosting?: boolean;
    } | null;
    emailDomain?: string;
    isFreeEmail?: boolean;
    isDisposableEmail?: boolean;
    isDuplicate?: boolean;
    duplicateCount?: number;
    fraudFlag?: "green" | "yellow" | "red";
    fraudScore?: number;
    fraudReasons?: string[];
    visitCount?: number;
    firstVisit?: string;
  } | null;
  created_at: string;
  meta_status: string | null;
  meta_notes: string | null;
  meta_risk: string | null;
};

const TIMELINE_LABELS: Record<string, string> = {
  "ready-now": "Ready now",
  "within-30-days": "Within 30 days",
  "1-3-months": "1-3 months",
  "just-researching": "Researching",
};

export { TIMELINE_LABELS };

export default async function AdminDashboard() {
  const supabase = getSupabase();

  const { data: submissions, error } = await supabase
    .schema("forms")
    .from("submissions")
    .select("*")
    .eq("site_id", "curated-goods")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-warm-50">
        <div className="bg-warm-800 text-white px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Curated Goods — Admin</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-red-600">Error loading submissions: {error.message}</p>
        </div>
      </div>
    );
  }

  // Fetch meta for all submissions
  const ids = (submissions ?? []).map((s) => s.id);
  const { data: metas } = ids.length
    ? await supabase
        .schema("forms")
        .from("submission_meta")
        .select("*")
        .in("submission_id", ids)
    : { data: [] };

  const metaMap = new Map(
    (metas ?? []).map((m) => [m.submission_id, m])
  );

  const prospects: Prospect[] = (submissions ?? []).map((s) => {
    const meta = metaMap.get(s.id);
    return {
      ...s,
      meta_status: meta?.status ?? "new",
      meta_notes: meta?.notes ?? null,
      meta_risk: meta?.risk_override ?? null,
    };
  });

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="bg-warm-800 text-white px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Curated Goods — Prospects</h1>
        <LogoutButton />
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ProspectList prospects={prospects} />
      </div>
    </div>
  );
}
