// Phoxta — voice-outgoing: the TwiML App Voice URL for the in-browser softphone.
// When the operator's browser (Twilio Voice SDK) places a call, Twilio POSTs
// here with the dialed number (`To`); we return TwiML that dials it from the
// business number, bridging the operator's browser audio to the customer.
// Deploy with --no-verify-jwt (Twilio posts without a Supabase JWT).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  const form = await req.formData().catch(() => null);
  const to = (form?.get("To")?.toString() ?? "").trim();
  const from = Deno.env.get("TWILIO_FROM") ?? "";
  const xml = to && from
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${esc(from)}"><Number>${esc(to)}</Number></Dial></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, no number to dial.</Say></Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
});
