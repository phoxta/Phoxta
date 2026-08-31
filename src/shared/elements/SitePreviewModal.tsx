import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { checkDemoAccess } from "@/lib/demoGate";
import DemoGateForm from "@/shared/elements/DemoGateForm";

// In-page preview of a live demo storefront: a scrollable iframe popup with a
// fullscreen toggle, an open-in-new-tab escape hatch, and a close icon.
// Rendered through a portal onto <body> — it must sit OUTSIDE
// #smooth-wrapper, because ScrollSmoother transforms #smooth-content and
// position:fixed inside a transformed ancestor pins to that ancestor, not the
// viewport.
//
// The demo itself is gated: until the visitor has a pass it loads blurred
// behind a short form (see @/lib/demoGate). The tease is deliberate — a blurred
// storefront is why anyone fills the form in — but it is a lead gate, not a
// paywall, so it fails open when the backend can't answer.

const CLOSE_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EXPAND_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M9.5 1H15V6.5M15 1L9 7M6.5 15H1V9.5M1 15L7 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const COMPRESS_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M15 6.5H9.5V1M9.5 6.5L15.5 0.5M1 9.5H6.5V15M6.5 9.5L0.5 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NEW_TAB_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M9 1H14V6M14 1L7 8M12 9.5V12.5C12 13.328 11.328 14 10.5 14H2.5C1.672 14 1 13.328 1 12.5V4.5C1 3.672 1.672 3 2.5 3H5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const btnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "50%",
  background: "transparent",
  color: "#fff",
  cursor: "pointer",
  flexShrink: 0,
};

export type SitePreviewModalProps = {
  url: string;
  title: string;
  open: boolean;
  onClose: () => void;
};

export default function SitePreviewModal({ url, title, open, onClose }: SitePreviewModalProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // "checking" holds the gate back for the length of one round trip, so a
  // visitor who already has a pass never sees the form flash up at them.
  const [gate, setGate] = useState<"checking" | "locked" | "open">("checking");

  // Reset to windowed + loading each time the popup opens.
  useEffect(() => {
    if (open) {
      setFullscreen(false);
      setLoaded(false);
    }
  }, [open]);

  // Does this visitor still have a pass? Asked per open rather than once per
  // page, because a pass granted in another tab counts here too.
  useEffect(() => {
    if (!open) return;
    let on = true;
    setGate("checking");
    checkDemoAccess().then(({ granted }) => {
      if (on) setGate(granted ? "open" : "locked");
    });
    return () => {
      on = false;
    };
  }, [open]);

  // Lock the page behind the popup and close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${title}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(10, 10, 10, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: fullscreen ? 0 : "clamp(8px, 3vh, 32px) clamp(8px, 3vw, 32px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          width: fullscreen ? "100%" : "min(1280px, 100%)",
          height: fullscreen ? "100%" : "min(860px, 100%)",
          background: "#111",
          borderRadius: fullscreen ? 0 : 16,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            background: "#111",
            color: "#fff",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#3ddc84",
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
            <span style={{ opacity: 0.5, fontWeight: 400, marginLeft: 10, fontSize: 12 }} className="d-none d-md-inline">
              {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </span>
          </span>
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
            {/* Hidden while locked: a one-click way out of the gate, sitting
                directly above the form, is not a gate. */}
            {gate === "open" && (
              <a href={url} target="_blank" rel="noreferrer" title="Open in new tab" aria-label="Open in new tab" style={btnStyle}>
                {NEW_TAB_SVG}
              </a>
            )}
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              title={fullscreen ? "Exit full screen" : "Full screen"}
              aria-label={fullscreen ? "Exit full screen" : "Full screen"}
              style={btnStyle}
            >
              {fullscreen ? COMPRESS_SVG : EXPAND_SVG}
            </button>
            <button type="button" onClick={onClose} title="Close preview" aria-label="Close preview" style={btnStyle}>
              {CLOSE_SVG}
            </button>
          </span>
        </div>
        <div style={{ position: "relative", flex: 1, background: "#fff" }}>
          {!loaded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              role="status"
              aria-label={`Loading ${title}`}
            >
              <div className="spinner-border text-dark" />
            </div>
          )}
          <iframe
            src={url}
            title={title}
            onLoad={() => setLoaded(true)}
            allow="fullscreen"
            // Hidden from assistive tech while locked: the gate is the only
            // thing on this layer a visitor is meant to reach.
            aria-hidden={gate === "open" ? undefined : true}
            tabIndex={gate === "open" ? undefined : -1}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              border: 0,
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.25s ease, filter 0.4s ease",
              filter: gate === "open" ? "none" : "blur(14px) saturate(0.85)",
              // No scrolling or clicking through the blur.
              pointerEvents: gate === "open" ? "auto" : "none",
              userSelect: gate === "open" ? "auto" : "none",
              transform: gate === "open" ? "none" : "scale(1.04)", // hides the blurred edge
            }}
          />
          {gate === "locked" && (
            <DemoGateForm title={title} url={url} onUnlocked={() => setGate("open")} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
