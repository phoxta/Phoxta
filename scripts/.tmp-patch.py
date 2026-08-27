import io

p = 'supabase/functions/platform-lead/index.ts'
s = io.open(p, encoding='utf-8').read()


def sub(a, b):
    global s
    assert a in s, "MISSING: " + repr(a[:110])
    s = s.replace(a, b, 1)


sub('''// Phoxta — platform-lead: the marketing site's own lead capture.
// The /contact and /startup-school forms previously posted to '#' and dropped
// every submission. This function records the lead in platform_leads and
// emails it to the team (Resend), with a light abuse guard.''',
    '''// Phoxta — platform-lead: the marketing site's own lead capture.
// The /contact and /startup-school forms previously posted to '#' and dropped
// every submission. This function records the lead in platform_leads and
// emails it to the team (Resend), with a light abuse guard.
//
// A Startup School signup also gets a confirmation back. Someone who has just
// agreed to pay for a place and receives nothing has no way to tell whether the
// form worked, and the next thing they do is either fill it in again or give
// up — so the acknowledgement is part of the signup, not a nicety.''')

sub('''const NOTIFY_TO = Deno.env.get("PLATFORM_LEAD_EMAIL") ?? "femi@phoxta.com";''',
    '''const NOTIFY_TO = Deno.env.get("PLATFORM_LEAD_EMAIL") ?? "femi@phoxta.com";
const REPLY_TO = Deno.env.get("PLATFORM_REPLY_EMAIL") ?? "hello@phoxta.com";

// Keep in step with STARTUP_SCHOOL in src/lib/db/platformLead.ts. A Deno
// function cannot import from src/, so the price lives in two places; a price
// quoted differently in an email from the one on the page is the kind of
// mistake the customer finds rather than we do.
const SCHOOL = { price: "£500", duration: "2 weeks" };

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * What an applicant receives the moment they sign up.
 *
 * Deliberately plain: what they asked for, what it costs, what happens next,
 * and that nothing has been charged. The last line matters most — a signup that
 * states a price and then goes quiet reads like a payment they cannot find.
 */
function schoolConfirmation(name: string) {
  const hi = name ? `Hi ${esc(name.split(/\\s+/)[0])},` : "Hi,";
  const lines = [
    `You're on the list for Phoxta Startup School.`,
    `<b>${SCHOOL.price} for ${SCHOOL.duration}.</b> Live sessions with mentors who have built and sold companies, covering strategy, finance, marketing and the AI tools that actually matter now — and you finish with a real business running, not a certificate.`,
    `<b>What happens next.</b> One of us will be in touch within one working day with the dates for the next cohort and how to pay. Nothing has been charged, and your place is held until you confirm.`,
    `If anything has changed, or you have a question first, just reply to this email — it comes straight to us.`,
  ];
  return {
    subject: "Your place at Phoxta Startup School",
    html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#14194e;max-width:560px">
      <p>${hi}</p>
      ${lines.map((l) => `<p>${l}</p>`).join("")}
      <p style="margin-top:24px">— The Phoxta team</p>
    </div>`,
    text: [
      hi, "",
      "You're on the list for Phoxta Startup School.",
      "",
      `${SCHOOL.price} for ${SCHOOL.duration}. Live sessions with mentors who have built and sold companies, covering strategy, finance, marketing and the AI tools that actually matter now - and you finish with a real business running, not a certificate.`,
      "",
      "What happens next. One of us will be in touch within one working day with the dates for the next cohort and how to pay. Nothing has been charged, and your place is held until you confirm.",
      "",
      "If anything has changed, or you have a question first, just reply to this email - it comes straight to us.",
      "",
      "- The Phoxta team",
    ].join("\\n"),
  };
}''')

# The message is only mandatory for the contact form; a signup should not
# demand an essay.
sub('''    if (!message && source === "contact") return json({ error: "Add a short message." }, 400);''',
    '''    if (!message && source === "contact") return json({ error: "Add a short message." }, 400);
    if (source === "startup-school" && !name) return json({ error: "Tell us your name." }, 400);''')

sub('''      replyTo: email,
    }).catch(() => {});

    return json({ ok: true });''',
    '''      replyTo: email,
    }).catch(() => {});

    // The applicant's own confirmation. Best effort, exactly like the team
    // notification: the row is the source of truth, and a mail provider having
    // a bad minute must not cost us the lead.
    if (source === "startup-school") {
      const mail = schoolConfirmation(name);
      await sendEmail({
        to: [email],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        // Replies go to a person, not to the no-reply sender the rest of the
        // platform's transactional mail uses.
        replyTo: REPLY_TO,
      }).catch(() => {});
    }

    return json({ ok: true });''')

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('applicant confirmation added')
