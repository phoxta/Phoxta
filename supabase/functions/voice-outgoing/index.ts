// Phoxta — voice-outgoing: the TwiML App Voice URL for the in-browser softphone.
// When the operator's browser (Twilio Voice SDK) places a call, Twilio POSTs
// here with the dialed number (`To`); we return TwiML that dials it from the
// business number, bridging the operator's browser audio to the customer.
// Deploy with --no-verify-jwt (Twilio posts without a Supabase JWT).
//
// Two guards, because this URL is publicly reachable and the TwiML it returns
// dials on the shared Twilio account:
//   • X-Twilio-Signature so only Twilio can drive it (and TWILIO_FROM isn't
//     disclosed to anonymous callers).
//   • Destination validation/allowlisting, so a compromised or curious operator
//     can't dial premium-rate ranges.
import { verifyTwilioSignature } from "../_shared/webhooks.ts";
import { checkDestination } from "../_shared/telephony.ts";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const say = (msg: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>${esc(msg)}</Say></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });

Deno.serve(async (req) => {
  const form = await req.formData().catch(() => null);
  if (!form || !(await verifyTwilioSignature(req, form))) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = Deno.env.get("TWILIO_FROM") ?? "";
  if (!from) return say("Sorry, calling isn't configured.");

  const dest = checkDestination(form.get("To")?.toString() ?? "");
  if (!dest.ok) return say("Sorry, that number can't be dialled.");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Dial callerId="${esc(from)}"><Number>${esc(dest.to)}</Number></Dial></Response>`;
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
});
