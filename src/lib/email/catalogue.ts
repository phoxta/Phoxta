import { renderEmail, type Block } from "@email";
import { phoxtaBrochure, BROCHURE_SUBJECT } from "@email/brochure";

/**
 * Every email Phoxta sends, in one place, with the copy written out.
 *
 * WHY A CATALOGUE AND NOT AN EMAIL BUILDER. Transactional mail is not social
 * graphics. There are about a dozen messages, they should all look identical —
 * a receipt that looks different from a reminder reads as a phishing attempt —
 * and almost all of the value is in the WORDS, not the layout. Stripe, Linear
 * and Vercel all send everything through one template for exactly this reason.
 * A drag-and-drop builder would be a large amount of machinery aimed at the
 * part that matters least, and would guarantee the inconsistency it was meant
 * to enable.
 *
 * So the layout is fixed and shared, and this is where the writing lives.
 *
 * The rules each message follows:
 *
 *   ONE ACTION.        Two buttons is a choice; a choice is a delay. If the
 *                      email needs a second link it goes in the prose.
 *   THE FACT IN THE    "Invoice INV-1042 — £1,240.00, due 14 March" beats
 *   SUBJECT.           "You have a new invoice". People triage on the subject
 *                      line and act without opening.
 *   PREHEADER ADDS.    It is the second line in the inbox, not a repeat of the
 *                      first. Wasting it on "View in browser" is the most
 *                      common mistake in transactional email.
 *   WHAT HAPPENED,     Never open with a greeting and a paragraph of context.
 *   THEN WHAT TO DO.   The reader already knows who they are.
 *   NUMBERS IN A       Anything with an amount, a date or a reference goes in
 *   TABLE.             the facts block, where it survives being skimmed.
 *   WHOSE NAME IS ON   Mail about a tenant's business is branded as that
 *   IT.                business — their customer has never heard of Phoxta.
 */

export type MessageId =
  | "brochure"
  | "school-application" | "school-lead" | "invoice" | "receipt" | "order"
  | "ticket-reply" | "renewal" | "trial-ending" | "payment-failed"
  | "booking-reminder" | "account-created" | "password-reset";

export type Message = {
  id: MessageId;
  /** Where it is sent from, so the console can show what triggers it. */
  sentBy: string;
  /** Who the reader is, in one phrase. Design decisions follow from this. */
  audience: string;
  /** Whose name is on the email. */
  brandedAs: "Phoxta" | "the business";
  subject: string;
  render: () => { html: string; text: string };
};

/** Sample data, chosen to stress the layout: a long business name, a real
 *  currency amount, a name with an apostrophe. */
const S = {
  business: "Aurelia Studio",
  person: "Ada",
  fullName: "Ada Lovelace",
  amount: "£1,240.00",
  due: "14 March",
  ref: "INV-1042",
};

const site = (p: string) => `https://www.phoxta.com${p}`;

function make(
  id: MessageId, sentBy: string, audience: string, brandedAs: Message["brandedAs"],
  subject: string, preheader: string, heading: string, blocks: Block[],
  opts?: { footnote?: string; brand?: string },
): Message {
  return {
    id, sentBy, audience, brandedAs, subject,
    render: () => renderEmail({ preheader, heading, blocks, footnote: opts?.footnote, brand: opts?.brand }),
  };
}

