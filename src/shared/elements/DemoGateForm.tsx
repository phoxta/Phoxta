import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { DEMO_PASS_DAYS, HEARD_OPTIONS, unlockDemoAccess } from "@/lib/demoGate";
import { trackEvent } from "@/lib/analytics";

// The card that sits over a blurred demo. Four questions, once every five days
// — the price of the tour. Kept deliberately short: every field added here is
// a share of the visitors who close the popup instead of filling it in.

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.02em",
  textTransform: "uppercase",
  color: "#6b7280",
  marginBottom: 6,
};

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid #dcdfe4",
  borderRadius: 10,
  fontSize: 15,
  color: "#111",
  background: "#fff",
  outline: "none",
};

// Off-screen rather than display:none — a hidden input a bot's parser skips is
// a honeypot that never catches anything.
const honeypotStyle: CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: 1,
  height: 1,
  opacity: 0,
};

export type DemoGateFormProps = {
  /** The demo being opened — named in the heading, recorded on the lead. */
  title: string;
  url: string;
  onUnlocked: () => void;
};

export default function DemoGateForm({ title, url, onUnlocked }: DemoGateFormProps) {
  const id = useId();
  const [heard, setHeard] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const picked = String(fd.get("heard") ?? "").trim();
    const detail = String(fd.get("heard_other") ?? "").trim();
    setStatus("sending");
    setError(null);
    const { ok, error: err } = await unlockDemoAccess({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      // "Other" on its own tells us nothing; the note beside it is the answer.
      heardAbout: picked === "Other" && detail ? `Other — ${detail}` : picked,
      demoUrl: url,
      website: String(fd.get("website") ?? ""),
    });
    if (!ok) {
      setStatus("error");
      setError(err ?? "Something went wrong — please email hello@phoxta.com and we'll open it up for you.");
      return;
    }
    // Reuses the existing funnel contract rather than minting a new event name.
    trackEvent("lead_submitted", { source: "demo" });
    trackEvent("demo_opened", { demo: title });
    setStatus("idle");
    onUnlocked();
  };

  const busy = status === "sending";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 4vh, 32px) 16px",
        background: "rgba(8, 8, 12, 0.6)",
        overflowY: "auto",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "min(460px, 100%)",
          background: "#fff",
          borderRadius: 18,
          padding: "clamp(20px, 3vw, 30px)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
          margin: "auto",
        }}
      >
        <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#0b0b0f", lineHeight: 1.25 }}>
          Take a look inside {title}
        </h3>
        <p style={{ fontSize: 14, color: "#5b6068", margin: "10px 0 20px" }}>
          Tell us who you are and the demo opens straight away — along with every other demo on the site for
          the next {DEMO_PASS_DAYS} days.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label htmlFor={`${id}-name`} style={labelStyle}>Full name</label>
            <input
              id={`${id}-name`} name="name" type="text" required autoFocus
              autoComplete="name" placeholder="Ada Lovelace" style={fieldStyle} disabled={busy}
            />
          </div>
          <div>
            <label htmlFor={`${id}-email`} style={labelStyle}>Email</label>
            <input
              id={`${id}-email`} name="email" type="email" required
              autoComplete="email" placeholder="you@company.com" style={fieldStyle} disabled={busy}
            />
          </div>
          <div>
            <label htmlFor={`${id}-phone`} style={labelStyle}>Phone number</label>
            <input
              id={`${id}-phone`} name="phone" type="tel" required
              autoComplete="tel" placeholder="+44 7700 900000" style={fieldStyle} disabled={busy}
            />
          </div>
          <div>
            <label htmlFor={`${id}-heard`} style={labelStyle}>How did you hear about Phoxta?</label>
            <select
              id={`${id}-heard`} name="heard" required value={heard} disabled={busy}
              onChange={(e) => setHeard(e.target.value)}
              style={{ ...fieldStyle, appearance: "auto" }}
            >
              <option value="" disabled>Choose one…</option>
              {HEARD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {heard === "Other" && (
            <div>
              <label htmlFor={`${id}-other`} style={labelStyle}>Where, exactly?</label>
              <input
                id={`${id}-other`} name="heard_other" type="text"
                placeholder="Tell us where you found us" style={fieldStyle} disabled={busy}
              />
            </div>
          )}
        </div>

        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={honeypotStyle} />

        {error && (
          <p role="alert" style={{ margin: "16px 0 0", fontSize: 14, color: "#b42318" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "13px 18px",
            borderRadius: 10,
            border: 0,
            background: busy ? "#3a3a3f" : "#0b0b0f",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: busy ? "progress" : "pointer",
          }}
        >
          {busy ? "Opening the demo…" : "Show me the demo"}
        </button>

        <p style={{ margin: "14px 0 0", fontSize: 12, color: "#8a8f98", lineHeight: 1.5 }}>
          We'll only use this to follow up about Phoxta. Read our{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "#5b6068", textDecoration: "underline" }}>
            privacy policy
          </a>
          .
        </p>
      </form>
    </div>
  );
}
