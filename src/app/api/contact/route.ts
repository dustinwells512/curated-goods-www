import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { items } from "@/data/items";

type GeoData = {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  isp: string;
  proxy: boolean;
  hosting: boolean;
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com", "zoho.com", "yandex.com",
  "gmx.com", "live.com", "msn.com", "me.com", "mac.com",
]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "10minutemail.com", "trashmail.com", "sharklasers.com", "guerrillamailblock.com",
  "grr.la", "dispostable.com", "yopmail.com", "maildrop.cc",
]);


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, items: selectedItems, type, message, timeOnPage, visitCount, firstVisit, referrer } = body;
    // Normalize: support both legacy single "item" and new "items" array
    const itemsArray: string[] = Array.isArray(selectedItems)
      ? selectedItems
      : selectedItems
      ? [selectedItems]
      : body.item
      ? [body.item]
      : [];

    if (!name || !email || !message) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Get client IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Run fraud checks in parallel
    const [geoData, duplicateInfo] = await Promise.all([
      getGeoData(ip),
      checkDuplicates(email, phone),
    ]);

    // Analyze email domain
    const emailDomain = email.split("@")[1]?.toLowerCase() || "";
    const isFreeEmail = FREE_EMAIL_DOMAINS.has(emailDomain);
    const isDisposableEmail = DISPOSABLE_EMAIL_DOMAINS.has(emailDomain);

    // Calculate fraud score
    const fraud = calculateFraudScore({
      ip,
      geo: geoData,
      emailDomain,
      isFreeEmail,
      isDisposableEmail,
      isDuplicate: duplicateInfo.isDuplicate,
      duplicateCount: duplicateInfo.count,
      timeOnPage: timeOnPage || 0,
      message,
      type: type || "inquiry",
    });

    // Build enriched metadata
    const metadata = {
      submittedAt: new Date().toISOString(),
      referrer: referrer || "",
      timeOnPage: timeOnPage || 0,
      visitCount: visitCount || 1,
      firstVisit: firstVisit || null,
      ip,
      geo: geoData,
      emailDomain,
      isFreeEmail,
      isDisposableEmail,
      isDuplicate: duplicateInfo.isDuplicate,
      duplicateCount: duplicateInfo.count,
      fraudFlag: fraud.flag,
      fraudScore: fraud.score,
      fraudReasons: fraud.reasons,
    };

    // Insert into Supabase forms.submissions
    const supabase = getSupabase();
    const formId = process.env.FORM_ID || "curated-goods-contact";
    const siteId = process.env.SITE_ID || "curated-goods";

    const { data: submission, error: insertError } = await supabase
      .schema("forms")
      .from("submissions")
      .insert({
        form_id: formId,
        site_id: siteId,
        values: {
          name,
          email,
          phone: phone || "",
          message,
          items: itemsArray,
          type: type || "inquiry",
        },
        metadata,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ message: "Failed to save submission" }, { status: 500 });
    }

    const submissionId = submission.id;

    // Upsert into forms.submission_meta with status "new"
    await supabase.schema("forms").from("submission_meta").upsert(
      {
        submission_id: submissionId,
        site_id: siteId,
        status: "new",
        notes: fraud.flag === "red"
          ? `[AUTO] Flagged as high-risk: ${fraud.reasons.join(", ")}`
          : fraud.flag === "yellow"
          ? `[AUTO] Some concerns: ${fraud.reasons.join(", ")}`
          : null,
      },
      { onConflict: "submission_id" }
    );

    // Send auto-reply email (non-blocking -- don't fail the submission if email fails)
    sendAutoReply({ name, email, message, items: itemsArray, type: type || "inquiry" }).catch((e) =>
      console.error("Auto-reply failed:", e)
    );

    return NextResponse.json({ success: true, submissionId });
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Geo lookup
// ---------------------------------------------------------------------------

