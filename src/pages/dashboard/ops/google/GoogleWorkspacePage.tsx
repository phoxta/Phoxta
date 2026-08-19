import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import type { OpsContext } from "@/layouts/OperatingLayout";
import GmailApp from "./GmailApp";
import DriveApp from "./DriveApp";
import CalendarApp from "./CalendarApp";
import GoogleConfigure from "./GoogleConfigure";

const pill = (active: boolean) => `btn btn-sm rounded-pill px-3 ops-tap ${active ? "btn-dark" : "btn-outline-secondary"}`;

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
      {/* /ops/google is not a console tab, so nothing in the tab bar highlights
          while it is open — this breadcrumb is the signposted way back. */}
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link to={`/dashboard/businesses/${orgId}/ops/settings`} className="fz-font-sm neutral-500 text-decoration-none ops-tap">
          <span aria-hidden="true">← </span>Settings
        </Link>
      </nav>
      <h2 className="fz-font-lg fw-600 mb-1">Google Workspace</h2>
      <p className="fz-font-sm neutral-500 mb-3">Your business Gmail, Drive and Calendar, inside the console.</p>

      <div className="d-flex flex-wrap gap-1 mb-4" role="group" aria-label="Google Workspace sections">
        <button type="button" className={pill(tab === "apps")} aria-pressed={tab === "apps"} onClick={() => openTab("apps")}>Apps</button>
        <button type="button" className={pill(tab === "configure")} aria-pressed={tab === "configure"} onClick={() => openTab("configure")}>Configure</button>
      </div>

      {tab === "configure" ? (
        <GoogleConfigure orgId={orgId} />
      ) : openedApp ? (
        <div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button type="button" className="btn btn-link btn-sm p-0 px-2 neutral-500 text-decoration-none ops-tap" onClick={() => openApp(null)}>
              <span aria-hidden="true">← </span>All apps
            </button>
            <h3 className="fz-font-md fw-600 mb-0"><span aria-hidden="true">{openedApp.icon} </span>{openedApp.name}</h3>
          </div>
          {app === "gmail" && <GmailApp orgId={orgId} />}
          {app === "drive" && <DriveApp orgId={orgId} />}
          {app === "calendar" && <CalendarApp orgId={orgId} />}
        </div>
      ) : (
        <div className="row g-2 g-sm-3">
          {APPS.map((a) => (
            <div className="col-12 col-sm-6 col-lg-4" key={a.key}>
              <button
                type="button"
                onClick={() => openApp(a.key)}
                className="bg-neutral-0 rounded-4 p-3 p-sm-4 border-100 w-100 h-100 d-flex flex-row flex-sm-column align-items-center text-sm-center gap-2"
              >
                <span aria-hidden="true" style={{ fontSize: 32, lineHeight: 1 }}>{a.icon}</span>
                <span className="d-flex flex-column">
                  <span className="fw-600 neutral-900 fz-font-md">{a.name}</span>
                  <span className="fz-font-sm neutral-500">{a.desc}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
