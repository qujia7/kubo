// Supabase Edge Function: email a notification whenever a bet is submitted.
//
// Triggered by a Database Webhook on INSERT into public.pending (see
// supabase/README-notifications.md). Sends mail via Resend.
//
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY  — your Resend API key
//   HOOK_SECRET     — a random string; also set as the webhook's x-webhook-secret header
// Optional:
//   NOTIFY_TO       — recipient (default frankqu7@gmail.com)
//   NOTIFY_FROM     — sender (default "KUBO <onboarding@resend.dev>")

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const HOOK_SECRET = Deno.env.get("HOOK_SECRET") ?? "";
const NOTIFY_TO = Deno.env.get("NOTIFY_TO") ?? "frankqu7@gmail.com";
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "KUBO <onboarding@resend.dev>";

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

serve(async (req) => {
  // Shared-secret check (the function is deployed with --no-verify-jwt).
  if (!HOOK_SECRET || req.headers.get("x-webhook-secret") !== HOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  // Supabase webhooks wrap the row in { type, table, record, ... }.
  const r = payload?.record ?? payload ?? {};
  const member = esc(r.member) || "Someone";
  const pick = esc(r.pick) || "?";
  const cat = r.cat === "scorer" ? "Top scorer" : "Team to win";
  const amt = Number(r.amt ?? 0);

  const subject = `KUBO: new bet from ${member}`;
  const html =
    `<h2 style="margin:0 0 8px">New bet submitted</h2>` +
    `<p style="font-size:15px"><b>${member}</b> bet <b>$${amt}</b> on <b>${pick}</b> &mdash; ${cat}.</p>` +
    `<p style="color:#666">Waiting for approval. Open KUBO and unlock the admin panel to approve or reject it.</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: NOTIFY_FROM, to: [NOTIFY_TO], subject, html }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("resend error", res.status, t);
    return new Response("email failed: " + t, { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
