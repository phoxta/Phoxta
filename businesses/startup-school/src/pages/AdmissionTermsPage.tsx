import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/state/tenant";

export default function AdmissionTermsPage() {
  const { tenant } = useTenant();
  const [terms, setTerms] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!tenant) return;
    let alive = true;
    void supabase
      .rpc("cs_public_school_terms", { p_org: tenant.id })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data)
          setError(
            "We couldn't load admission terms. Please reload before paying.",
          );
        else setTerms(data);
      });
    return () => {
      alive = false;
    };
  }, [tenant]);
  return (
    <main className="min-h-dvh bg-page px-5 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <nav className="flex flex-wrap gap-6 text-sm font-semibold text-brand">
          <Link to="/pricing">← Back to pricing</Link>
          <Link to="/programme">Programme support</Link>
        </nav>
        <h1 className="text-3xl font-semibold">
          Your admission, clearly explained
        </h1>
        <p className="text-sm leading-6 text-muted">
          One-off fees: Self-study £250, Cohort £1,200, Launch £5,000. No
          automatic renewal. These programme policies sit alongside{" "}
          <a
            href="https://www.phoxta.com/terms"
            className="text-brand underline"
          >
            Phoxta's general terms
          </a>{" "}
          and do not reduce your statutory rights.
        </p>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {!terms && !error && <p role="status">Loading admission terms…</p>}
        {terms &&
          (
            [
              ["access_policy", "One year of learning access"],
              ["mentoring_policy", "Classes and mentoring"],
              ["cancellation_policy", "Cancellation, refunds and transfers"],
              ["launch_terms", "Your Launch business and console access"],
            ] as const
          ).map(([key, title]) => (
            <section
              key={key}
              className="rounded-2xl border border-line bg-white p-6"
            >
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">
                {terms[key]}
              </p>
            </section>
          ))}
        <section className="rounded-2xl border border-line p-6">
          <h2 className="text-lg font-semibold">
            Request a cancellation or transfer
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Use Programme support with the subject “Cancellation” or “Intake
            transfer”, your name, admission and payment reference. For a
            transfer, include your preferred intake. You may also contact Phoxta
            directly; you do not have to use a particular form.
          </p>
          <Link
            to="/programme"
            className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand"
          >
            Open programme support →
          </Link>
        </section>
      </div>
    </main>
  );
}
