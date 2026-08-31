import { useEffect, useState, type CSSProperties } from "react";
import { Play } from "lucide-react";
import { getRecordingUrl } from "@/lib/db/ops/calls";

/**
 * A call recording, played on demand through a signed link.
 *
 * Every place that showed a recording used to drop call_logs.recording_url
 * straight into an <audio src>. That worked because the bucket was public —
 * which also meant anyone holding the URL could listen, no session required.
 * The bucket is private now and the column holds a storage path (or, on a row
 * from before the change, a public URL that no longer serves). So the player
 * starts as a button; the click asks recording-url for a ten-minute signed
 * link and only then mounts the <audio>. Nothing is fetched for rows nobody
 * plays, and a legacy row plays exactly like a new one — the function parses
 * the path out of either shape.
 *
 * `recording` is the raw column value; null/empty renders nothing, so callers
 * keep their own "no recording" copy where they want it.
 */
export default function RecordingPlayer({
  orgId,
  callId,
  recording,
  className,
  style,
}: {
  orgId: string;
  callId: string;
  /** call_logs.recording_url as stored — a path, or a legacy URL. */
  recording: string | null | undefined;
  className?: string;
  style?: CSSProperties;
}) {
  const [state, setState] = useState<{ kind: "idle" } | { kind: "loading" } | { kind: "ready"; url: string } | { kind: "error"; message: string }>({ kind: "idle" });

  // A different call in the same slot starts over: a signed link belongs to
  // the row it was minted for.
  useEffect(() => setState({ kind: "idle" }), [callId]);

  if (!recording) return null;

  const open = async () => {
    setState({ kind: "loading" });
    const { url, error } = await getRecordingUrl(orgId, callId);
    if (url) setState({ kind: "ready", url });
    else setState({ kind: "error", message: error ?? "The recording could not be opened." });
  };

  if (state.kind === "ready") {
    return (
      <audio
        controls
        autoPlay
        preload="auto"
        src={state.url}
        className={className}
        style={style}
        // The link dies after ten minutes. A player left open past that fails on
        // the next seek, so it falls back to the button and a click mints a new one.
        onError={() => setState({ kind: "error", message: "That link expired — open the recording again." })}
      />
    );
  }

  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 8, ...style }}>
      <button
        type="button"
        className="oc-btn oc-btn--sm"
        onClick={open}
        disabled={state.kind === "loading"}
        aria-label="Play call recording"
      >
        <Play width={12} height={12} /> {state.kind === "loading" ? "Opening…" : "Play recording"}
      </button>
      {state.kind === "error" && (
        <span role="alert" style={{ fontSize: 11.5, color: "var(--at-neutral-500)" }}>
          {state.message}
        </span>
      )}
    </div>
  );
}
