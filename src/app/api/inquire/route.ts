import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, item, type, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // For now, log the inquiry. Later this can send an email via SendGrid
    // or save to Supabase.
    console.log("New inquiry received:", {
      name,
      email,
      phone,
      item,
      type,
      message,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send email notification via SendGrid
    // TODO: Save to Supabase database

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
