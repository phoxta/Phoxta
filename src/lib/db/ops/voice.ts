import { supabase } from "@/lib/supabaseClient";
import { friendlyError } from "@/lib/friendlyError";

/**
 * How this business sounds, written down once and reused everywhere it writes.
 *
 * It is DESCRIBED rather than invented — derived from the replies they have
 * actually sent, the words their customers use back, and their own rules — so
 * the owner's job is to correct a description, which is far easier than filling
 * in a blank "define your brand voice" form nobody ever finishes.
 */

export type VoiceSpec = {
  summary?: string;
  personality?: { trait: string; meansInCopy: string; notThis: string }[];
  register?: { formality?: string; person?: string; humour?: string; emoji?: string };
  sentence?: { length?: string; openings?: string; punctuation?: string };
  lexicon?: {
    weSay?: string[];
    weNeverSay?: string[];
    customerWords?: { phrase: string; seenIn: string }[];
  };
  /** The claims this business may make about itself. Backed by real reviews. */
  proof?: string[];
  examples?: { context: string; good: string; bad: string; why: string }[];
  /** Every trait says where it was seen — or admits it is a proposal. */
  evidence?: { claim: string; basis: string; source: string }[];
};

export type VoiceRow = {
  spec: VoiceSpec;
  status: "draft" | "approved" | "archived";
  /** What it was read from, with counts. An owner is entitled to know whether
   *  this came from forty real conversations or from nothing. */
  source: Record<string, number>;
  owner_input: string;
  model: string | null;
  generated_at: string | null;
  approved_at: string | null;
};

async function call<T>(body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("brand-voice", { body });
    if (error) {
      let msg = error.message;
      try {
        const ctx = await (error as { context?: Response }).context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* keep the transport's message */ }
      return { data: null, error: friendlyError(msg) };
    }
    if (data?.error) return { data: null, error: String(data.error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: friendlyError(String((e as Error)?.message ?? e)) };
  }
}

export const getVoice = (orgId: string) =>
  call<{ voice: VoiceRow | null }>({ orgId, action: "get" });

/** Read everything this business has written and describe how it sounds. */
export const generateVoice = (orgId: string, ownerInput?: string) =>
  call<{ spec: VoiceSpec; source: Record<string, number>; status: string }>({
    orgId, action: "generate", ownerInput,
  });

/** The owner's own edit. `approve` is what turns "we think you sound like this"
 *  into something the writing surfaces can state as fact. */
export const saveVoice = (orgId: string, spec: VoiceSpec, opts?: { approve?: boolean; ownerInput?: string }) =>
  call<{ ok: true }>({
    orgId, action: "save", spec,
    approve: opts?.approve === true,
    ownerInput: opts?.ownerInput ?? "",
  });

/** A one-line summary for surfaces that only need to say whether one exists. */
export function voiceLabel(v: VoiceRow | null): string {
  if (!v) return "Not written yet";
  if (v.status === "approved") return "Approved";
  return "Draft — not yet confirmed by you";
}
