# Voice transport: Web Speech now, Pipecat later

The conversational voice builder is split so the **transport** (how audio gets in/out)
is swappable without touching the **conversation core** or the editor.

## What's fixed (don't re-build for Pipecat)

- `useStudioConversation(orgId)` — the core. `send(text) -> reply` runs
  `page_edit` (Claude) → page-ops → `applyOps` → `usePuck().dispatch(setData)`,
  keeping multi-turn history. Returns the reply string to speak.
- `ops.ts#applyOps` + `registry#buildCatalog()` — the edit vocabulary + the list
  of valid sections/fields. Shared by text chat, Web Speech voice, and any future
  transport.

## Current transport — Web Speech (`VoiceStudioDock.tsx`)

`mic → SpeechRecognition → convo.send() → SpeechSynthesis(reply) → listen again`.
No server; works once `ai-actions` is deployed. Chrome/Edge have the best STT.

## Dropping in Pipecat (realtime, low-latency) later

Reuse the existing stack (`VoiceAgentWidget` / `@pipecat-ai/*` / the `agent-inbound`
brain). Two integration points, no core changes:

1. **Server (external Pipecat bot):** register page-editing as LLM tools whose
   JSON args are exactly our `PageOp` shapes (or have the bot call the `page_edit`
   action). Give the bot the current document + `buildCatalog()` as context at
   session start.
2. **Browser:** replace the Web Speech loop with a Pipecat transport that, on each
   tool-call/result message from the bot, either:
   - calls `convo.send(transcript)` (simplest — server does STT, we keep one
     edit path), **or**
   - applies returned ops directly: `dispatch({ type: "setData", data: applyOps(doc, ops) })`.

Because both paths terminate in `applyOps`/`setData`, the editor, undo history,
autosave, and the text chat all keep working unchanged.
