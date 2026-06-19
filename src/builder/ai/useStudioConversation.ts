import { useCallback, useRef, useState } from "react";
import { usePuck, type Data } from "@measured/puck";
import { invokeAction } from "@/lib/db/ops/ai";
import { applyOps, type PageOp } from "@/builder/ops";
import { buildCatalog } from "@/builder/registry";
import { allSlots } from "@/builder/editStore";

export type StudioMsg = { role: "user" | "assistant"; content: string };

/**
 * The transport-agnostic conversation core for Studio's assistants. Both the
 * text chat panel and the conversational voice dock use this single hook, so
 * they share one running conversation and the identical edit path:
 *   instruction -> page_edit (Claude) -> page-ops -> applyOps -> usePuck dispatch.
 *
 * `send` returns the assistant's spoken/printed reply, which the voice dock
 * passes to text-to-speech. A future Pipecat realtime transport can call the
 * same `send` (or emit the same ops) without touching this core.
 */
export function useStudioConversation(orgId: string) {
  const puck = usePuck();
  // Refs keep async/event-handler closures (e.g. speech recognition) reading the
  // freshest document + dispatch + state instead of stale captured values.
  const puckRef = useRef(puck);
  puckRef.current = puck;

  const [messages, setMessages] = useState<StudioMsg[]>([]);
  const messagesRef = useRef<StudioMsg[]>([]);
  messagesRef.current = messages;

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (instruction: string): Promise<string | null> => {
      const text = instruction.trim();
      if (!text || busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      setError(null);

      const history = messagesRef.current.slice(-8);
      setMessages((m) => [...m, { role: "user", content: text }]);

      const doc = puckRef.current.appState.data as Data;
      const { data, error } = await invokeAction<{ reply: string; ops: PageOp[] }>(orgId, "page_edit", {
        document: doc,
        instruction: text,
        catalog: buildCatalog(),
        // Per-block text/image slots currently on the page, so the agent can edit
        // any section's content by index via set_text / set_image.
        slots: allSlots(),
        history,
      });

      busyRef.current = false;
      setBusy(false);

      if (error) {
        setError(error);
        return null;
      }
      const ops = Array.isArray(data?.ops) ? data!.ops : [];
      if (ops.length) {
        puckRef.current.dispatch({ type: "setData", data: applyOps(doc, ops) });
      }
      const reply = data?.reply ?? "Done.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      return reply;
    },
    [orgId],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, busy, error, send, reset };
}

export type StudioConversation = ReturnType<typeof useStudioConversation>;