async function getGeoData(ip: string): Promise<GeoData | null> {
  if (ip === "unknown" || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.")) {
    return null;
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,countryCode,regionName,city,isp,proxy,hosting`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      country: data.country || "",
      countryCode: data.countryCode || "",
      region: data.regionName || "",
      city: data.city || "",
      isp: data.isp || "",
      proxy: data.proxy || false,
      hosting: data.hosting || false,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

async function checkDuplicates(
  email: string,
  phone: string
): Promise<{ isDuplicate: boolean; count: number }> {
  try {
    const supabase = getSupabase();
    const siteId = process.env.SITE_ID || "curated-goods";
    const { data, error } = await supabase
      .schema("forms")
      .from("submissions")
      .select("id")
      .eq("site_id", siteId)
      .or(`values->>email.eq.${email}${phone ? `,values->>phone.eq.${phone}` : ""}`);

    if (error) return { isDuplicate: false, count: 0 };
    return { isDuplicate: (data?.length || 0) > 0, count: data?.length || 0 };
  } catch {
    return { isDuplicate: false, count: 0 };
  }
}

// ---------------------------------------------------------------------------
// Fraud scoring
// ---------------------------------------------------------------------------

function calculateFraudScore(data: {
  ip: string;
  geo: GeoData | null;
  emailDomain: string;
  isFreeEmail: boolean;
  isDisposableEmail: boolean;
  isDuplicate: boolean;
  duplicateCount: number;
  timeOnPage: number;
  message: string;
  type: string;
}): { flag: "green" | "yellow" | "red"; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Disposable email: big red flag
  if (data.isDisposableEmail) {
    score += 40;
    reasons.push("Disposable email domain");
  }

  // Free email: slight bump (most legitimate buyers use gmail)
  if (data.isFreeEmail && !data.isDisposableEmail) {
    score += 5;
  }

  // Time on page: < 15 seconds is very suspicious for a listing page
  if (data.timeOnPage < 15) {
    score += 30;
    reasons.push(`Only ${data.timeOnPage}s on page before submitting`);
  } else if (data.timeOnPage < 60) {
    score += 10;
    reasons.push(`${data.timeOnPage}s on page (relatively quick)`);
  }

  // Duplicate submissions
  if (data.duplicateCount >= 3) {
    score += 25;
    reasons.push(`${data.duplicateCount} previous submissions from same contact`);
  } else if (data.isDuplicate) {
    score += 10;
    reasons.push("Repeat submission");
  }

  // Geo: outside US
  if (data.geo) {
    if (data.geo.proxy) {
      score += 30;
      reasons.push("Using proxy/VPN");
    }
    if (data.geo.hosting) {
      score += 35;
      reasons.push("Submitted from hosting/datacenter IP");
    }
    if (data.geo.countryCode && data.geo.countryCode !== "US") {
      score += 15;
      reasons.push(`Located in ${data.geo.country}`);
    }
  }

  // Message quality
  if (data.message.length < 10) {
    score += 15;
    reasons.push("Very short message");
  }

  // Suspicious content patterns
  const lowerMsg = data.message.toLowerCase();
  if (
    lowerMsg.includes("http://") ||
    lowerMsg.includes("https://") ||
    lowerMsg.includes("bitcoin") ||
    lowerMsg.includes("crypto") ||
    lowerMsg.includes("wire transfer")
  ) {
    score += 25;
    reasons.push("Suspicious content in message");
  }

  // Type-based scoring: "inquiry" with no item is lower signal
  if (data.type === "inquiry" && !data.message.trim()) {
    score += 5;
    reasons.push("Generic inquiry with no message detail");
  }

  // Determine flag
  let flag: "green" | "yellow" | "red";
  if (score >= 40) {
    flag = "red";
  } else if (score >= 15) {
    flag = "yellow";
  } else {
    flag = "green";
  }

  if (flag === "green" && reasons.length === 0) {
    reasons.push("No concerns detected");
  }

  return { flag, score, reasons };
}

// ---------------------------------------------------------------------------
// Auto-reply email via SendGrid
// ---------------------------------------------------------------------------

async function sendAutoReply(data: {
  name: string;
  email: string;
  message: string;
  items: string[];
  type: string;
}) {
  const sgKey = process.env.SENDGRID_API_KEY;
  if (!sgKey) {
    console.warn("SENDGRID_API_KEY not set, skipping auto-reply");
    return;
  }

  const firstName = data.name.split(" ")[0];
  const selectedItems = data.items
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as (typeof items)[number][];

  // Build item names for display
  const itemTitles = selectedItems.map((i) => i.title);
  const itemsLabel =
    itemTitles.length === 0
      ? "some of the items"
      : itemTitles.length === 1
      ? `the ${itemTitles[0]}`
      : itemTitles.length === 2
      ? `the ${itemTitles[0]} and the ${itemTitles[1]}`
      : `${itemTitles.slice(0, -1).map((t) => `the ${t}`).join(", ")}, and the ${itemTitles[itemTitles.length - 1]}`;

  // Deduplicate locations across selected items
  const locations = [...new Set(selectedItems.map((i) => i.location).filter(Boolean))];
  const locationLine =
    locations.length === 0
      ? ""
      : locations.length === 1
      ? `Just so you know, ${selectedItems.length === 1 ? "this item is" : "these items are"} located in <strong>${locations[0]}</strong> and would need to be picked up locally.`
      : `These items are spread across a couple locations: <strong>${locations.join("</strong> and <strong>")}</strong>. Pickup would be local to each.`;

  const locationLineText = locationLine.replace(/<\/?strong>/g, "");

  // External listing links
  const externalItems = selectedItems.filter((i) => i.externalUrl);
  const externalNote = externalItems.length > 0
    ? externalItems.map((i) =>
        `<p style="background: #f5f3ef; padding: 12px 16px; border-radius: 8px; margin-top: 12px;">Full details on the <strong>${i.title}</strong>: <a href="${i.externalUrl}" style="color: #2c5545; font-weight: 600;">${i.externalUrl}</a></p>`
      ).join("")
    : "";
  const externalNoteText = externalItems.length > 0
    ? "\n" + externalItems.map((i) => `Full details on the ${i.title}: ${i.externalUrl}`).join("\n") + "\n"
    : "";

  const subject = `Thanks for your interest${selectedItems.length === 1 ? ` in the ${selectedItems[0].title}` : selectedItems.length > 1 ? " in some Curated Goods" : ""}, ${firstName}`;

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Hi ${firstName},</p>

  <p>Thanks for reaching out${selectedItems.length > 0 ? ` about ${itemsLabel}` : ""}. Got your message.</p>

  ${locationLine ? `<p>${locationLine}</p>` : ""}
  ${externalNote}

  <p>Reply to this email to confirm that works for you and we'll set up a time to talk.</p>

  <p style="margin-top: 2rem;">
    Dustin
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;">
  <p style="font-size: 0.85rem; color: #999;">
    Curated Goods<br>
    <a href="https://curated.dustinwells.com" style="color: #2c5545;">curated.dustinwells.com</a>
  </p>
</div>`;

  const textBody = `Hi ${firstName},

Thanks for reaching out${selectedItems.length > 0 ? ` about ${itemsLabel}` : ""}. Got your message.

${locationLineText}
${externalNoteText}
Reply to this email to confirm that works for you and we'll set up a time to talk.

Dustin

---
Curated Goods
curated.dustinwells.com`;

  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sgKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: data.email, name: data.name }] }],
      from: { email: "dustin@dustinwells.com", name: "Dustin Wells" },
      reply_to: { email: "dustin+curatedgoods@dustinwells.com", name: "Dustin Wells" },
      subject,
      content: [
        { type: "text/plain", value: textBody },
        { type: "text/html", value: htmlBody },
      ],
    }),
  });
}

