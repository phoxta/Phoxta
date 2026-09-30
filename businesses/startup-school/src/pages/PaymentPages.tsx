import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAccess } from "@/state/access";
import { useTenant } from "@/state/tenant";
import { Button, Card, Sparkle } from "@/components/ui/primitives";

type StatusResponse = {
  active?: boolean;
  seatAllocated?: boolean;
  error?: string;
};

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const { tenant } = useTenant();
  const { refresh } = useAccess();
  const [state, setState] = useState<
    "checking" | "ready" | "allocation" | "waiting" | "error"
  >("checking");
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!tenant || !sessionId) {
      setState("error");
      return;
    }
    let alive = true;
    let attempts = 0;
    const check = async () => {
      const { data, error } = await supabase.functions.invoke<StatusResponse>(
        "startup-school-checkout",
        { body: { kind: "status", organizationId: tenant.id, sessionId } },
      );
      if (!alive) return;
      if (data?.active) {
        await refresh();
        if (alive)
          setState(data.seatAllocated === false ? "allocation" : "ready");
        return;
      }
      attempts += 1;
      if (error || data?.error) {
        setState("error");
        return;
      }
      if (attempts >= 12) {
        setState("waiting");
        return;
      }
      window.setTimeout(() => void check(), 1500);
    };
    void check();
    return () => {
      alive = false;
    };
  }, [refresh, sessionId, tenant]);

  const content =
    state === "ready"
      ? {
          icon: <CheckCircle2 className="text-mint" size={34} />,
          title: "Your Startup School access is ready.",
          body: "Payment is confirmed and your programme access is now active.",
          action: (
            <Link to="/">
              <Button>Open your workspace</Button>
            </Link>
          ),
        }
      : state === "allocation"
        ? {
            icon: <Clock3 className="text-brand" size={34} />,
            title: "Payment confirmed. Your intake needs attention.",
            body: "Your learning access is active, but this intake filled before payment confirmation arrived. We have opened a support request to arrange a place, transfer or refund. Please do not pay again.",
            action: (
              <Link to="/programme">
                <Button>View programme support</Button>
              </Link>
            ),
          }
        : state === "waiting"
          ? {
              icon: <Clock3 className="text-brand" size={34} />,
              title: "We are still checking your payment.",
              body: "Stripe's confirmation has not arrived yet. If your card was charged, do not pay again. Refresh this page shortly or contact programme support.",
              action: (
                <Link to="/programme">
                  <Button variant="outline">Programme support</Button>
                </Link>
              ),
            }
          : state === "error"
            ? {
                icon: <XCircle className="text-danger" size={34} />,
                title: "We could not confirm this checkout.",
                body: "If your card was charged, do not pay again. Please return to programme options or contact the Phoxta team with your payment receipt.",
                action: (
                  <Link to="/pricing">
                    <Button variant="outline">Back to programme options</Button>
                  </Link>
                ),
              }
            : {
                icon: (
                  <Sparkle className="w-[34px] animate-[cs-spin-slow_4s_linear_infinite] text-brand" />
                ),
                title: "Confirming your access…",
                body: "Stripe has returned you safely. We are waiting for the signed payment confirmation.",
                action: null,
              };

  return <PaymentFrame {...content} />;
}

export function PaymentCancelPage() {
  const [params] = useSearchParams();
  const { tenant } = useTenant();
  const [cancelled, setCancelled] = useState(false);
  useEffect(() => {
    const orderId = params.get("order_id");
    if (!tenant || !orderId) return;
    void supabase.functions
      .invoke("startup-school-checkout", {
        body: { kind: "cancel", organizationId: tenant.id, orderId },
      })
      .then(({ data }) => setCancelled(data?.cancelled === true));
  }, [params, tenant]);
  return (
    <PaymentFrame
      icon={<XCircle className="text-muted" size={34} />}
      title={cancelled ? "Checkout cancelled." : "You have left checkout."}
      body={
        cancelled
          ? "Your pending checkout has been cancelled and any reserved seat released. You can return whenever you are ready."
          : "If you completed payment in another tab, do not pay again. Otherwise, your pending seat reservation will expire automatically."
      }
      action={
        <Link to="/pricing">
          <Button>View programme options</Button>
        </Link>
      }
    />
  );
}

function PaymentFrame({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-page px-5">
      <Card className="w-full max-w-xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-soft">
          {icon}
        </span>
        <h1 className="mt-5 text-[25px] font-semibold">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-muted">
          {body}
        </p>
        {action && <div className="mt-6">{action}</div>}
      </Card>
    </main>
  );
}
