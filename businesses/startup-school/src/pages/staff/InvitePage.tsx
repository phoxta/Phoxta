import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/state/auth";
import { useStaff } from "@/state/staff";
import { useTenant } from "@/state/tenant";
import { schoolCommand } from "@/lib/staff";
import { StaffPanel, Notice, ActionButton } from "@/components/staff/StaffUI";
export default function InvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { session, signOut } = useAuth();
  const { tenant } = useTenant();
  const { refresh } = useStaff();
  const navigate = useNavigate();
  const from = `/staff/invite?token=${encodeURIComponent(token)}`;
  return (
    <main className="min-h-dvh bg-page px-4 py-12">
      <div className="mx-auto max-w-xl space-y-5">
        <Link to="/pricing" className="text-sm font-semibold text-brand">
          ← Startup School
        </Link>
        <StaffPanel
          title="Join the Startup School team"
          description="Use the verified email address your invitation was created for. Accepting an invitation gives you the assigned staff responsibilities, not a paid learner plan."
        >
          {!/^([a-f0-9]{64})$/.test(token) ? (
            <Notice error>
              This invitation link is incomplete. Ask an administrator for a new
              invitation.
            </Notice>
          ) : !session ? (
            <div className="flex flex-wrap gap-5">
              <Link
                to="/login"
                state={{ from }}
                className="min-h-11 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
              >
                Sign in to accept
              </Link>
              <Link
                to="/signup"
                state={{ from }}
                className="min-h-11 rounded-full border border-line px-5 py-3 text-sm font-semibold"
              >
                Create an account
              </Link>
            </div>
          ) : (
            <>
              <p className="break-all text-sm">
                Signed in as {session.user.email}
              </p>
              <ActionButton
                action={async () => {
                  await schoolCommand(tenant!.id, "accept_invite", { token });
                  await refresh();
                  navigate("/staff", { replace: true });
                }}
              >
                Accept staff invitation
              </ActionButton>
              <ActionButton action={signOut}>
                Use a different account
              </ActionButton>
            </>
          )}
        </StaffPanel>
      </div>
    </main>
  );
}
