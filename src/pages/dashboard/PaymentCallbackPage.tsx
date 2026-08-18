import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageMeta from "@/seo/PageMeta";
import { verifyPayment } from "@/lib/db/payments";
import { clearCachedData } from "@/lib/hooks/useCachedData";

type Phase = "checking" | "success" | "pending" | "failed";

/**
 * Paystack sends the buyer back here (?reference=…) after the hosted payment
 * page. We verify server-side, wait briefly for the webhook to finish
 * fulfilment (provisioning / plan activation), then send the buyer onward.
 */
export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [phase, setPhase] = useState<Phase>(reference ? "checking" : "failed");
  const [kind, setKind] = useState<"blueprint" | "subscription" | null>(null);
  const [error, setError] = useState<string | null>(reference ? null : "No payment reference found.");
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!reference) return;
    let active = true;

    const check = async () => {
      const { data, error } = await verifyPayment(reference);
      if (!active) return;
      if (error || !data) {
        setError(error ?? "Could not verify the payment.");
        setPhase("failed");
        return;
      }
      setKind(data.kind);
      if (data.status !== "success") {
        setError("The payment was not completed.");
        setPhase("failed");
        return;
      }
      if (data.fulfilled) {
        // New business / plan exists now — drop stale dashboard caches.
        clearCachedData();
        setPhase("success");
        const dest = data.kind === "blueprint" ? "/dashboard/businesses" : "/dashboard/billing";
        setTimeout(() => navigate(dest, { replace: true }), 1600);
        return;
      }
      // Paid but the webhook hasn't landed yet — poll a few times, then let the
      // buyer continue; fulfilment completes in the background.
      if (attemptsRef.current++ < 10) {
        setTimeout(check, 1500);
      } else {
        setPhase("pending");
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [reference, navigate]);

  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
      <PageMeta title="Phoxta - Payment" noindex />
      <div className="bg-neutral-0 rounded-4 p-5 border-100 text-center" style={{ maxWidth: 460 }}>
        {phase === "checking" && (
          <>
            <div className="spinner-border text-dark mb-3" role="status" aria-label="Verifying payment" />
            <h5 className="fw-600 mb-1">Confirming your payment…</h5>
            <p className="neutral-500 mb-0 fz-font-md">This usually takes a few seconds.</p>
          </>
        )}
        {phase === "success" && (
          <>
            <div className="fz-40 mb-2">🎉</div>
            <h5 className="fw-600 mb-1">Payment confirmed</h5>
            <p className="neutral-500 mb-0 fz-font-md">
              {kind === "blueprint" ? "Your business is being set up — taking you there now." : "Your plan is active — taking you to billing."}
            </p>
          </>
        )}
        {phase === "pending" && (
          <>
            <div className="fz-40 mb-2">✅</div>
            <h5 className="fw-600 mb-1">Payment received</h5>
            <p className="neutral-500 mb-3 fz-font-md">
              Setup is finishing in the background — it will appear in your dashboard shortly.
            </p>
            <Link to={kind === "subscription" ? "/dashboard/billing" : "/dashboard/businesses"} className="at-btn">
              <span>
                <span className="text-1">Go to dashboard</span>
                <span className="text-2">Go to dashboard</span>
              </span>
            </Link>
          </>
        )}
        {phase === "failed" && (
          <>
            <div className="fz-40 mb-2">⚠️</div>
            <h5 className="fw-600 mb-1">Payment not completed</h5>
            <p className="neutral-500 mb-3 fz-font-md">{error}</p>
            <Link to="/dashboard/marketplace" className="at-btn">
              <span>
                <span className="text-1">Back to marketplace</span>
                <span className="text-2">Back to marketplace</span>
              </span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
