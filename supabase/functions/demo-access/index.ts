// Phoxta — demo-access: the lead gate in front of the live demo popup.
//
// The demo popup is the best thing the marketing site shows a stranger, and it
// used to show it anonymously: someone toured five storefronts and left no
// trace. Now the demo loads blurred behind a short form, and the details are
// exchanged for a five-day pass.
//
// The pass is keyed on the caller's address AND on a random id the browser
// keeps. Either one matching is enough, because the two fail in opposite
// directions: an address moves (a phone leaving wifi) and a browser's storage
// gets cleared, and a visitor who filled the form in this morning must not be
// asked again this afternoon because one of them changed.
//
// The address is stored hashed — knowing "same visitor as before" is the whole
// job here, knowing who they are is not.
// The schema bootstraps lazily over SUPABASE_DB_URL on the first call
// (`supabase db push` is not available in this environment — same pattern as
// platform-posts and ops-maintenance). The DDL is idempotent and is also
// recorded in supabase/migrations/0126_demo_gate.sql.
import { preflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabaseAdmin.ts";
import { hashIp } from "../_shared/clientIp.ts";
import { sendEmail } from "../_shared/dispatch.ts";
import { renderEmail } from "../_shared/email.ts";
import { DEMO_WELCOME_EMAIL } from "../_shared/demoEmail.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

const DDL = `
-- 'demo' joins the lead sources. The CHECK from 0070 was created inline, so it
-- is dropped by definition rather than by name: an add alongside a surviving
-- old constraint would leave 'demo' rejected by the one we did not drop.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.platform_leads'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%startup-school%'
  loop
    execute format('alter table platform_leads drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.platform_leads drop constraint if exists platform_leads_source_check;
alter table public.platform_leads add constraint platform_leads_source_check
  check (source in ('contact', 'startup-school', 'careers', 'demo', 'other'));

create table if not exists public.demo_passes (
  id bigserial primary key,
  ip_hash text not null,
  device_id text not null default '',
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  heard_about text not null default '',
  demo_url text not null default '',
  lead_id uuid references public.platform_leads(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 days'
);
create index if not exists idx_demo_passes_ip on public.demo_passes(ip_hash, expires_at desc);
create index if not exists idx_demo_passes_device on public.demo_passes(device_id, expires_at desc)
  where device_id <> '';
create index if not exists idx_demo_passes_created on public.demo_passes(created_at desc);
alter table public.demo_passes enable row level security;
drop policy if exists demo_passes_admin_read on public.demo_passes;
create policy demo_passes_admin_read on public.demo_passes
  for select using (public.app_is_platform_admin());
`;

let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) throw new Error("SUPABASE_DB_URL not available to this function.");
  const sql = postgres(dbUrl, { prepare: false });
  try {
    await sql.unsafe(DDL);
    schemaReady = true;
  } finally {
    await sql.end({ timeout: 3 });
  }
}

// Keep in step with DEMO_PASS_DAYS in src/lib/demoGate.ts, which tells the
// visitor how long they have. A promise of five days that expires in one is a
// form they have to fill in twice.
const PASS_DAYS = 5;

const NOTIFY_TO = Deno.env.get("PLATFORM_LEAD_EMAIL") ?? "femi@phoxta.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A device id we minted ourselves is a uuid. Anything else is a caller poking
// at us, and it goes into an indexed column, so it is bounded here.
const DEVICE_RE = /^[a-zA-Z0-9-]{8,64}$/;
// Ceiling on new passes from one address per hour. Sized far above a real
// visitor — who needs exactly one — and below the volume that would make
// filling the form with rubbish worth anyone's time.
const HOURLY_CAP = 8;

type PassRow = { expires_at: string };

/**
 * The visitor's live pass, if they have one.
 *
 * Two queries rather than one `.or()`: the device id comes from the client, and
 * PostgREST's `or` takes a filter *string*, so interpolating caller-supplied
 * text into it is how a filter becomes an injection. Both columns are indexed.
 */
