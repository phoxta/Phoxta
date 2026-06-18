import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { OpsContext } from "@/layouts/OperatingLayout";
import GmailApp from "./GmailApp";
import DriveApp from "./DriveApp";
import CalendarApp from "./CalendarApp";
import GoogleConfigure from "./GoogleConfigure";

const pill = (active: boolean) => `btn btn-sm rounded-pill px-3 ${active ? "btn-dark" : "btn-outline-secondary"}`;

const APPS = [
  { key: "gmail", name: "Gmail", icon: "✉️", desc: "Inbox · compose · reply" },
  { key: "drive", name: "Drive", icon: "📁", desc: "Files & folders" },
  { key: "docs", name: "Docs", icon: "📄", desc: "Documents" },
  { key: "sheets", name: "Sheets", icon: "📊", desc: "Spreadsheets" },
  { key: "calendar", name: "Calendar", icon: "📅", desc: "Events & scheduling" },
];

export default function GoogleWorkspacePage() {
  const { orgId } = useOutletContext<OpsContext>();
  const [tab, setTab] = useState<"apps" | "configure">("apps");
  const [app, setApp] = useState<string | null>(null);

  return (
    <div>
      <div className="d-flex gap-1 mb-4">
        <button type="button" className={pill(tab === "apps")} onClick={() => { setTab("apps"); setApp(null); }}>Apps</button>
        <button type="button" className={pill(tab === "configure")} onClick={() => setTab("configure")}>Configure</button>
      </div>

      {tab === "configure" ? (
        <GoogleConfigure orgId={orgId} />
      ) : app ? (
        <div>
          <button type="button" className="btn btn-link btn-sm p-0 neutral-500 text-decoration-none mb-3" onClick={() => setApp(null)}>← All apps</button>
          {app === "gmail" && <GmailApp orgId={orgId} />}
          {app === "drive" && <DriveApp orgId={orgId} filter="all" />}
          {app === "docs" && <DriveApp orgId={orgId} filter="docs" />}
          {app === "sheets" && <DriveApp orgId={orgId} filter="sheets" />}
          {app === "calendar" && <CalendarApp orgId={orgId} />}
        </div>
      ) : (
        <div className="row g-3">
          {APPS.map((a) => (
            <div className="col-6 col-md-4 col-lg-3" key={a.key}>
              <button type="button" onClick={() => setApp(a.key)} className="bg-neutral-0 rounded-4 p-4 border-100 w-100 h-100 text-center d-flex flex-column align-items-center justify-content-center gap-2">
                <span style={{ fontSize: 36, lineHeight: 1 }}>{a.icon}</span>
                <span className="fw-600 neutral-900">{a.name}</span>
                <span className="fz-font-sm neutral-500">{a.desc}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
