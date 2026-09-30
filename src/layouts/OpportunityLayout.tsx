import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, BriefcaseBusiness, Compass, FolderOpen, Home, LogOut, Menu, Settings, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { isPlatformAdmin } from '@/lib/db/platform';
import { Notifications } from '@/components/opportunities/AccountWorkflows';
import NoIndex from '@/seo/NoIndex';
import '@/styles/opportunity.css';

const NAV = [
    { to: '/app', label: 'Home', icon: Home }, { to: '/app/discover', label: 'Discover', icon: Compass },
    { to: '/app/opportunities', label: 'Opportunities', icon: FolderOpen }, { to: '/app/school', label: 'School', icon: BookOpen },
    { to: '/app/businesses', label: 'Businesses', icon: BriefcaseBusiness }, { to: '/app/workspace', label: 'Workspace', icon: FolderOpen },
    { to: '/app/settings', label: 'Settings', icon: Settings },
];
export function PhoxtaLogo() { return <Link className="p2-logo" to="/"><img src="/assets/imgs/template/logo/favicon.svg" width={31} height={31} alt="" loading="lazy" />Phoxta<span style={{ fontSize: 10, letterSpacing: 1, color: '#7b8274' }}>2.0</span></Link>; }
export default function OpportunityLayout() {
    const { user, signOut } = useAuth(); const location = useLocation(); const [open, setOpen] = useState(false); const [admin, setAdmin] = useState(false);
    const navigation = useRef<HTMLElement>(null);
    const opener = useRef<HTMLButtonElement>(null);
    useEffect(() => { let active = true; isPlatformAdmin().then(value => { if (active) setAdmin(value); }).catch(() => {}); return () => { active = false; }; }, [user?.id]);
    useEffect(() => { setOpen(false); }, [location.pathname]);
    useEffect(() => {
        if (!open) return;
        const previousOverflow = document.body.style.overflow;
        const restoreFocus = opener.current;
        document.body.style.overflow = 'hidden';
        const focusable = () => [...(navigation.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? [])].filter(node => node.getClientRects().length);
        focusable()[0]?.focus();
        const trap = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
            if (event.key !== 'Tab') return;
            const items = focusable(); const first = items[0]; const last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        };
        document.addEventListener('keydown', trap);
        return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', trap); restoreFocus?.focus(); };
    }, [open]);
    return <div className="p2-root p2-shell"><NoIndex />{open && <button className="p2-nav-backdrop" aria-label="Close navigation" tabIndex={-1} onClick={() => setOpen(false)} />}<aside ref={navigation} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label="Phoxta navigation" className={`p2-sidebar ${open ? 'is-open' : ''}`}><div className="p2-card-top"><PhoxtaLogo /><button className="p2-mobile-toggle" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={20} /></button></div><div><span className="p2-eyebrow" style={{ padding: '0 14px 12px' }}>Your next chapter</span><nav aria-label="App navigation">{NAV.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/app'}><item.icon size={18} />{item.label}</NavLink>)}{admin && <NavLink to="/admin"><ShieldCheck size={18} />Editorial</NavLink>}</nav></div><div className="p2-sidebar-bottom"><div className="p2-learning-note"><BookOpen size={20} /><p>Learn through the opportunity you’re working on.</p><Link to="/app/school">Find your next lesson ↗</Link></div><button className="p2-button secondary" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button></div></aside><div><header className="p2-topbar"><button ref={opener} className="p2-mobile-toggle" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={21} /></button><span>Discover what’s worth building.</span><div className="p2-actions"><Notifications /><Link to="/app/discover" className="p2-button secondary"><Compass size={16} />Explore opportunities</Link><Link to="/app/settings" aria-label="Account settings" className="p2-card-icon">{(user?.user_metadata?.full_name || user?.email || 'P').slice(0, 1).toUpperCase()}</Link></div></header><main className="p2-main" id="main-content"><Outlet /></main></div></div>;
}
