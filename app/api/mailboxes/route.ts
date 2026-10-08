import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { encryptMailboxPassword } from "@/lib/mailbox-crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const smtpProviders = {
  gmail: { host: "smtp.gmail.com", port: 465, secure: true },
  microsoft365: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
  },
  yahoo: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
} as const;

type Provider = keyof typeof smtpProviders;

function isProvider(value: unknown): value is Provider {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(smtpProviders, value)
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (
      typeof body !== "object" ||
      body === null ||
      !("email" in body) ||
      !("appPassword" in body) ||
      !("provider" in body) ||
      typeof body.email !== "string" ||
      typeof body.appPassword !== "string" ||
      !isProvider(body.provider)
    ) {
      return NextResponse.json({ error: "Invalid mailbox details." }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const appPassword = body.appPassword;
    const provider = body.provider;

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !appPassword.trim()
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address and app password." },
        { status: 400 },
      );
    }

    const encryptedPassword = encryptMailboxPassword(appPassword);
    const smtp = smtpProviders[provider];
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: email, pass: appPassword },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transporter.verify();

    const { data, error } = await supabase
      .from("mailboxes")
      .insert({
        email,
        provider,
        app_password_encrypted: encryptedPassword,
        status: "connected",
      })
      .select("id, email, provider, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ mailbox: data }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Mailbox connection failed due to an unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
