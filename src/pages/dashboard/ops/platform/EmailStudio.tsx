import { useMemo, useState } from "react";
import { Card, Chip } from "@/components/dash/Ui";
import { MESSAGES, type Message } from "@/lib/email/catalogue";

/**
 * Every email the platform sends, previewed exactly as it will arrive.
 *
 * The preview imports the SAME renderer the edge functions call — one module,
 * aliased as @email — so this cannot drift from what a customer receives. A
 * preview built from its own copy of the template is worse than no preview:
 * it is a picture of an email nobody is sent.
 *
 * Three things are on screen at once on purpose: the phone width, because most
 * of these are read on one; the inbox line, because the subject and preheader
 * do more work than the body; and the plain-text part, because it is what
 * watches, screen readers and stripped-down clients actually show and it is
 * the half nobody ever looks at.
 */

const WIDTHS = [
  { id: "phone", label: "Phone", px: 390 },
  { id: "desktop", label: "Desktop", px: 720 },
] as const;

export function EmailStudio() {
  const [id, setId] = useState<Message["id"]>(MESSAGES[0].id);
  const [width, setWidth] = useState<(typeof WIDTHS)[number]["id"]>("phone");
  const [showText, setShowText] = useState(false);

  const message = useMemo(() => MESSAGES.find((m) => m.id === id) ?? MESSAGES[0], [id]);
  const rendered = useMemo(() => message.render(), [message]);
  const px = WIDTHS.find((w) => w.id === width)!.px;

  return (
    <>
      <Card title="Email">
        <p className="opx-note">
          Every message Phoxta sends, rendered by the same template the edge functions use — so what is on
          screen here is what lands in someone&apos;s inbox. Pick a message to review it.
        </p>
        <div className="emx-tabs">
          {MESSAGES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`emx-tab${m.id === id ? " is-on" : ""}`}
              onClick={() => setId(m.id)}
            >
              <span className="emx-tab__s">{m.subject}</span>
              <span className="emx-tab__m">
                {m.sentBy} · as {m.brandedAs === "Phoxta" ? "Phoxta" : "the business"}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card
        title={message.subject}
        right={
          <div className="d-flex gap-2 align-items-center">
            {WIDTHS.map((w) => (
              <button key={w.id} type="button"
                      className={`hrx-seeall${width === w.id ? " opx-solid" : ""}`}
                      onClick={() => setWidth(w.id)}>{w.label}</button>
            ))}
            <button type="button" className={`hrx-seeall${showText ? " opx-solid" : ""}`}
                    onClick={() => setShowText((v) => !v)}>Plain text</button>
          </div>
        }
      >
        {/* The inbox line. The subject and preheader are read far more often
            than the body — most people triage without opening — so they are
            shown as they appear in a list, not buried in a spec. */}
        <div className="emx-inbox">
          <div className="emx-inbox__from">{message.brandedAs === "Phoxta" ? "Phoxta" : "Aurelia Studio"}</div>
          <div className="emx-inbox__sub">{message.subject}</div>
          <div className="emx-inbox__pre">{preheaderOf(rendered.html)}</div>
        </div>

        <p className="opx-note">
          <Chip tone="line">{message.audience}</Chip>
        </p>

        {showText ? (
          <pre className="emx-text">{rendered.text}</pre>
        ) : (
          <div className="emx-stage">
            {/* srcDoc, not a data: URI — the frame gets its own document with
                no access to this one, and the email's own <html> wrapper is
                honoured rather than being nested inside the console's. */}
            <iframe
              key={`${message.id}-${width}`}
              title={`Preview of ${message.subject}`}
              srcDoc={rendered.html}
              style={{ width: px, height: 820 }}
              sandbox=""
            />
          </div>
        )}
      </Card>

      <style>{CSS}</style>
    </>
  );
}

/** Pull the preheader back out of the rendered html, so the inbox line shows
 *  the real one rather than a second copy that could disagree with it. */
function preheaderOf(html: string): string {
  const m = /max-height:0;max-width:0;opacity:0;overflow:hidden">([^<]*)</.exec(html);
  return (m?.[1] ?? "").replace(/&#847;|&zwnj;|&nbsp;/g, "").trim();
}

const CSS = `
.emx-tabs{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;margin-top:12px}
.emx-tab{text-align:left;padding:10px 12px;border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card);cursor:pointer}
.emx-tab:hover{border-color:var(--hrx-muted)}
.emx-tab.is-on{border-color:var(--hrx-ink);box-shadow:0 0 0 1px var(--hrx-ink)}
.emx-tab__s{display:block;font-size:13.5px;font-weight:600;color:var(--hrx-ink);line-height:1.35}
.emx-tab__m{display:block;margin-top:3px;font-size:11.5px;color:var(--hrx-muted)}
.emx-inbox{border:1px solid var(--hrx-border);border-radius:12px;padding:12px 14px;margin-bottom:12px;background:var(--hrx-soft)}
.emx-inbox__from{font-size:13px;font-weight:700;color:var(--hrx-ink)}
.emx-inbox__sub{font-size:14px;font-weight:600;color:var(--hrx-ink);margin-top:2px}
.emx-inbox__pre{font-size:13px;color:var(--hrx-muted);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.emx-stage{display:flex;justify-content:center;padding:16px;background:#eceef6;border-radius:14px;overflow:auto}
.emx-stage iframe{border:0;border-radius:10px;background:#fff;box-shadow:0 6px 24px rgb(20 25 78 / 12%)}
.emx-text{margin:0;padding:18px;background:var(--hrx-soft);border:1px solid var(--hrx-border);border-radius:12px;font-size:13px;line-height:1.65;white-space:pre-wrap;color:var(--hrx-ink)}
`;
