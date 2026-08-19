import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";

/**
 * Public, no-auth landing pages for the links Phoxta puts in customer
 * messages: the CSAT rating survey and marketing unsubscribe.
 *
 * These live on the Phoxta domain rather than calling the edge functions
 * directly, because the Supabase gateway forces `text/plain` + a sandbox CSP
 * on every function response — HTML served from *.supabase.co reaches the
 * customer as raw markup. The pages call the same functions with `json=1`.
 */
const FN = "https://ktgleoqvdikngocygdkn.supabase.co/functions/v1";

type State = { status: "idle" | "working" | "done" | "error"; message: string };

function Shell({ children }: { children: React.ReactNode }) {
  // The site header overlays the page, so clear it explicitly rather than
  // relying on section-padding — these pages have no hero to sit under it.
  return (
    <section style={{ paddingTop: 180, paddingBottom: 120, minHeight: "70vh" }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RatePage() {
  const [params] = useSearchParams();
  const cv = (params.get("cv") ?? "").trim();
  const [state, setState] = useState<State>({ status: "idle", message: "" });

  const rate = useCallback(
    async (score: number) => {
      setState({ status: "working", message: "" });
      try {
        const res = await fetch(`${FN}/csat?json=1&cv=${encodeURIComponent(cv)}&s=${score}`);
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || body.error) throw new Error(body.error || "Could not record your rating.");
        setState({ status: "done", message: "Thanks for the feedback — it goes straight to the team." });
      } catch (e) {
        setState({ status: "error", message: (e as Error).message });
      }
    },
    [cv],
  );

  return (
    <>
      <PageMeta title="Phoxta - Rate your experience" />
      <Shell>
        {!cv ? (
          <>
            <h4 className="fw-600 mb-2">Rating link not valid</h4>
            <p className="neutral-500 mb-0">Please use the link from the message we sent you.</p>
          </>
        ) : state.status === "done" ? (
          <>
            <h4 className="fw-600 mb-2">Thank you</h4>
            <p className="neutral-500 mb-0">{state.message}</p>
          </>
        ) : (
          <>
            <h4 className="fw-600 mb-2">How did we do?</h4>
            <p className="neutral-500 mb-4">Rate your recent experience from 1 to 5.</p>
            <div className="d-flex gap-2 justify-content-center mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="btn btn-outline-dark rounded-3 fw-600"
                  style={{ width: 56, height: 56 }}
                  disabled={state.status === "working"}
                  onClick={() => rate(n)}
                  aria-label={`Rate ${n} out of 5`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="d-flex justify-content-between fz-font-sm neutral-500" style={{ maxWidth: 340, margin: "0 auto" }}>
              <span>Not great</span>
              <span>Excellent</span>
            </div>
            {state.status === "error" && <p className="text-danger fz-font-md mt-3 mb-0">{state.message}</p>}
          </>
        )}
      </Shell>
    </>
  );
}

export function UnsubscribePage() {
  const [params] = useSearchParams();
  const c = (params.get("c") ?? "").trim();
  const o = (params.get("o") ?? "").trim();
  const ch = (params.get("ch") ?? "email").trim().toLowerCase() === "sms" ? "sms" : "email";
  const [state, setState] = useState<State>({ status: "working", message: "" });

  useEffect(() => {
    if (!c || !o) {
      setState({ status: "error", message: "This unsubscribe link is missing or malformed." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${FN}/unsubscribe?json=1&c=${encodeURIComponent(c)}&o=${encodeURIComponent(o)}&ch=${ch}`, { method: "POST" });
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;
        if (!res.ok || body.error) throw new Error(body.error || "Could not process your request.");
        setState({
          status: "done",
          message:
            ch === "sms"
              ? "You won't receive any more marketing texts from this business."
              : "You won't receive any more marketing emails from this business.",
        });
      } catch (e) {
        if (!cancelled) setState({ status: "error", message: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [c, o, ch]);

  return (
    <>
      <PageMeta title="Phoxta - Unsubscribe" />
      <Shell>
        {state.status === "working" ? (
          <p className="neutral-500 mb-0">Processing your request…</p>
        ) : state.status === "done" ? (
          <>
            <h4 className="fw-600 mb-2">You're unsubscribed</h4>
            <p className="neutral-500 mb-0">{state.message}</p>
          </>
        ) : (
          <>
            <h4 className="fw-600 mb-2">We couldn't process that</h4>
            <p className="neutral-500 mb-0">{state.message}</p>
          </>
        )}
      </Shell>
    </>
  );
}
