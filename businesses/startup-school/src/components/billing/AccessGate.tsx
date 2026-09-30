import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import type { AccessFeature } from "@/lib/access";
import { ACCESS_PLANS } from "@/lib/access";
import { useAccess } from "@/state/access";
import { useStaff } from "@/state/staff";
import { Button, Card, Sparkle } from "@/components/ui/primitives";

function Wait() {
    return <div className="grid min-h-dvh place-items-center bg-page"><span className="grid size-12 place-items-center rounded-full bg-brand"><Sparkle className="w-6 animate-[cs-spin-slow_4s_linear_infinite]" /></span></div>;
}

export function EntitlementGate() {
    const { ready, entitlement } = useAccess();
    const staff = useStaff();
    const { pathname } = useLocation();
    if (!ready || !staff.ready) return <Wait />;
    if (!entitlement && staff.isStaff) return <Navigate to="/staff" replace />;
    if (!entitlement) return <Navigate to="/pricing" replace state={{ from: pathname }} />;
    return <Outlet />;
}

export function FeatureGate({ feature }: { feature: AccessFeature }) {
    const { ready, can, plan } = useAccess();
    if (!ready) return <Wait />;
    if (can(feature)) return <Outlet />;
    const target = ACCESS_PLANS[feature];
    return (
        <div className="grid min-h-dvh place-items-center bg-page px-5 py-10">
            <Card className="w-full max-w-xl text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand"><Sparkle className="w-6" /></span>
                <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-brand">{target.name} access</p>
                <h1 className="mt-2 text-[25px] font-semibold">This part of Startup School is included with {target.name}.</h1>
                <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-muted">Your current access is {plan ? ACCESS_PLANS[plan].name : "not active"}. Choose a plan that includes this capability to continue.</p>
                <Link to="/pricing" className="mt-6 inline-flex"><Button>View programme options</Button></Link>
            </Card>
        </div>
    );
}
