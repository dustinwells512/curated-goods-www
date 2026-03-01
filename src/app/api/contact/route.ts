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

const TYPE_LABELS: Record<string, string> = {
  inquiry: "Ask a Question",
  offer: "Make an Offer",
  purchase: "Purchase This Item",
  schedule: "Schedule a Viewing",
};

// Map item IDs to their categories for context-aware replies
const ITEM_CATEGORIES: Record<string, string> = {
  "sprinter-van": "vehicle",
  piano: "instrument",
  "dining-table": "furniture",
  bookshelf: "furniture",
  "accent-chair": "furniture",
  "desk-lamp": "decor",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, item, type, message, timeOnPage, visitCount, firstVisit, referrer } = body;

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
          item: item || "",
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
    sendAutoReply({ name, email, message, item, type: type || "inquiry" }).catch((e) =>
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
  item: string;
  type: string;
}) {
  const sgKey = process.env.SENDGRID_API_KEY;
  if (!sgKey) {
    console.warn("SENDGRID_API_KEY not set, skipping auto-reply");
    return;
  }

  const firstName = data.name.split(" ")[0];
  const typeLabel = TYPE_LABELS[data.type] || data.type;
  const selectedItem = items.find((i) => i.id === data.item);
  const itemTitle = selectedItem?.title || "one of the items";
  const itemCategory = ITEM_CATEGORIES[data.item] || "general";

  // Generate contextual line based on their message and item
  const contextLine = generateContextLine(data.message, data.item, itemCategory);

  // Generate qualifying questions based on item category
  const questions = generateQuestions(data.item, itemCategory, selectedItem);

  // Check if item has a dedicated external site
  const externalSiteNote = selectedItem?.externalUrl
    ? `\n  <p style="background: #f5f3ef; padding: 12px 16px; border-radius: 8px; margin-top: 16px;">
    For full details, photos, and specs on the <strong>${selectedItem.title}</strong>, check out the dedicated listing page:<br>
    <a href="${selectedItem.externalUrl}" style="color: #2c5545; font-weight: 600;">${selectedItem.externalUrl}</a>
  </p>`
    : "";

  const externalSiteNoteText = selectedItem?.externalUrl
    ? `\nFor full details, photos, and specs on the ${selectedItem.title}, check out the dedicated listing page:\n${selectedItem.externalUrl}\n`
    : "";

  const subject = `Thanks for your interest${selectedItem ? ` in the ${selectedItem.title}` : ""}, ${firstName}`;

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <p>Hi ${firstName},</p>

  <p>Thanks for reaching out${selectedItem ? ` about the <strong>${selectedItem.title}</strong>` : ""} &mdash; I got your message.</p>

  ${contextLine ? `<p>${contextLine}</p>` : ""}

  <p>You selected <strong>${typeLabel.toLowerCase()}</strong> &mdash; that helps me know how best to help.</p>

  <p>A few quick questions so I can give you the most useful info:</p>

  <ol style="line-height: 1.8;">
    ${questions.map((q) => `<li>${q}</li>`).join("\n    ")}
  </ol>
  ${externalSiteNote}

  <p>Just reply to this email and I'll go from there.</p>

  <p style="margin-top: 2rem;">
    Talk soon,<br>
    <strong>Dustin</strong>
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;">
  <p style="font-size: 0.85rem; color: #999;">
    Curated Goods &bull; Quality items, personally selected<br>
    <a href="https://curated.dustinwells.com" style="color: #2c5545;">View all items</a>
  </p>
</div>`;

  const textBody = `Hi ${firstName},

Thanks for reaching out${selectedItem ? ` about the ${selectedItem.title}` : ""} — I got your message.

${contextLine || ""}

You selected ${typeLabel.toLowerCase()} — that helps me know how best to help.

A few quick questions so I can give you the most useful info:

${questions.map((q, i) => `${i + 1}. ${q.replace(/<\/?strong>/g, "")}`).join("\n")}
${externalSiteNoteText}
Just reply to this email and I'll go from there.

Talk soon,
Dustin

---
Curated Goods | Quality items, personally selected
View all items: https://curated.dustinwells.com`;

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

// ---------------------------------------------------------------------------
// Context line generation — message + item category aware
// ---------------------------------------------------------------------------

function generateContextLine(message: string, itemId: string, category: string): string {
  const lower = message.toLowerCase();

  // Message keyword matching first (takes priority)
  if (lower.includes("price") || lower.includes("offer") || lower.includes("cost") || lower.includes("budget") || lower.includes("negotiate")) {
    return "I'm always happy to have a straightforward conversation about pricing.";
  }
  if (lower.includes("view") || lower.includes("see") || lower.includes("visit") || lower.includes("look at") || lower.includes("come by")) {
    return "Nothing beats seeing it in person — happy to set up a time that works for you.";
  }
  if (lower.includes("condition") || lower.includes("damage") || lower.includes("wear") || lower.includes("scratch")) {
    return "I appreciate you wanting to know the full picture — I'm always upfront about condition.";
  }
  if (lower.includes("deliver") || lower.includes("ship") || lower.includes("pickup") || lower.includes("transport")) {
    return "Good question about logistics — I'm flexible and happy to work out the details.";
  }

  // Item category-specific fallbacks
  switch (category) {
    case "vehicle":
      if (lower.includes("off-road") || lower.includes("overland") || lower.includes("camp")) {
        return "I can tell you're interested in the adventure capabilities — this van was built for exactly that.";
      }
      if (lower.includes("mile") || lower.includes("engine") || lower.includes("mechanical")) {
        return "Great that you're looking at the mechanical details — happy to share the full service history.";
      }
      return "The Sprinter is a really special build — I'm happy to tell you more about it.";

    case "instrument":
      if (lower.includes("play") || lower.includes("tune") || lower.includes("sound") || lower.includes("tone")) {
        return "The sound on this Steinway is wonderful — there's nothing quite like hearing it in person.";
      }
      if (lower.includes("art") || lower.includes("paint") || lower.includes("mural") || lower.includes("design")) {
        return "The artwork by Elenor Niz really makes this piano one of a kind — the photos only capture part of it.";
      }
      return "This piano is truly a one-of-a-kind piece — both musically and visually.";

    case "furniture":
      if (lower.includes("room") || lower.includes("space") || lower.includes("dimension") || lower.includes("fit")) {
        return "Happy to share exact dimensions or any additional photos from different angles.";
      }
      return "This piece has been well cared for and has a lot of life left in it.";

    case "decor":
      return "This is a quality piece that adds real character to a space.";

    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Qualifying questions — item category aware
// ---------------------------------------------------------------------------

function generateQuestions(
  itemId: string,
  category: string,
  selectedItem: (typeof items)[number] | undefined
): string[] {
  switch (category) {
    case "vehicle":
      return [
        "<strong>What draws you to this particular van?</strong> Whether it's the off-road setup, the interior build, or the overall package — it helps me know what to focus on.",
        "<strong>Have you owned a Sprinter or done van life before?</strong> Happy to go deeper on the technical details if that's helpful.",
        "<strong>Are you in Colorado or would you be traveling for pickup?</strong> The van is currently on the Western Slopes and I'm flexible on scheduling viewings.",
      ];

    case "instrument":
      return [
        "<strong>Are you a player, collector, or both?</strong> It helps me understand what matters most to you about this piano.",
        "<strong>Do you have a space ready for a grand piano?</strong> I can share dimensions and any moving considerations.",
        "<strong>Would you like to schedule a time to see and play it in person?</strong> It's located in South Austin and viewings are by appointment.",
      ];

    case "furniture":
      return [
        `<strong>What space are you envisioning this for?</strong> I can share more dimensions or photos from specific angles if that helps.`,
        `<strong>Do you need help with pickup or delivery?</strong> I'm located in the Austin/Colorado area and can discuss logistics.`,
        `<strong>Is there anything specific about the condition you'd like to know?</strong> Happy to send close-up photos of any area.`,
      ];

    case "decor":
      return [
        "<strong>What room or space are you thinking of putting this in?</strong> I can offer some thoughts on how it fits different settings.",
        "<strong>Are you looking for other decor items as well?</strong> I may have complementary pieces not yet listed.",
        "<strong>Would you like to see it in person before deciding?</strong> Happy to arrange a quick viewing.",
      ];

    default:
      return [
        "<strong>What caught your eye about this item?</strong> It helps me share the most relevant details.",
        "<strong>Do you have any specific questions about condition or dimensions?</strong> Happy to provide more photos.",
        "<strong>Are you local to the area or would we need to arrange shipping?</strong> I'm flexible on logistics.",
      ];
  }
}

