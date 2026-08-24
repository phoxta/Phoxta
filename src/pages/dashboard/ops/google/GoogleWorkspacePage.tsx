import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import type { OpsContext } from "@/layouts/OperatingLayout";
import GmailApp from "./GmailApp";
import DriveApp from "./DriveApp";
import CalendarApp from "./CalendarApp";
import GoogleConfigure from "./GoogleConfigure";

const CSS = `
.ggx-crumb { font-size: 13px; font-weight: 500; color: var(--hrx-muted); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.ggx-crumb:hover { color: var(--hrx-ink); }
.ggx-title { font-size: clamp(22px, 2.2vw, 30px); font-weight: 500; letter-spacing: -0.03em; margin: 6px 0 2px; }
.ggx-lede { font-size: 14px; color: var(--hrx-muted); margin: 0 0 16px; }
.ggx-appcard {
  width: 100%; height: 100%; display: flex; align-items: center; gap: 14px; text-align: left;
  background: var(--hrx-card); border: 1px solid var(--hrx-border); border-radius: 16px;
  padding: 18px; cursor: pointer; color: var(--hrx-ink);
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.ggx-appcard:hover { background: var(--hrx-soft); border-color: var(--hrx-blue); transform: translateY(-1px); }
.ggx-appcard .ico {
  width: 52px; height: 52px; border-radius: 999px; background: #e8effc; border: 1px solid #d4e2fb;
  display: inline-flex; align-items: center; justify-content: center; font-size: 24px; line-height: 1; flex-shrink: 0;
}
.ggx-appcard .nm { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; display: block; }
.ggx-appcard .ds { font-size: 13px; color: var(--hrx-muted); display: block; margin-top: 2px; }
.ggx-appcard .go {
  margin-left: auto; width: 36px; height: 36px; border-radius: 999px; flex-shrink: 0;
  background: rgba(39, 39, 39, 0.06); color: var(--hrx-ink);
  display: inline-flex; align-items: center; justify-content: center;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.ggx-appcard:hover .go { background: var(--hrx-blue); color: #fff; }
.ggx-apphead { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.ggx-apphead h3 { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; margin: 0; display: inline-flex; align-items: center; gap: 8px; }
`;

const APPS = [
  { key: "gmail", name: "Gmail", icon: "✉️", desc: "Inbox · compose · reply" },
  { key: "drive", name: "Drive", icon: "📁", desc: "Files & folders" },
  { key: "calendar", name: "Calendar", icon: "📅", desc: "Events & scheduling" },
];

export default function GoogleWorkspacePage() {
  const { orgId } = useOutletContext<OpsContext>();
  // Which app / tab is open lives in the URL, so Settings can deep-link
  // (?app=gmail, ?tab=configure) and the browser Back button steps back out
  // of an app instead of leaving the console.
  const [params, setParams] = useSearchParams();
  const wanted = params.get("app");
  const app = APPS.some((a) => a.key === wanted) ? wanted : null;
  // Returning from the Google OAuth round-trip lands on ?google=connected —
  // show the Configure tab so the result is visible where it was started.
  const tab: "apps" | "configure" = params.get("tab") === "configure" || params.has("google") ? "configure" : "apps";

  const openApp = (key: string | null) => setParams(key ? { app: key } : {}, { replace: false });
  const openTab = (next: "apps" | "configure") => setParams(next === "configure" ? { tab: "configure" } : {}, { replace: false });

  const openedApp = APPS.find((a) => a.key === app);

  return (
    <div>
      <style>{CSS}</style>
      {/* /ops/google is not a console tab, so nothing in the tab bar highlights
          while it is open — this breadcrumb is the signposted way back. */}
      <nav aria-label="Breadcrumb" className="mb-1">
        <Link to={`/dashboard/businesses/${orgId}/ops/settings`} className="ggx-crumb">
          <span aria-hidden="true">← </span>Settings
        </Link>
      </nav>
      <h2 className="ggx-title">Google Workspace</h2>
      <p className="ggx-lede">Your business Gmail, Drive and Calendar, inside the console.</p>

      <div className="hrx-tabbar mb-4" role="group" aria-label="Google Workspace sections">
        <button type="button" className={`hrx-tab${tab === "apps" ? " active" : ""}`} aria-pressed={tab === "apps"} onClick={() => openTab("apps")}>Apps</button>
        <button type="button" className={`hrx-tab${tab === "configure" ? " active" : ""}`} aria-pressed={tab === "configure"} onClick={() => openTab("configure")}>Configure</button>
      </div>

      {tab === "configure" ? (
        <GoogleConfigure orgId={orgId} />
      ) : openedApp ? (
        <div>
          <div className="ggx-apphead">
            <button type="button" className="hrx-pill" onClick={() => openApp(null)}>
              <span aria-hidden="true">← </span>All apps
            </button>
            <h3><span aria-hidden="true">{openedApp.icon} </span>{openedApp.name}</h3>
          </div>
          {app === "gmail" && <GmailApp orgId={orgId} />}
          {app === "drive" && <DriveApp orgId={orgId} />}
          {app === "calendar" && <CalendarApp orgId={orgId} />}
        </div>
      ) : (
        <div className="row g-2 g-sm-3">
          {APPS.map((a) => (
            <div className="col-12 col-sm-6 col-lg-4" key={a.key}>
              <button type="button" onClick={() => openApp(a.key)} className="ggx-appcard">
                <span className="ico" aria-hidden="true">{a.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span className="nm">{a.name}</span>
                  <span className="ds">{a.desc}</span>
                </span>
                <span className="go" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
