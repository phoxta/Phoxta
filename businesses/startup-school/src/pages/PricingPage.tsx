import { useEffect, useState } from "react";
import { useStaff } from "@/state/staff";
import { schoolCommand, schoolTime, type Intake } from "@/lib/staff";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ACCESS_PLANS,
  canAccess,
  formatFee,
  type AccessPlan,
} from "@/lib/access";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/state/access";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";
import { Button } from "@/components/ui/primitives";

const PLAN_ORDER: AccessPlan[] = ["self_study", "cohort", "launch"];

type CheckoutResponse = { url?: string; error?: string };

async function checkoutErrorMessage(
  error: unknown,
  payload?: CheckoutResponse | null,
): Promise<string> {
  if (payload?.error) return payload.error;
  // Supabase wraps non-2xx Edge Function responses. Read its JSON response
  // so a real payment issue is actionable instead of a generic status code.
  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: unknown }).context
      : null;
  if (context instanceof Response) {
    const detail = (await context
      .clone()
      .json()
      .catch(() => null)) as CheckoutResponse | null;
    if (detail?.error) return detail.error;
  }
  return error instanceof Error
    ? error.message
    : "We couldn't start secure checkout. Please try again.";
}

/** Programme admission. Stripe hosts card collection; this app only starts checkout. */
export default function PricingPage() {
  const { session, configured, signOut } = useAuth();
  const { tenant, name } = useTenant();
  const { plan: currentPlan } = useAccess();
  const { isStaff } = useStaff();
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [intakeId, setIntakeId] = useState("");
  const [intakeError, setIntakeError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  useEffect(() => {
    if (!tenant) return;
    let active = true;
    void supabase
      .rpc("cs_public_intakes", { p_org: tenant.id })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError)
          setIntakeError(
            "Intake dates could not be loaded. Please try again shortly.",
          );
        else setIntakes((data ?? []) as Intake[]);
      });
    return () => {
      active = false;
    };
  }, [tenant]);
  const location = useLocation();
  const navigate = useNavigate();
  const initial =
    (location.state as { selectedPlan?: AccessPlan } | null)?.selectedPlan ??
    null;
  const [busy, setBusy] = useState<AccessPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leaveAccount = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      setError("We couldn't sign you out. Please try again.");
    }
  };

  const checkout = async (plan: AccessPlan) => {
    setError(null);
    if (!configured || !tenant) {
      setError(
        "Startup School is still being connected. Please try again shortly.",
      );
      return;
    }
    if (!session) {
      navigate("/signup", { state: { selectedPlan: plan, from: "/pricing" } });
      return;
    }
    if (!termsAccepted) {
      setError(
        "Please review and accept the admission terms before continuing to payment.",
      );
      return;
    }
    setBusy(plan);
    try {
      if (plan !== "self_study" && !intakeId) {
        setError(
          "Choose an intake for Cohort or Launch admission. If no dates are open, contact programme support.",
        );
        return;
      }
      const { data, error: invokeError } =
        await supabase.functions.invoke<CheckoutResponse>(
          "startup-school-checkout",
          {
            body: {
              kind: "checkout",
              plan,
              organizationId: tenant.id,
              cohortId: plan === "self_study" ? undefined : intakeId,
              termsAccepted: true,
            },
          },
        );
      if (invokeError || !data?.url) {
        setError(await checkoutErrorMessage(invokeError, data));
        return;
      }
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(await checkoutErrorMessage(checkoutError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-dvh overflow-x-clip bg-[radial-gradient(circle_at_86%_8%,rgba(242,120,63,0.24),transparent_25rem),radial-gradient(circle_at_8%_28%,rgba(255,219,180,0.72),transparent_24rem),#f7f4ee] px-4 py-5 sm:px-6 sm:py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl rounded-[22px] border border-white/80 bg-white/65 p-2 shadow-app backdrop-blur-[2px] sm:p-3">
        <div className="overflow-hidden rounded-[16px] border border-white/80 bg-[linear-gradient(118deg,#fffefa_0%,#faf1e6_52%,#ffd0a2_100%)] px-5 py-7 sm:px-8 sm:py-10 md:px-12 md:py-12">
          <nav
            aria-label="Pricing navigation"
            className="mb-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-[13px] font-medium text-ink"
          >
            <a
              href="https://www.phoxta.com/startup-school"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to Startup School
            </a>
            <div className="flex flex-wrap items-center gap-5">
              {isStaff && (
                <Link
                  to="/staff"
                  className="inline-flex min-h-11 items-center hover:text-brand"
                >
                  Staff workspace
                </Link>
              )}
              {session && (
                <Link
                  to="/programme"
                  className="inline-flex min-h-11 items-center hover:text-brand"
                >
                  Programme support
                </Link>
              )}
              {currentPlan && (
                <Link
                  to="/"
                  className="inline-flex min-h-11 items-center rounded-lg hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  My learning
                </Link>
              )}
              {session ? (
                <button
                  type="button"
                  onClick={() => void leaveAccount()}
                  className="inline-flex min-h-11 items-center rounded-lg hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex min-h-11 items-center rounded-lg hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
          <header className="flex flex-col gap-6 border-b border-ink/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="mt-4 max-w-2xl text-[37px] font-bold leading-[0.98] tracking-[-0.055em] text-ink sm:text-[52px] md:text-[64px]">
                Pricing
              </h1>
            </div>
            <p className="max-w-sm text-[14px] leading-6 text-muted sm:pb-1">
              Build and launch with {name}. Study at your own pace, or join a
              cohort for instructor-led classes and mentorship.
            </p>
          </header>

          {error && (
            <p
              role="alert"
              className="mx-auto mt-6 max-w-xl rounded-xl bg-danger-soft px-4 py-3 text-center text-[14px] text-danger-ink"
            >
              {error}
            </p>
          )}

          <div className="mt-6 rounded-xl border border-line bg-white/70 p-4 sm:p-5">
            <label
              className="block text-sm font-semibold"
              htmlFor="admission-intake"
            >
              Joining Cohort or Launch? Choose your intake.
            </label>
            {intakes.length > 0 ? (
              <>
                <select
                  id="admission-intake"
                  className="mt-3 min-h-12 w-full rounded-xl border border-line-strong bg-white px-3 text-sm"
                  value={intakeId}
                  onChange={(e) => setIntakeId(e.target.value)}
                >
                  <option value="">Select an intake</option>
                  {intakes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {schoolTime(c.starts_at, c.timezone)} (
                      {c.timezone}) ·{" "}
                      {c.seats_left == null
                        ? "Open enrolment · no cap"
                        : `${c.seats_left} places available`}
                    </option>
                  ))}
                </select>
                {intakeId &&
                  intakes.find((c) => c.id === intakeId)?.seats_left === 0 && (
                    <button
                      className="mt-3 min-h-11 text-sm font-semibold text-brand underline"
                      onClick={() => {
                        if (!session) {
                          navigate("/signup", { state: { from: "/pricing" } });
                          return;
                        }
                        void schoolCommand(tenant!.id, "waitlist", {
                          cohort_id: intakeId,
                        })
                          .then(() =>
                            setError(
                              "You're on the waitlist. No payment has been taken.",
                            ),
                          )
                          .catch((e) => setError(e.message));
                      }}
                    >
                      Join this intake's waitlist
                    </button>
                  )}
              </>
            ) : (
              <p
                id="admission-intake"
                className="mt-2 text-sm leading-6 text-muted"
              >
                {intakeError ||
                  "New cohort dates will appear here when admissions open. Self-study is available now."}
              </p>
            )}
            <p className="mt-2 text-xs leading-5 text-muted">
              Self-study does not require an intake. Cohort seats are held
              during secure checkout.
            </p>
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-line bg-white/70 p-4 text-sm leading-6 sm:p-5">
            <p>
              One year of course access. Cohort and Launch include weekly
              mentoring during your intake, with up to three sessions a week
              where mentor slots are available. Launch includes three months of
              Operating Console access from provisioning, without automatic paid
              renewal.
            </p>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-brand"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>
                I have read and accept the{" "}
                <Link
                  to="/admission-terms"
                  target="_blank"
                  className="font-semibold text-brand underline"
                >
                  admission, cancellation and transfer terms
                </Link>
                . Access begins after payment. I retain the stated 14-day
                cancellation right.
              </span>
            </label>
          </div>
          <div className="mt-7 grid gap-4 lg:grid-cols-3 lg:gap-5">
            {PLAN_ORDER.map((key) => {
              const item = ACCESS_PLANS[key];
              const active = currentPlan === key;
              const included = canAccess(currentPlan, key);
              const featured = key === "cohort";
              return (
                <article
                  key={key}
                  className={`relative flex min-w-0 flex-col rounded-[18px] bg-card p-2 shadow-[0_4px_24px_rgba(58,22,12,0.08)] ${featured ? "ring-1 ring-brand/35" : "ring-1 ring-ink/5"}`}
                >
                  <div
                    className={`flex min-h-[238px] flex-col rounded-[13px] p-5 sm:p-6 ${featured ? "bg-brand-soft" : key === "launch" ? "bg-[#f6e9da]" : "bg-[#f5f0e9]"}`}
                  >
                    <div className="flex min-h-7 flex-wrap items-center justify-between gap-3">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand">
                        {item.name}
                      </p>
                      {featured && (
                        <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-white">
                          Most popular
                        </span>
                      )}
                      {key === "launch" && (
                        <span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-white">
                          Complete path
                        </span>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap items-end gap-2">
                      <span className="text-[48px] font-semibold leading-none tracking-[-0.065em] text-ink">
                        {formatFee(item.price)}
                      </span>
                      <span className="mb-1 text-[13px] text-muted">
                        one-off
                      </span>
                    </div>
                    <p className="mt-4 max-w-[31rem] text-[14px] leading-6 text-muted">
                      {item.description}
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-5 text-[12px] font-semibold text-brand">
                      <span className="grid size-5 place-items-center rounded-full bg-white/80">
                        <ArrowRight size={13} strokeWidth={2.4} />
                      </span>{" "}
                      Secure card checkout
                    </div>
                  </div>

                  <ul className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
                    {item.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-[14px] leading-5 text-ink"
                      >
                        <Check
                          size={17}
                          className="mt-0.5 shrink-0 text-brand"
                          strokeWidth={2.5}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                    <Button
                      block
                      variant={featured ? "brand" : "outline"}
                      disabled={busy !== null || included}
                      onClick={() => void checkout(key)}
                    >
                      {busy === key ? (
                        <>
                          <LoaderCircle size={16} className="animate-spin" />{" "}
                          Opening secure checkout
                        </>
                      ) : active ? (
                        "Your current access"
                      ) : included ? (
                        "Included in your access"
                      ) : initial === key ? (
                        `Continue with ${item.name}`
                      ) : (
                        `Choose ${item.name}`
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <footer className="mt-7 flex flex-col items-center justify-center gap-2 border-t border-ink/10 pt-6 text-center text-[12px] leading-5 text-muted sm:flex-row sm:gap-3">
            <ShieldCheck size={17} className="shrink-0 text-brand" />
            <span>
              Card payments are securely processed by Stripe. Access is
              activated only after Stripe confirms payment.
            </span>
          </footer>
        </div>
      </div>
    </main>
  );
}
