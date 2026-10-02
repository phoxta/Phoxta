import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  BriefcaseBusiness,
  Bot,
  ChevronDown,
  CirclePlus,
  Cloud,
  Compass,
  CreditCard,
  FolderOpen,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  Mic,
  Settings,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { isPlatformAdmin } from "@/lib/db/platform";
import { Notifications } from "@/components/opportunities/AccountWorkflows";
import { organizationsQuery } from "@/lib/cache/dashboardQueries";
import { useCachedData } from "@/lib/hooks/useCachedData";
import NoIndex from "@/seo/NoIndex";
import "@/styles/opportunity.css";

const LAST_ORG_KEY = "phoxta:lastOrg";

const NAV = [
  { to: "/app", label: "Dashboard", icon: Home },
  { to: "/app/discover", label: "Discover", icon: Compass },
  { to: "/app/opportunities", label: "Opportunities", icon: FolderOpen },
  { to: "/app/school", label: "Startup School", icon: BookOpen },
  { to: "/app/businesses", label: "Businesses", icon: BriefcaseBusiness },
  { to: "/app/workspace", label: "Workspace", icon: FolderOpen },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const CONSOLE_NAV = [
  { label: "CX", defaultPath: "engage/inbox", botPath: "engage/agent", humanPath: "engage/inbox" },
  { label: "Operations", defaultPath: "run", botPath: "operator", humanPath: "run" },
  { label: "R&D", defaultPath: "dossier", botPath: "ideas", humanPath: "dossier" },
];

const ENTREPRENEUR_QUOTES = [
  { text: "Ideas are easy. Implementation is hard.", author: "Guy Kawasaki" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "Make every detail perfect and limit the number of details to perfect.", author: "Jack Dorsey" },
  { text: "If you are not embarrassed by the first version of your product, you’ve launched too late.", author: "Reid Hoffman" },
  { text: "The value of an idea lies in the using of it.", author: "Thomas Edison" },
];

export function PhoxtaLogo() {
  return <Link className="p2-logo" to="/"><strong>Phoxta</strong><span>AI-Ops</span></Link>;
}

export default function OpportunityLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [autopilot, setAutopilot] = useState(false);
  const { data: memberships = [] } = useCachedData(organizationsQuery.key, organizationsQuery.fetch);
  const businesses = memberships.map(({ organization }) => organization);
  const [businessId, setBusinessId] = useState(() => {
    try { return localStorage.getItem(LAST_ORG_KEY) ?? ""; } catch { return ""; }
  });
  const navigation = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    isPlatformAdmin().then((value) => { if (active) setAdmin(value); }).catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!businesses.length) return;
    if (businesses.some((business) => business.id === businessId)) return;
    const id = businesses[0].id;
    setBusinessId(id);
    try { localStorage.setItem(LAST_ORG_KEY, id); } catch { /* storage unavailable */ }
  }, [businessId, businesses]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const restoreFocus = opener.current;
    document.body.style.overflow = "hidden";
    const focusable = () => [...(navigation.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled])") ?? [])]
      .filter((node) => node.getClientRects().length);
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trap);
      restoreFocus?.focus();
    };
  }, [open]);

  const avatar = (user?.user_metadata?.full_name || user?.email || "P").slice(0, 1).toUpperCase();
  const selectedBusiness = businesses.find((business) => business.id === businessId);
  const quoteSeed = `${selectedBusiness?.id ?? "phoxta"}:${new Date().toISOString().slice(0, 10)}`
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const dailyQuote = ENTREPRENEUR_QUOTES[quoteSeed % ENTREPRENEUR_QUOTES.length];
  const consolePath = (suffix: string) => businessId
    ? `/dashboard/businesses/${businessId}/ops${suffix ? `/${suffix}` : ""}`
    : "/app/businesses";

  return (
    <div className="p2-root p2-shell p2-figma-shell">
      <NoIndex />
      {open && <button className="p2-nav-backdrop" aria-label="Close navigation" tabIndex={-1} onClick={() => setOpen(false)} />}

      <header className="p2-app-header">
        <PhoxtaLogo />
        <label className="p2-autopilot">
          <input type="checkbox" checked={autopilot} onChange={(event) => setAutopilot(event.target.checked)} />
          <span aria-hidden="true" />
          Autopilot mode
        </label>
        <div className="p2-account">
          <Link to="/app/settings" aria-label="Account settings" className="p2-avatar">
            <img src="/assets/imgs/template/avatar/avatar-16.webp" alt="" width={42} height={42} loading="lazy" />
            <span>{avatar}</span>
          </Link>
          <div className="p2-account-menu">
            <strong>My Account</strong>
            <Link to="/app/settings"><User size={15} />Profile</Link>
            <Link to="/app/settings/billing"><CreditCard size={15} />Billing</Link>
            <Link to="/app/settings"><Settings size={15} />Settings</Link>
            <hr />
            <Link to="/app/settings/team"><Users size={15} />Team</Link>
            <Link to="/app/settings/team"><UserPlus size={15} />Invite users <span>›</span></Link>
            <Link to="/app/settings/support"><LifeBuoy size={15} />Support <span>›</span></Link>
            <span className="is-disabled"><Cloud size={15} />API</span>
            <hr />
            <button type="button" onClick={() => void signOut()}><LogOut size={15} />Log out</button>
          </div>
        </div>
      </header>

      <aside
        ref={navigation}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label="Phoxta navigation"
        className={`p2-sidebar ${open ? "is-open" : ""}`}
      >
        <div className="p2-sidebar-mobile-head">
          <PhoxtaLogo />
          <button className="p2-mobile-toggle" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <div className="p2-console-select">
          <strong>Agentic Console</strong>
          <label>
            <span className="visually-hidden">Business to run</span>
            <select
              value={businessId}
              onChange={(event) => {
                setBusinessId(event.target.value);
                try { localStorage.setItem(LAST_ORG_KEY, event.target.value); } catch { /* storage unavailable */ }
              }}
            >
              {!businesses.length && <option value="">WamWam Experience</option>}
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
            </select>
            <ChevronDown size={11} aria-hidden="true" />
          </label>
        </div>
        <nav className="p2-console-nav" aria-label="AI-Ops console">
          {CONSOLE_NAV.map((item) => (
            <div className="p2-console-row" key={item.label}>
              <Link className="p2-console-label" to={consolePath(item.defaultPath)}>{item.label}</Link>
              <span className="p2-role-switch">
                <Link to={consolePath(item.botPath)}>AI Bot</Link>
                <Link to={consolePath(item.humanPath)}>Human loop</Link>
              </span>
              <span className="p2-nav-compact-actions"><Link to={consolePath(item.botPath)} aria-label={`${item.label} AI Bot`}><Bot size={15} /></Link><Link to={consolePath(item.humanPath)} aria-label={`${item.label} human loop`}><User size={15} /></Link></span>
            </div>
          ))}
        </nav>
        <nav className="p2-mobile-nav" aria-label="App navigation">
          {NAV.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/app"}><item.icon size={16} />{item.label}</NavLink>)}
          {admin && <NavLink to="/admin"><ShieldCheck size={16} />Editorial</NavLink>}
        </nav>
        <button className="p2-signout" onClick={() => void signOut()}><LogOut size={14} />Sign out</button>
      </aside>

      <div className="p2-stage">
        <div className="p2-stage-tabs">
          <NavLink to="/app" end>Omnichannel <ChevronDown size={13} /></NavLink>
          <NavLink to="/app/opportunities">Analytics <ChevronDown size={13} /></NavLink>
          <NavLink to="/app/businesses">Sales &amp; Marketing <ChevronDown size={13} /></NavLink>
        </div>
        <button ref={opener} className="p2-mobile-toggle p2-menu-trigger" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21} /></button>
        <div className="p2-stage-panel">
          <main className="p2-main" id="main-content"><Outlet /></main>
          <Link className="p2-command-dock" to="/app/discover" aria-label="Open Phoxta discovery assistant">
            <span className="p2-command-prompt"><CirclePlus size={20} />What would you like to do?</span>
            <span className="p2-command-tools"><span>Flash</span><ChevronDown size={13} /><Mic size={17} /></span>
          </Link>
        </div>
      </div>

      <aside className="p2-notification-rail" aria-label="Notification panel">
        <Notifications variant="panel" />
      </aside>

      <fieldset className="p2-workspace-radio">
        <legend>AI Model</legend>
        <label><input type="radio" name="workspace" defaultChecked />Phoxta AI-Ops</label>
        <label><input type="radio" name="workspace" />Opportunities</label>
        <label><input type="radio" name="workspace" />Startup School</label>
      </fieldset>

      <figure className="p2-daily-quote">
        <blockquote>“{dailyQuote.text}”</blockquote>
        <figcaption>▣ &nbsp; {dailyQuote.author} · {selectedBusiness?.name ?? "Phoxta AI-Ops"} · Quote of the day</figcaption>
      </figure>
    </div>
  );
}
