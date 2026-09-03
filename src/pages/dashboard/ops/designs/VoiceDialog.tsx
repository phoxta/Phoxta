import { useCallback, useEffect, useState } from "react";
import { toast, toastError } from "@/lib/ops/feedback";
import {
  type VoiceRow, type VoiceSpec,
  generateVoice, getVoice, saveVoice,
} from "@/lib/db/ops/voice";

/**
 * "How you sound" — read back to the owner, for them to correct.
 *
 * NOBODY FILLS IN A BLANK BRAND-VOICE FORM. Every tool that has tried has the
 * same abandoned field sitting in its database. So this never asks; it reads
 * the replies they have actually sent, the words their customers use back, and
 * their own rules, and shows them a description to argue with. Correcting
 * something wrong is a thing people will do.
 *
 * EVERY TRAIT SAYS WHERE IT CAME FROM. A description of your own voice that
 * cites forty real conversations is worth reading; the same paragraph with
 * nothing behind it is horoscope. The evidence list is therefore not a debug
 * panel — it is the reason to believe the rest, and it says "proposal" out loud
 * where there was nothing to read.
 */
export function VoiceDialog({ orgId, open, onClose }: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [row, setRow] = useState<VoiceRow | null>(null);
  const [spec, setSpec] = useState<VoiceSpec | null>(null);
  const [ownerInput, setOwnerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"read" | "save" | "approve" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getVoice(orgId);
    setLoading(false);
    if (error) return toastError(error);
    setRow(data?.voice ?? null);
    setSpec(data?.voice?.spec ?? null);
    setOwnerInput(data?.voice?.owner_input ?? "");
  }, [orgId]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose, busy]);

  async function read() {
    setBusy("read");
    const { data, error } = await generateVoice(orgId, ownerInput);
    setBusy(null);
    if (error) return toastError(error);
    setSpec(data?.spec ?? null);
    setRow((p) => ({
      ...(p ?? { owner_input: "", model: null, generated_at: null, approved_at: null }),
      spec: data?.spec ?? {},
      source: data?.source ?? {},
      status: "draft",
    } as VoiceRow));
    toast("Read what you have written");
  }

  async function commit(approve: boolean) {
    if (!spec) return;
    setBusy(approve ? "approve" : "save");
    const { error } = await saveVoice(orgId, spec, { approve, ownerInput });
    setBusy(null);
    if (error) return toastError(error);
    toast(approve ? "Approved — everything Phoxta writes will sound like this" : "Saved as a draft");
    void load();
  }

  if (!open) return null;

  const src = row?.source ?? {};
  const readCounts = [
    src.ourReplies ? `${src.ourReplies} of your own replies` : "",
    src.reviews ? `${src.reviews} reviews` : "",
    src.customerMessages ? `${src.customerMessages} customer messages` : "",
    src.faqs ? `${src.faqs} FAQ answers` : "",
    src.blogPosts ? `${src.blogPosts} articles` : "",
  ].filter(Boolean);

  const ev = spec?.evidence ?? [];
  const proposals = ev.filter((e) => e.source === "proposal").length;

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="How you sound"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box" style={{ width: "min(820px, 96vw)" }}>
        <div className="pln-header">
          <div className="pln-header-left">
            <h3 className="pln-header-title">How you sound</h3>
            {row && (
              <div className="pln-header-meta">
                <span className={`vcx-status ${row.status === "approved" ? "is-approved" : ""}`}>
                  {row.status === "approved" ? "Approved by you" : "Draft — not yet confirmed"}
                </span>
              </div>
            )}
          </div>
          <button type="button" className="dsn-x" onClick={onClose} disabled={!!busy} aria-label="Close">×</button>
        </div>

        <div className="pln-body-scroll">
          <div className="vcx">
            {loading && <p className="pln-coverage-gap">Reading…</p>}

            {/* What it read. Shown before the description itself, because the
                description means something different depending on the answer. */}
            {!loading && (
              <div className="pln-coverage">
                <p className="pln-coverage-read">
                  {readCounts.length
                    ? `Read ${readCounts.join(", ")}.`
                    : "Nothing read yet."}
                </p>
                {!!proposals && (
                  <p className="pln-coverage-gap">
                    {proposals === ev.length
                      ? "You have published almost nothing, so all of this is a proposal for your trade rather than a description of you. Correct it, or paste in something you have written and read again."
                      : `${proposals} of these are proposals rather than things you have actually written.`}
                  </p>
                )}
              </div>
            )}

            {/* The owner's own words carry more weight than anything derived,
                so they go in verbatim and a re-read is told to weigh them first. */}
            <label className="pln-label" htmlFor="vcx-own">Anything you would like it to read</label>
            <textarea
              id="vcx-own"
              className="pln-textarea"
              rows={3}
              placeholder="Paste a post you are proud of, or describe how you want to come across. Optional — it reads your inbox and reviews either way."
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
            />

            {/* Once a description exists, approving it is the action that
                matters — so reading again steps back to a quiet button rather
                than competing with it for the same weight. */}
            <div className="vcx-actions">
              <button
                type="button"
                className={spec ? "pln-btn-ghost" : "pln-btn-primary"}
                onClick={() => void read()}
                disabled={!!busy}
              >
                {busy === "read"
                  ? <><span className="pln-loader"><span></span><span></span><span></span></span>Reading…</>
                  : spec ? "Read again" : "Read what I have written"}
              </button>
              {spec && (
                <>
                  <button type="button" className="pln-btn-ghost" onClick={() => void commit(false)} disabled={!!busy}>
                    {busy === "save" ? "Saving…" : "Save draft"}
                  </button>
                  <button type="button" className="pln-btn-primary vcx-approve" onClick={() => void commit(true)} disabled={!!busy}>
                    {busy === "approve" ? "Approving…" : "This is us"}
                  </button>
                </>
              )}
            </div>

            {spec && <VoiceBody spec={spec} onChange={setSpec} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The description itself. Editable where editing is the point — the summary
 *  and the word lists — and read-only where it is evidence. */
function VoiceBody({ spec, onChange }: { spec: VoiceSpec; onChange: (s: VoiceSpec) => void }) {
  const set = (patch: Partial<VoiceSpec>) => onChange({ ...spec, ...patch });
  const words = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="vcx-body">
      <section className="pln-block vcx-sec">
        <h4 className="pln-block-title">In one paragraph</h4>
        <textarea
          className="pln-textarea"
          rows={4}
          value={spec.summary ?? ""}
          onChange={(e) => set({ summary: e.target.value })}
        />
      </section>

      {!!spec.personality?.length && (
        <section className="pln-block vcx-sec">
          <h4 className="pln-block-title">What you are like</h4>
          <ul className="pln-obs-list">
            {spec.personality.map((p, i) => (
              <li className="pln-obs" key={i}>
                <p className="pln-obs-what">{p.trait}</p>
                <p className="pln-obs-evidence">{p.meansInCopy}</p>
                {p.notThis && <p className="vcx-not">Not: {p.notThis}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(spec.register || spec.sentence) && (
        <section className="pln-block vcx-sec">
          <h4 className="pln-block-title">How it reads</h4>
          <ul className="vcx-facts">
            {spec.register?.formality && <li><b>Formality</b> {spec.register.formality}</li>}
            {spec.register?.person && <li><b>Speaks as</b> “{spec.register.person}”</li>}
            {spec.register?.humour && <li><b>Humour</b> {spec.register.humour}</li>}
            {spec.register?.emoji && <li><b>Emoji</b> {spec.register.emoji}</li>}
            {spec.sentence?.length && <li><b>Sentences</b> {spec.sentence.length}</li>}
            {spec.sentence?.openings && <li><b>Openings</b> {spec.sentence.openings}</li>}
            {spec.sentence?.punctuation && <li><b>Punctuation</b> {spec.sentence.punctuation}</li>}
          </ul>
        </section>
      )}

      <section className="pln-block vcx-sec">
        <h4 className="pln-block-title">Words</h4>
        <label className="pln-label" htmlFor="vcx-say">Words you use</label>
        <input
          id="vcx-say"
          className="pln-param-input vcx-wide"
          value={(spec.lexicon?.weSay ?? []).join(", ")}
          onChange={(e) => set({ lexicon: { ...spec.lexicon, weSay: words(e.target.value) } })}
        />
        <label className="pln-label" htmlFor="vcx-never">Words you never use</label>
        <input
          id="vcx-never"
          className="pln-param-input vcx-wide"
          value={(spec.lexicon?.weNeverSay ?? []).join(", ")}
          onChange={(e) => set({ lexicon: { ...spec.lexicon, weNeverSay: words(e.target.value) } })}
        />
      </section>

      {/* The part nobody else can do: real phrases, from real customers. */}
      {!!spec.lexicon?.customerWords?.length && (
        <section className="pln-block vcx-sec">
          <h4 className="pln-block-title">What your customers actually say</h4>
          <p className="pln-coverage-gap">Lifted word for word. Copy that uses these reads as recognition rather than marketing.</p>
          <ul className="vcx-quotes">
            {spec.lexicon.customerWords.map((c, i) => (
              <li key={i}>“{c.phrase}” <span className="pln-obs-chip">{c.seenIn}</span></li>
            ))}
          </ul>
        </section>
      )}

      {/* The allowlist. An empty one is the honest answer for a business with
          no reviews, and saying so is more useful than an empty section. */}
      <section className="pln-block vcx-sec">
        <h4 className="pln-block-title">What you may claim about yourself</h4>
        {spec.proof?.length ? (
          <ul className="vcx-proof">
            {spec.proof.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        ) : (
          <p className="pln-coverage-gap">
            Nothing yet — you have no published reviews to back a claim. Phoxta will write about what you
            do and sell, and will not say you are trusted, loved or award-winning until customers have said it.
          </p>
        )}
      </section>

      {!!spec.examples?.length && (
        <section className="pln-block vcx-sec">
          <h4 className="pln-block-title">Examples</h4>
          {spec.examples.map((e, i) => (
            <div className="vcx-eg" key={i}>
              <p className="vcx-eg-ctx">{e.context}</p>
              <p className="vcx-eg-good">{e.good}</p>
              <p className="vcx-eg-bad">{e.bad}</p>
              {e.why && <p className="pln-coverage-gap">{e.why}</p>}
            </div>
          ))}
        </section>
      )}

      {!!spec.evidence?.length && (
        <section className="pln-block vcx-sec">
          <h4 className="pln-block-title">Where this came from</h4>
          <ul className="pln-obs-list">
            {spec.evidence.map((e, i) => (
              <li className="pln-obs" key={i}>
                <p className="pln-obs-what">{e.claim}</p>
                <p className="pln-obs-evidence">
                  {e.basis}
                  <span className={`pln-obs-chip ${e.source === "proposal" ? "is-proposal" : ""}`}>
                    {e.source === "proposal" ? "a proposal, not observed" : e.source}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