async function livePass(
  admin: ReturnType<typeof adminClient>,
  ipHash: string,
  device: string,
): Promise<string | null> {
  const now = new Date().toISOString();
  const newest = (column: string, value: string) =>
    admin
      .from("demo_passes")
      .select("expires_at")
      .eq(column, value)
      .gt("expires_at", now)
      .order("expires_at", { ascending: false })
      .limit(1);

  const [byIp, byDevice] = await Promise.all([
    newest("ip_hash", ipHash),
    device ? newest("device_id", device) : Promise.resolve({ data: [] as PassRow[] }),
  ]);
  const found = [...((byIp.data as PassRow[] | null) ?? []), ...((byDevice.data as PassRow[] | null) ?? [])]
    .map((r) => r.expires_at)
    .filter(Boolean)
    .sort();
  // The latest expiry wins: a visitor recognised by both keys keeps the longer
  // of the two rather than the one that happens to be read first.
  return found.length ? found[found.length - 1] : null;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "check");
    const rawDevice = String(body.device_id ?? "").trim();
    const device = DEVICE_RE.test(rawDevice) ? rawDevice : "";
    await ensureSchema();
    const admin = adminClient();
    const ipHash = await hashIp(req);

    if (action === "check") {
      const expires = await livePass(admin, ipHash, device);
      return json({ ok: true, granted: Boolean(expires), expires_at: expires, days: PASS_DAYS });
    }

    if (action !== "unlock") return json({ error: "Unknown action." }, 400);

    // Honeypot: bots fill every field — a non-empty "website" means spam. Told
    // it worked, because a bot that knows it failed comes back different.
    if (String(body.website ?? "").trim() !== "") {
      return json({ ok: true, granted: true, expires_at: new Date(Date.now() + PASS_DAYS * 86_400_000).toISOString(), days: PASS_DAYS });
    }

    const name = String(body.name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().slice(0, 200);
    const phone = String(body.phone ?? "").trim().slice(0, 40);
    const heardAbout = String(body.heard_about ?? "").trim().slice(0, 200);
    const demoUrl = String(body.demo_url ?? "").trim().slice(0, 500);

    if (name.length < 2) return json({ error: "Tell us your name." }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400);
    if (phone.replace(/\D/g, "").length < 6) return json({ error: "Enter a phone number we can reach you on." }, 400);
    if (!heardAbout) return json({ error: "Tell us how you heard about Phoxta." }, 400);

    // Already through the gate — don't make them start a second lead just
    // because two demos were opened in quick succession.
    const existing = await livePass(admin, ipHash, device);
    if (existing) return json({ ok: true, granted: true, expires_at: existing, days: PASS_DAYS });

    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await admin
      .from("demo_passes").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", hourAgo);
    if ((count ?? 0) >= HOURLY_CAP) {
      // Silently accept and let them look: this is a marketing gate, and
      // locking out a shared office network is a worse outcome than a few
      // uncounted leads. Nothing is stored, so the flood stops here.
      return json({ ok: true, granted: true, expires_at: new Date(Date.now() + PASS_DAYS * 86_400_000).toISOString(), days: PASS_DAYS });
    }

    // The lead IS the reason the gate exists. Fold the two extra answers into
    // the message so they read straight out of the platform console without a
    // schema change, and keep them structured in metadata too.
    const message = [`How they heard about us: ${heardAbout}`, demoUrl ? `Opened demo: ${demoUrl}` : ""]
      .filter(Boolean)
      .join("\n");
    const { data: lead, error: leadError } = await admin
      .from("platform_leads")
      .insert({
        source: "demo", name, email, phone, message,
        metadata: { heard_about: heardAbout, demo_url: demoUrl, gate: "demo-preview" },
      })
      .select("id")
      .single();
    if (leadError) {
      console.error("demo-access lead insert failed", leadError.message);
      return json({ error: "We could not save that just now — please email hello@phoxta.com and we'll open it up for you." }, 500);
    }

    const expiresAt = new Date(Date.now() + PASS_DAYS * 86_400_000).toISOString();
    const { error: passError } = await admin.from("demo_passes").insert({
      ip_hash: ipHash, device_id: device, name, email, phone,
      heard_about: heardAbout, demo_url: demoUrl, lead_id: lead?.id ?? null,
      expires_at: expiresAt,
    });
    // A lost pass costs them the form a second time, not the demo — they are
    // let in either way, because the details we asked for are already saved.
    if (passError) console.error("demo-access pass insert failed", passError.message);


    // Send a welcome email to the lead automatically.
    const { data: tmplData } = await admin.from("email_templates").select("blocks, subject, preheader").eq("name", "Everything Phoxta Does").maybeSingle();
    let welcome = { html: "", text: "" };
    let finalSubject = "Welcome to the Phoxta Demo";
    
    if (tmplData && tmplData.blocks) {
      welcome = renderEmail({
        preheader: tmplData.preheader || "Your demo access pass",
        heading: tmplData.subject || finalSubject,
        blocks: tmplData.blocks
      });
      finalSubject = tmplData.subject || finalSubject;
    } else {
      // Fallback
      welcome = renderEmail(DEMO_WELCOME_EMAIL(name, demoUrl || "Platform"));
      finalSubject = DEMO_WELCOME_EMAIL(name, demoUrl || "Platform").subject;
    }

    await sendEmail({
      to: [email],
      subject: finalSubject,
      html: welcome.html,
      text: welcome.text,
      replyTo: "hello@phoxta.com",
    }).catch((e) => console.error("demo welcome email failed", e));

    // Best-effort notification — the row is the source of truth.
    const brief = renderEmail({
      preheader: `${name} — ${heardAbout}`,
      heading: "Someone opened a live demo",
      blocks: [
        { type: "facts", rows: [
          ["Name", name],
          ["Email", email],
          ["Phone", phone],
          ["Heard about us", heardAbout],
          ["Demo", demoUrl || "—"],
        ] },
        { type: "text", text: "They filled this in to unlock the demo popup, so they are looking at the product right now." },
        { type: "button", label: "Open the console", href: "https://www.phoxta.com/dashboard/ops/platform" },
      ],
    });
    await sendEmail({
      to: [NOTIFY_TO],
      subject: `Demo unlocked: ${name}`,
      html: brief.html,
      text: brief.text,
      replyTo: email,
    }).catch((e) => console.error("demo lead notification failed", e));

    return json({ ok: true, granted: true, expires_at: expiresAt, days: PASS_DAYS });
  } catch (err) {
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
