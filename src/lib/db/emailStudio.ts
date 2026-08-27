import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";
import type { Block } from "@email";

/**
 * The email studio's API.
 *
 * Composed mail is stored as BLOCKS, never as HTML. The console renders the
 * preview by importing the same module the edge function imports, so what is on
 * screen and what is sent come from one renderer — and a saved email picks up
 * every later fix to the layout without anyone reopening it. Storing HTML would
 * fork the design the moment the template changed, and that drift only ever
 * turns up in somebody's inbox.
 */

export type EmailKind = "campaign" | "post" | "brochure";

export type EmailTemplate = {
  id: string;
  name: string;
  kind: EmailKind;
  subject: string;
  preheader: string;
  strap: string;
  footnote: string;
  blocks: Block[];
  source_slug: string | null;
  status: "draft" | "ready" | "sent";
  updated_at: string;
};

export type EmailSummary = Pick<
  EmailTemplate, "id" | "name" | "kind" | "subject" | "preheader" | "status" | "source_slug" | "updated_at"
>;

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("email-studio", { body: { action, ...payload } });
    if (error) return { data: null, error: friendlyError(String((error as Error)?.message ?? error)) };
    if (data?.error) return { data: null, error: String(data.error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

export const listEmails = () => call<{ templates: EmailSummary[] }>("list");
export const getEmail = (id: string) => call<{ template: EmailTemplate }>("get", { id });
export const deleteEmail = (id: string) => call<{ ok: true }>("delete", { id });

export const saveEmail = (t: Partial<EmailTemplate> & { blocks: Block[] }) =>
  call<{ id: string }>("save", {
    id: t.id, name: t.name, kind: t.kind, subject: t.subject, preheader: t.preheader,
    strap: t.strap, footnote: t.footnote, blocks: t.blocks, sourceSlug: t.source_slug,
  });

/** Pull a published post in as an editable email. */
export const emailFromPost = (slug: string) =>
  call<{ template: Omit<EmailTemplate, "id" | "status" | "updated_at"> }>("fromPost", { slug });

/** Send one copy to yourself. Deliberately NOT written to the send ledger — a
 *  test must not burn the recipient's one copy of the real thing. */
export const sendTest = (t: Partial<EmailTemplate> & { blocks: Block[] }, to: string) =>
  call<{ ok: boolean; id?: string; error?: unknown }>("test", { ...t, to });

/**
 * Send it for real.
 *
 * `force` overrides the short double-send window — NOT the opt-out list, which
 * has no override and never will. A refusal that carries `resendable` is the
 * window asking a question; one without it is a hard no.
 */
export const sendEmail = (t: Partial<EmailTemplate> & { blocks: Block[] }, to: string, force = false) =>
  call<{ ok: boolean; id?: string; skipped?: string; at?: string; resendable?: boolean }>(
    "send", { ...t, to, force },
  );
