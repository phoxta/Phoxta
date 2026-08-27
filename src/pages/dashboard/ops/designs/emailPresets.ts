import type { Block } from "@email";
import { brochureTemplate } from "@email/brochure";
import type { EmailTemplate } from "@/lib/db/emailStudio";

export type Draft = Omit<EmailTemplate, "id" | "status" | "updated_at"> & { id?: string };

/**
 * The shapes an email can start as.
 *
 * Not "designs" in the graphics sense — an email's design is fixed and shared,
 * which is the point of having one template. What differs between a newsletter
 * and an announcement is the ORDER and the KIND of blocks, and that is what a
 * preset is: a starting arrangement with the prompts already written into the
 * placeholder text, so the first thing you do is replace words rather than
 * work out what goes where.
 *
 * The brochure is here as a real preset rather than a description of one: it
 * opens the shipped brochure's own blocks. Editing it saves a copy — the
 * version the platform sends stays in the code until someone deliberately
 * changes it there.
 */
export type Preset = {
  id: string;
  name: string;
  what: string;
  make: () => Draft;
};

const base = (over: Partial<Draft>): Draft => ({
  name: "Untitled email",
  kind: "campaign",
  subject: "",
  preheader: "",
  strap: "Phoxta",
  footnote: "You are receiving this because you asked to hear from Phoxta.",
  blocks: [],
  source_slug: null,
  ...over,
});

export const PRESETS: Preset[] = [
  {
    id: "blank",
    name: "Blank",
    what: "Nothing but the masthead and the footer. Build it up yourself.",
    make: () => base({ name: "Untitled email" }),
  },
  {
    id: "letter",
    name: "A letter",
    what: "A few paragraphs and one button. What most email should be.",
    make: () => base({
      name: "A letter",
      subject: "",
      preheader: "",
      blocks: [
        { type: "text", text: "Hi there," },
        { type: "text", text: "Say the thing you are writing to say, in the first two lines. Everything after it is detail." },
        { type: "text", text: "One more paragraph if it genuinely needs one." },
        { type: "button", label: "Do the thing", href: "https://www.phoxta.com/" },
      ] as Block[],
    }),
  },
  {
    id: "announcement",
    name: "Announcement",
    what: "A picture, a headline and one action. For launches.",
    make: () => base({
      name: "Announcement",
      blocks: [
        {
          type: "cover",
          src: "https://www.phoxta.com/assets/imgs/email/hero.jpg",
          alt: "",
          title: "The headline goes here",
          sub: "One line under it saying what it means for the reader.",
          cta: { label: "Take a look", href: "https://www.phoxta.com/" },
          note: "",
        },
        { type: "text", text: "Two or three sentences of detail for the people who want it." },
        { type: "button", label: "Take a look", href: "https://www.phoxta.com/" },
      ] as Block[],
    }),
  },
  {
    id: "newsletter",
    name: "Newsletter",
    what: "A standfirst, a few sections and a sign-off.",
    make: () => base({
      name: "Newsletter",
      strap: "The Phoxta letter",
      blocks: [
        { type: "section", label: "This month", title: "What happened" },
        { type: "lead", text: "The one thing worth knowing, in a sentence and a half." },
        { type: "subhead", text: "First thing" },
        { type: "text", text: "What it is and why it matters." },
        { type: "subhead", text: "Second thing" },
        { type: "text", text: "What it is and why it matters." },
        { type: "divider" },
        { type: "text", text: "That is everything. Reply if you want to talk about any of it." },
      ] as Block[],
    }),
  },
  {
    id: "offer",
    name: "Offer",
    what: "A price on ink, the reasons around it, one button.",
    make: () => base({
      name: "Offer",
      blocks: [
        { type: "section", label: "The offer", title: "What you get" },
        { type: "text", text: "One paragraph on what this is." },
        { type: "panel", big: "£000", small: "What that buys and for how long." },
        { type: "steps", items: ["What happens first.", "What happens next.", "What happens after that."] },
        { type: "button", label: "Get started", href: "https://www.phoxta.com/" },
      ] as Block[],
    }),
  },
  {
    id: "brochure",
    name: "The Phoxta brochure",
    what: "Everything Phoxta does, as it currently ships. Opens as a copy.",
    make: () => {
      const t = brochureTemplate();
      return base({
        name: "Phoxta brochure",
        kind: "brochure",
        subject: t.subject,
        preheader: t.preheader,
        strap: t.strap,
        footnote: t.footnote ?? "",
        blocks: t.blocks,
      });
    },
  },
];
