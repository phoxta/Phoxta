/* The graphics tab's start row and the dialogs behind each button. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { NewDesign } from "@/pages/dashboard/ops/designs/NewDesign";
import { SocialAccounts } from "@/pages/dashboard/ops/designs/SocialAccounts";

const I_LINK = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1" />
  </svg>
);

function Rig() {
  const [n, setN] = useState(0);
  const [accounts, setAccounts] = useState(false);
  return (
    <MemoryRouter>
      <div className="hrx" style={{ padding: 24, minHeight: "100vh" }}>
        <NewDesign
          key={n}
          orgId="rig"
          onMade={() => setN((x) => x + 1)}
          extra={
            <button type="button" className="dsn-btn" onClick={() => setAccounts(true)}>
              {I_LINK}Accounts
            </button>
          }
        />
        <SocialAccounts orgId="rig" open={accounts} onClose={() => setAccounts(false)} />
      </div>
    </MemoryRouter>
  );
}
createRoot(document.getElementById("root")!).render(<Rig />);