export const MESSAGES: Message[] = [
  // The one email that is not transactional. It is the long one, it is the only
  // one someone did not ask for, and it is built from the same blocks as the
  // rest so it cannot drift into looking like a different company.
  {
    id: "brochure",
    sentBy: "brochure-send",
    audience: "Someone who has heard the name and nothing else",
    brandedAs: "Phoxta",
    subject: BROCHURE_SUBJECT,
    render: phoxtaBrochure,
  },

  // ── Phoxta's own ────────────────────────────────────────────────────────
  make(
    "school-application", "platform-lead", "Someone who just signed up for Startup School", "Phoxta",
    "Your place at Phoxta Startup School",
    "£500 for 2 weeks. We'll confirm within one working day — nothing to pay yet.",
    "Your place at Phoxta Startup School",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "You're on the list. Here's what you've asked for:" },
      { type: "facts", rows: [["Programme", "Startup School"], ["Length", "2 weeks"], ["Cost", "£500"], ["Paid today", "Nothing"]] },
      { type: "html", html: "<b>What happens next.</b> One of us will be in touch within one working day with the dates for the next cohort and how to pay. Your place is held until you confirm.", text: "What happens next. One of us will be in touch within one working day with the dates for the next cohort and how to pay. Your place is held until you confirm." },
      { type: "text", text: "You'll spend two weeks on strategy, finance, marketing and the AI tools that actually matter now — with mentors who have built and sold companies. You finish with a real business running, not a certificate." },
      { type: "button", label: "See what's covered", href: site("/startup-school") },
      { type: "divider" },
      { type: "text", text: "If anything has changed, or you have a question first, just reply — it comes straight to us." },
    ],
    { footnote: "You received this because you signed up at phoxta.com/startup-school." },
  ),

  make(
    "school-lead", "platform-lead", "The Phoxta team", "Phoxta",
    "Startup School — Ada Lovelace",
    "Building it now · +44 7700 900123 · replied to within a day",
    "New Startup School application",
    [
      { type: "facts", rows: [["Name", S.fullName], ["Email", "ada@example.com"], ["Phone", "+44 7700 900123"], ["Stage", "Building it now"]] },
      { type: "quote", text: "An analytical engine for small business bookkeeping." },
      { type: "text", text: "They've been told someone will be in touch within one working day." },
      { type: "button", label: "Open in the console", href: site("/dashboard/businesses") },
    ],
  ),

  make(
    "account-created", "platform-users", "A customer being onboarded by hand", "Phoxta",
    "Your Phoxta account is ready",
    "Sign in and pick up where we left off — your password is inside.",
    "Your Phoxta account is ready",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "We've set up your account. Sign in with the details below and change the password when you land." },
      { type: "facts", rows: [["Email", "ada@example.com"], ["Temporary password", "shown once, in the console"]] },
      { type: "button", label: "Sign in", href: site("/signin") },
      { type: "text", text: "If you weren't expecting this, tell us and we'll close the account." },
    ],
  ),

  make(
    "password-reset", "platform-users", "Someone who asked to reset their password", "Phoxta",
    "Reset your Phoxta password",
    "The link works once and expires in an hour.",
    "Reset your password",
    [
      { type: "text", text: "Use the button below to choose a new password. It works once and expires in an hour." },
      { type: "button", label: "Choose a new password", href: site("/reset") },
      { type: "text", text: "If you didn't ask for this, you can ignore it — nothing has changed and your current password still works." },
    ],
  ),

  // ── Billing, from Phoxta to the business owner ──────────────────────────
  make(
    "renewal", "billing-alerts", "A business owner on a paid plan", "Phoxta",
    "Your Growth plan renews on 14 March — £49",
    "Nothing to do. Cancel or change plan any time before then.",
    "Your plan renews on 14 March",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "A heads-up so it isn't a surprise on your statement." },
      { type: "facts", rows: [["Plan", "Growth"], ["Renews", "14 March"], ["Amount", "£49.00"], ["Card", "Visa ending 4242"]] },
      { type: "text", text: "Nothing to do — it renews automatically. You can change plan or cancel any time before then and you won't be charged." },
      { type: "button", label: "Manage billing", href: site("/dashboard/billing") },
    ],
    { footnote: "You get this because you own a business on Phoxta. It is not marketing and cannot be turned off." },
  ),

  make(
    "trial-ending", "billing-alerts", "A business owner whose free month is ending", "Phoxta",
    "Your free month ends on 14 March",
    "Add a card to keep going, or do nothing and it stops.",
    "Your free month ends on 14 March",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "Your free month of Growth ends on 14 March. If you'd like to carry on, add a card before then." },
      { type: "text", text: "If you'd rather not, do nothing. Nothing will be charged, and your business and its data stay where they are." },
      { type: "button", label: "Add a card", href: site("/dashboard/billing") },
    ],
  ),

  make(
    "payment-failed", "billing-alerts", "A business owner whose card was declined", "Phoxta",
    "We couldn't take payment for Growth — £49",
    "We'll try again on 17 March. Nothing has been switched off.",
    "We couldn't take this month's payment",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "Your card was declined, which usually means it has expired or the bank blocked it." },
      { type: "facts", rows: [["Plan", "Growth"], ["Amount", "£49.00"], ["Attempt", "1 of 3"], ["Next try", "17 March"]] },
      { type: "text", text: "Nothing has been switched off. We'll try again on 17 March — or update the card now and we'll take it straight away." },
      { type: "button", label: "Update card", href: site("/dashboard/billing") },
    ],
  ),

  // ── The tenant's own customers — branded as the business ────────────────
  make(
    "invoice", "paystack-checkout", "A customer of a business on Phoxta", "the business",
    `Invoice ${S.ref} from ${S.business} — ${S.amount}`,
    `Due ${S.due}. Pay by card in a couple of taps.`,
    `Invoice from ${S.business}`,
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: `${S.business} has sent you an invoice.` },
      { type: "facts", rows: [["Reference", S.ref], ["Amount", S.amount], ["Due", S.due]] },
      { type: "button", label: `Pay ${S.amount}`, href: site("/pay/inv-1042") },
      { type: "text", text: "The link is secure and you don't need an account. If you've already paid, ignore this." },
    ],
    // No footnote: the template already signs off "Sent by Aurelia Studio", and
    // a second line saying the same thing reads as a mistake.
    { brand: S.business },
  ),

  make(
    "receipt", "commerce-notify", "A customer who has just paid", "the business",
    `Receipt from ${S.business} — ${S.amount}`,
    `Paid ${S.due}. Keep this for your records.`,
    "Thanks — that's paid",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: `We've received your payment. Here it is for your records.` },
      { type: "facts", rows: [["Reference", S.ref], ["Amount paid", S.amount], ["Date", S.due], ["Method", "Visa ending 4242"]] },
      { type: "text", text: "Nothing else to do." },
    ],
    { brand: S.business },
  ),

  make(
    "order", "commerce-notify", "A customer who has just ordered", "the business",
    `Order #1042 confirmed — ${S.business}`,
    "We'll email again the moment it ships.",
    "Your order is confirmed",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "Thanks for your order. We're getting it ready." },
      { type: "facts", rows: [["Order", "#1042"], ["Total", S.amount], ["Delivery", "2–3 working days"]] },
      { type: "text", text: "We'll email again the moment it ships, with tracking." },
      { type: "button", label: "View your order", href: site("/orders/1042") },
    ],
    { brand: S.business },
  ),

  make(
    "ticket-reply", "ticket-reply", "A customer who raised a support ticket", "the business",
    `Re: My delivery hasn't arrived`,
    `${S.business} has replied.`,
    `${S.business} replied`,
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "Sorry about that — I've checked and your parcel was held at the depot. It's back out for delivery tomorrow and I've refunded the delivery charge." },
      { type: "text", text: "Anything else, just reply to this email and it comes straight back to me." },
      { type: "text", text: `— Sam, ${S.business}` },
    ],
    { brand: S.business },
  ),

  make(
    "booking-reminder", "agent-worker", "A customer with an appointment tomorrow", "the business",
    `Tomorrow at 2:30pm — ${S.business}`,
    "Reply CHANGE if you need a different time.",
    "See you tomorrow",
    [
      { type: "text", text: `Hi ${S.person},` },
      { type: "text", text: "A quick reminder about your appointment." },
      { type: "facts", rows: [["When", "Tomorrow, 2:30pm"], ["Where", "12 Bridge Street"], ["With", "Sam"]] },
      { type: "text", text: "If you need a different time, just reply and we'll sort it." },
    ],
    { brand: S.business },
  ),
];

export const byId = (id: MessageId) => MESSAGES.find((m) => m.id === id);
