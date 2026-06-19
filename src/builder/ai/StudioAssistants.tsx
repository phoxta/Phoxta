import { useStudioConversation } from "./useStudioConversation";
import AiStudioPanel from "./AiStudioPanel";
import VoiceStudioDock from "./VoiceStudioDock";

/**
 * Mounts both Studio assistants over a single shared conversation, so typing and
 * talking drive the same running thread and the same page. Rendered inside
 * <Puck> (via the headerActions override) so `usePuck()` works.
 */
export default function StudioAssistants({ orgId }: { orgId: string }) {
  const convo = useStudioConversation(orgId);
  return (
    <>
      <AiStudioPanel convo={convo} />
      <VoiceStudioDock convo={convo} />
    </>
  );
}
