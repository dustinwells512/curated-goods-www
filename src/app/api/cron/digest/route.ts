import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const RISK_LABELS: Record<string, string> = {
  green: "OK",
  yellow: "Caution",
  red: "Risk",
};

const TIMELINE_LABELS: Record<string, string> = {
  "ready-now": "Ready now",
  "within-30-days": "Within 30 days",
  "1-3-months": "1-3 months",
  "just-researching": "Researching",
};

const ITEM_DISPLAY_NAMES: Record<string, string> = {
  "sprinter-van": "Mercedes Sprinter Van",
  piano: "Steinway Grand Piano",
  "dining-table": "Dining Table",
  bookshelf: "Mid-Century Bookshelf",
  "accent-chair": "Leather Accent Chair",
  "desk-lamp": "Brass Desk Lamp",
};

// Brand colors
const ACCENT = "#2c5545";
const ACCENT_LIGHT = "#3a7a60";
const RISK_COLORS: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};
const RISK_BG: Record<string, string> = {
  green: "#dcfce7",
  yellow: "#fef9c3",
  red: "#fee2e2",
};
const RISK_TEXT: Record<string, string> = {
  green: "#166534",
  yellow: "#854d0e",
  red: "#991b1b",
};

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or with the right secret)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Get submissions from the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: submissions, error } = await supabase
    .schema("forms")
    .from("submissions")
    .select("*")
    .eq("site_id", "curated-goods")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Digest query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get reply drafts created in the last 24 hours
  const { data: replyDrafts } = await supabase
    .schema("forms")
    .from("reply_drafts")
    .select("*")
    .eq("site_id", "curated-goods")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const draftCount = replyDrafts?.length ?? 0;
  const submissionCount = submissions?.length ?? 0;

  if (submissionCount === 0 && draftCount === 0) {
    return NextResponse.json({ sent: false, reason: "No new activity" });
  }

  // Fetch meta for these submissions
  const ids = (submissions ?? []).map((s) => s.id);
  const { data: metas } =
    ids.length > 0
      ? await supabase
          .schema("forms")
          .from("submission_meta")
          .select("*")
          .in("submission_id", ids)
      : { data: [] };

  const metaMap = new Map(
    (metas ?? []).map((m) => [m.submission_id, m])
  );

  // Get total count for context
  const { count: totalCount } = await supabase
    .schema("forms")
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("site_id", "curated-goods");

  // Build the digest
  const riskCounts = { green: 0, yellow: 0, red: 0 };
  const textRows: string[] = [];
  const htmlRows: string[] = [];

  for (const s of submissions ?? []) {
    const meta = metaMap.get(s.id);
    const risk = (meta?.risk_override ??
      s.metadata?.fraudFlag ??
      "green") as keyof typeof riskCounts;
    if (risk in riskCounts) riskCounts[risk]++;

    const name = s.values?.name ?? "Unknown";
    const email = s.values?.email ?? "";
    const phone = s.values?.phone ?? "";
    const itemSlug = s.values?.item ?? "";
    const itemName = getItemDisplayName(itemSlug);
    const timeline = s.values?.timeline ?? "";
    const message = s.values?.message ?? "";
    const visitCount = s.metadata?.visitCount;
    const timeOnPage = s.metadata?.timeOnPage;
    const geo = s.metadata?.geo;
    const location = geo
      ? [geo.city, geo.region].filter(Boolean).join(", ")
      : "";

    // Text row
    textRows.push(
      `${RISK_LABELS[risk] ?? risk} | ${name} | ${email}` +
        (phone ? ` | ${phone}` : "") +
        ` | ${itemName}` +
        (timeline ? ` | ${TIMELINE_LABELS[timeline] ?? timeline}` : "") +
        (location ? ` | ${location}` : "") +
        (visitCount && visitCount > 1 ? ` | ${visitCount} visits` : "")
    );

    // HTML row
    const riskColor = RISK_COLORS[risk] ?? RISK_COLORS.green;
    const msgPreview =
      message.length > 80 ? message.slice(0, 80) + "..." : message;

    htmlRows.push(`
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece8;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${riskColor};margin-right:6px;vertical-align:middle;"></span>
          <span style="color:${riskColor};font-weight:600;font-size:13px;vertical-align:middle;">${escapeHtml(RISK_LABELS[risk] ?? risk)}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece8;">
          <div style="font-weight:600;color:#1a1a1a;">${escapeHtml(name)}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">
            <a href="mailto:${escapeHtml(email)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(email)}</a>
            ${phone ? `<br>${escapeHtml(phone)}` : ""}
          </div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece8;font-size:13px;color:#555;">
          <div style="font-weight:600;color:#333;">${escapeHtml(itemName)}</div>
          ${timeline ? `<div style="font-size:12px;color:#888;margin-top:2px;">${escapeHtml(TIMELINE_LABELS[timeline] ?? timeline)}</div>` : ""}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece8;font-size:13px;color:#666;max-width:200px;">
          ${escapeHtml(msgPreview)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ece8;font-size:12px;color:#999;">
          ${location ? escapeHtml(location) : "&mdash;"}
          ${visitCount && visitCount > 1 ? `<br>${visitCount} visits` : ""}
          ${timeOnPage ? `<br>${timeOnPage}s on page` : ""}
        </td>
      </tr>
    `);
  }

  // Build draft reply rows
  const draftHtmlRows: string[] = [];
  const draftTextLines: string[] = [];
  for (const d of replyDrafts ?? []) {
    const time = new Date(d.created_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Denver",
    });
    const snippet = d.reply_snippet
      ? d.reply_snippet.length > 60
        ? d.reply_snippet.slice(0, 60) + "..."
        : d.reply_snippet
      : "";
    const typeLabel = d.reply_type === "first" ? "First reply" : "Follow-up";
    const typeColor = d.reply_type === "first" ? "#22c55e" : ACCENT;
    draftHtmlRows.push(`
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;color:${typeColor};font-weight:600;font-size:13px;">${typeLabel}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;font-weight:600;">${escapeHtml(d.from_name ?? "")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;">
          <a href="mailto:${escapeHtml(d.from_email)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(d.from_email)}</a>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;font-size:13px;color:#666;">${escapeHtml(snippet)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece8;font-size:12px;color:#999;">${time}</td>
      </tr>
    `);
    draftTextLines.push(
      `  - [${typeLabel}] ${d.from_name ?? ""} <${d.from_email}>${snippet ? `: "${snippet}"` : ""}`
    );
  }

  // Build subject line
  const firstDrafts = (replyDrafts ?? []).filter(
    (d) => d.reply_type === "first"
  ).length;
  const followUpDrafts = draftCount - firstDrafts;
  const subjectParts: string[] = [];
  if (submissionCount > 0)
    subjectParts.push(
      `${submissionCount} new lead${submissionCount === 1 ? "" : "s"}`
    );
  if (firstDrafts > 0)
    subjectParts.push(
      `${firstDrafts} first repl${firstDrafts === 1 ? "y" : "ies"}`
    );
  if (followUpDrafts > 0)
    subjectParts.push(
      `${followUpDrafts} follow-up${followUpDrafts === 1 ? "" : "s"}`
    );
  const subject = `Curated Goods: ${subjectParts.join(", ")} today`;

  // Admin dashboard URL
  const dashboardUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/admin`
      : "https://curated-goods-www.vercel.app/admin";

  // --- HTML Email ---

  // Submissions section
  const submissionsHtml =
    submissionCount > 0
      ? `
  <div style="margin-bottom:32px;">
    <h3 style="margin:0 0 6px 0;font-size:18px;color:#1a1a1a;font-weight:700;">New Leads</h3>
    <p style="color:#888;margin:0 0 16px 0;font-size:14px;">
      ${submissionCount} new lead${submissionCount === 1 ? "" : "s"} in the last 24 hours
      &bull; ${totalCount ?? "?"} total all-time
    </p>

    <!-- Risk summary pills -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding-right:10px;">
          <div style="background:${RISK_BG.green};padding:8px 18px;border-radius:8px;text-align:center;border:1px solid #bbf7d0;">
            <div style="font-size:22px;font-weight:700;color:${RISK_COLORS.green};">${riskCounts.green}</div>
            <div style="font-size:11px;color:${RISK_TEXT.green};text-transform:uppercase;letter-spacing:0.5px;">Clean</div>
          </div>
        </td>
        ${
          riskCounts.yellow > 0
            ? `
        <td style="padding-right:10px;">
          <div style="background:${RISK_BG.yellow};padding:8px 18px;border-radius:8px;text-align:center;border:1px solid #fde68a;">
            <div style="font-size:22px;font-weight:700;color:${RISK_COLORS.yellow};">${riskCounts.yellow}</div>
            <div style="font-size:11px;color:${RISK_TEXT.yellow};text-transform:uppercase;letter-spacing:0.5px;">Caution</div>
          </div>
        </td>`
            : ""
        }
        ${
          riskCounts.red > 0
            ? `
        <td>
          <div style="background:${RISK_BG.red};padding:8px 18px;border-radius:8px;text-align:center;border:1px solid #fecaca;">
            <div style="font-size:22px;font-weight:700;color:${RISK_COLORS.red};">${riskCounts.red}</div>
            <div style="font-size:11px;color:${RISK_TEXT.red};text-transform:uppercase;letter-spacing:0.5px;">Flagged</div>
          </div>
        </td>`
            : ""
        }
      </tr>
    </table>

    <!-- Leads table -->
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9f7f4;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Risk</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Contact</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Item / Timeline</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Message</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Intel</th>
        </tr>
      </thead>
      <tbody>
        ${htmlRows.join("")}
      </tbody>
    </table>
  </div>`
      : "";

  // Reply drafts section
  const draftsHtml =
    draftCount > 0
      ? `
  <div style="margin-bottom:32px;">
    <h3 style="margin:0 0 6px 0;font-size:18px;color:#1a1a1a;font-weight:700;">Reply Drafts</h3>
    <p style="color:#888;margin:0 0 16px 0;font-size:14px;">
      ${draftCount} draft response${draftCount === 1 ? " was" : "s were"} auto-created from prospect replies.
      <a href="https://mail.google.com/mail/u/0/#drafts" style="color:${ACCENT};font-weight:600;text-decoration:none;">Review in Gmail Drafts &rarr;</a>
    </p>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f9f7f4;">
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Type</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Name</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Email</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Their Reply</th>
          <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;border-bottom:2px solid #e8e3dc;text-transform:uppercase;letter-spacing:0.5px;">Time</th>
        </tr>
      </thead>
      <tbody>
        ${draftHtmlRows.join("")}
      </tbody>
    </table>
  </div>`
      : "";

  // Full HTML email body
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:${ACCENT};border-radius:12px 12px 0 0;padding:24px 28px;">
      <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;letter-spacing:-0.3px;">Curated Goods</h1>
      <p style="margin:4px 0 0 0;font-size:14px;color:rgba(255,255,255,0.7);">Daily Digest</p>
    </div>

    <!-- Content -->
    <div style="background:#ffffff;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e8e3dc;border-top:none;">

      ${submissionsHtml}
      ${draftsHtml}

      <!-- CTA Button -->
      <div style="text-align:center;margin:28px 0 8px 0;">
        <a href="${dashboardUrl}"
           style="display:inline-block;background:${ACCENT};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-0.2px;">
          Open Admin Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px 0 8px 0;">
      <p style="font-size:12px;color:#aaa;margin:0;">
        Curated Goods &mdash; Daily Digest &bull; Sent at 8:00 AM MT
      </p>
    </div>

  </div>
</body>
</html>`;

  // Plain text fallback
  const textBody = `Curated Goods -- Daily Digest
${
  submissionCount > 0
    ? `${submissionCount} new lead${submissionCount === 1 ? "" : "s"} in the last 24 hours (${totalCount ?? "?"} total)\n\n${textRows.join("\n")}`
    : "No new leads."
}
${draftCount > 0 ? `\n${draftCount} draft reply${draftCount === 1 ? "" : "s"} created:\n${draftTextLines.join("\n")}` : ""}

View all: ${dashboardUrl}`;

  // Send via SendGrid
  const sgKey = process.env.SENDGRID_API_KEY;
  if (!sgKey) {
    return NextResponse.json({
      sent: false,
      reason: "SENDGRID_API_KEY not set",
    });
  }

  const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sgKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: "dustin@dustinwells.com", name: "Dustin Wells" }],
        },
      ],
      from: { email: "dustin@dustinwells.com", name: "Curated Goods" },
      subject,
      content: [
        { type: "text/plain", value: textBody },
        { type: "text/html", value: htmlBody },
      ],
    }),
  });

  return NextResponse.json({
    sent: true,
    submissions: submissionCount,
    drafts: draftCount,
    sgStatus: sgRes.status,
  });
}

function getItemDisplayName(slug: string): string {
  if (!slug) return "General Inquiry";
  return ITEM_DISPLAY_NAMES[slug] ?? slug;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
