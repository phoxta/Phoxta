import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  StaffPanel,
  Notice,
  ActionForm,
  ActionButton,
} from "@/components/staff/StaffUI";

export default function SecurityPage() {
  const [factor, setFactor] = useState<{
    id: string;
    qr?: string;
    secret?: string;
  } | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const refresh = async () => {
    const { data, error: e } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (e) throw e;
    setVerified(data?.currentLevel === "aal2");
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const current = factors?.totp.find((f) => f.status === "verified");
    if (current) setFactor({ id: current.id });
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, []);
  const enrol = async () => {
    const { data, error: e } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Startup School authenticator",
    });
    if (e || !data) throw e ?? new Error("Could not enrol authenticator.");
    setFactor({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };
  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold">Account security</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Use an authenticator app to approve staff invitations, refunds and
          business provisioning. This protects school operations; it does not
          add phone verification to card checkout.
        </p>
      </header>
      {error && <Notice error>{error}</Notice>}
      <StaffPanel title="Two-factor authentication">
        {verified ? (
          <Notice>Your session is verified for sensitive staff actions.</Notice>
        ) : factor ? (
          <>
            <p className="text-sm leading-6">
              {factor.qr
                ? "Scan this QR code with your authenticator app. Keep the setup code private."
                : "Enter the current six-digit code from your authenticator app."}
            </p>
            {factor.qr && (
              <img
                src={
                  factor.qr.startsWith("data:")
                    ? factor.qr
                    : `data:image/svg+xml;utf8,${encodeURIComponent(factor.qr)}`
                }
                alt="Authenticator setup QR code"
                className="size-48 bg-white"
              />
            )}
            {factor.secret && (
              <details>
                <summary className="cursor-pointer text-sm">
                  Can't scan? Show setup code
                </summary>
                <code className="block break-all p-4 text-sm">
                  {factor.secret}
                </code>
              </details>
            )}
            <ActionForm
              submitLabel="Verify authenticator"
              fields={[{ name: "code", label: "Six-digit code", type: "text" }]}
              onSubmit={async (v) => {
                if (!/^\d{6}$/.test(v.code))
                  throw new Error("Enter six digits.");
                const { error: e } = await supabase.auth.mfa.challengeAndVerify(
                  { factorId: factor.id, code: v.code },
                );
                if (e) throw e;
                await refresh();
              }}
            />
          </>
        ) : (
          <ActionButton action={enrol}>Set up authenticator</ActionButton>
        )}
      </StaffPanel>
      <StaffPanel title="Password">
        <ActionForm
          submitLabel="Update password"
          fields={[
            { name: "password", label: "New password", type: "password" },
            {
              name: "confirm",
              label: "Confirm new password",
              type: "password",
            },
          ]}
          onSubmit={async (v) => {
            if (v.password.length < 12)
              throw new Error("Use at least 12 characters.");
            if (v.password !== v.confirm)
              throw new Error("Passwords do not match.");
            const { error: e } = await supabase.auth.updateUser({
              password: v.password,
            });
            if (e) throw e;
          }}
        />
      </StaffPanel>
    </>
  );
}
