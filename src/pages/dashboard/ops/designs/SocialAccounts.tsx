import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Chip } from "@/components/dash/Ui";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type SocialAccount, type SocialPlatform, PLATFORM_NAMES,
  connectSocial, disconnectSocialAccount, listSocialAccounts,
} from "@/lib/db/ops/social";

const ORDER: SocialPlatform[] = ["instagram", "linkedin", "tiktok", "x"];

/**
 * The accounts a scheduled post can go to.
 *
 * Consent opens in a new tab rather than navigating away, because the person
 * is usually mid-way through composing something and losing that to an OAuth
 * round trip is the fastest way to make a feature unused. The platform sends
 * the browser back to this page with ?social=…, which is read once and cleared.
 *
 * A platform with no developer app yet says so, and says which secrets are
 * missing and which redirect URI to whitelist — the two facts whoever sets it
 * up actually needs. Bouncing someone to a consent screen that cannot work is
 * worse than telling them it is not ready.
 *
 * MOUNTED ALWAYS, SHOWN ON DEMAND. The dialog only appears when asked for, but
 * the component stays mounted because it is what reads the ?social= parameter
 * the platform sends the browser back with. Render it only while the dialog is
 * open and the outcome of every connection is thrown away unread — the person
 * returns from Instagram to a page that says nothing.
 */
export function SocialAccounts({ orgId, open, onClose }: {
  orgId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<SocialPlatform | null>(null);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    const { data, error } = await listSocialAccounts(orgId);
    if (error) toastError(error);
    setAccounts(data?.accounts ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose, busy]);

  // The callback's verdict, read once so a refresh does not repeat it.
  useEffect(() => {
    const s = params.get("social");
    if (!s) return;
    setParams(new URLSearchParams(), { replace: true });
    if (s.startsWith("connected-")) { toast(`${PLATFORM_NAMES[s.slice(10) as SocialPlatform] ?? "Account"} connected.`); void load(); }
    else if (s === "cancelled") toastError("Connecting was cancelled.");
    else if (s === "bad-state") toastError("That connection link had expired. Try again.");
    else if (s === "no-account") toastError("Connected, but no postable account was found — Instagram needs a professional account linked to a Page.");
    else if (s === "no-token") toastError("The platform did not return a token.");
    else if (s === "not-saved") toastError("The account could not be saved.");
    else toastError(s.replace(/^failed:\s*/, ""));
  }, [params, setParams, load]);

  const connect = async (platform: SocialPlatform) => {
    setBusy(platform);
    const { data, error, needs, redirectUri } = await connectSocial(orgId, platform);
    setBusy(null);
    if (error) {
      if (needs?.length) {
        toastError(`${PLATFORM_NAMES[platform]} needs a developer app first. Set ${needs.join(" and ")}, with ${redirectUri} as the redirect URI.`);
      } else toastError(error);
      return;
    }
    if (data?.url) window.open(data.url, "_blank", "noopener");
  };

  if (!open) return null;

  return (
    <div className="dsn-modal" role="dialog" aria-modal="true" aria-label="Connected accounts"
         onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dsn-modal__box dsn-brief-dlg" style={{ width: "min(620px, 94vw)" }}>
        <h3 className="dsn-picker__t">Accounts</h3>
        <p className="dsn-note">
          Where a scheduled post can go. Each platform needs its own approved developer app before it
          can be connected — that is a platform requirement, not a setting.
        </p>
        {loading && <p className="dsn-note">Loading…</p>}
      <div className="soa">
        {ORDER.map((p) => {
          const mine = accounts.filter((a) => a.platform === p && a.status !== "revoked");
          return (
            <div key={p} className="soa__row">
              <span className="soa__name">{PLATFORM_NAMES[p]}</span>
              {mine.length === 0 ? (
                <>
                  <span className="soa__none">Not connected</span>
                  <button type="button" className="hrx-seeall" disabled={busy === p}
                          onClick={() => void connect(p)}>
                    {busy === p ? "Opening…" : "Connect"}
                  </button>
                </>
              ) : (
                mine.map((a) => (
                  <span key={a.id} className="soa__acct">
                    {a.avatar_url && <img src={a.avatar_url} alt="" width={20} height={20} />}
                    <span className="soa__handle">{a.handle || a.display_name || "Connected"}</span>
                    <Chip tone={a.status === "connected" ? "ok" : "warn"}>
                      {a.status === "connected" ? "connected" : "needs reconnecting"}
                    </Chip>
                    {a.status !== "connected" && (
                      <button type="button" className="hrx-seeall" onClick={() => void connect(p)}>Reconnect</button>
                    )}
                    <button type="button" className="hrx-seeall" onClick={async () => {
                      if (!confirmDanger(`Disconnect ${a.handle || PLATFORM_NAMES[p]}? Scheduled posts to it will fail.`)) return;
                      const { error } = await disconnectSocialAccount(orgId, a.id);
                      if (error) return toastError(error);
                      toast("Disconnected.");
                      void load();
                    }}>Disconnect</button>
                  </span>
                ))
              )}
            </div>
          );
        })}
      </div>
        {accounts.some((a) => a.last_error) && (
          <p className="dsn-note">
            {accounts.filter((a) => a.last_error).map((a) => `${PLATFORM_NAMES[a.platform]}: ${a.last_error}`).join(" · ")}
          </p>
        )}
        <div className="dsn-brief-dlg__acts">
          <button type="button" className="dsn-btn" onClick={onClose}>Done</button>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.soa{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.soa__row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 12px;border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card)}
.soa__name{font-size:13.5px;font-weight:600;color:var(--hrx-ink);min-width:88px}
.soa__none{font-size:12.5px;color:var(--hrx-muted);flex:1}
.soa__acct{display:flex;align-items:center;gap:8px;flex:1;flex-wrap:wrap}
.soa__acct img{border-radius:50%}
.soa__handle{font-size:13px;color:var(--hrx-ink)}
`;
