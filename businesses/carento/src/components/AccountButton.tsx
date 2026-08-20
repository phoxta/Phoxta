import { Link } from "react-router-dom";
import { useAccount } from "@/util/account";

/**
 * Account entry point.
 *
 * Deliberately a floating launcher rather than a header link: each storefront
 * runs a different vendor template with several header variants chosen at
 * runtime, so editing them would risk breaking layouts for no gain. This mounts
 * beside the assistant, is visible on every page, and cannot disturb the theme.
 *
 * Sits bottom-LEFT so it never collides with the assistant panel, which opens
 * from the bottom-right.
 */
export default function AccountButton() {
  const { session, email, ready } = useAccount();
  if (!ready) return null;

  const initials = (email ?? "")
    .replace(/@.*/, "")
    .split(/[.\-_]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "AC";

  return (
    <Link
      to="/account"
      aria-label={session ? "Your account" : "Sign in"}
      title={session ? email ?? "Your account" : "Sign in"}
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 1900,
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        padding: session ? "6px 14px 6px 6px" : "11px 18px",
        borderRadius: 999,
        background: "#fff",
        color: "#111",
        textDecoration: "none",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 10px 30px rgba(0,0,0,.18)",
      }}
    >
      {session ? (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 28, height: 28, borderRadius: "50%", background: "#111", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
            }}
          >
            {initials}
          </span>
          Account
        </>
      ) : (
        "Sign in"
      )}
    </Link>
  );
}
