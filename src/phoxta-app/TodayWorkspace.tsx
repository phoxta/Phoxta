import { useMemo, useState } from "react";
import {
  Bot,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleEllipsis,
  ContactRound,
  Download,
  File,
  Image as ImageIcon,
  Mail,
  Megaphone,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Palette,
  Phone,
  PhoneCall,
  Plus,
  RadioTower,
  Search,
  Send,
  Settings,
  Users,
  Workflow,
} from "lucide-react";

type Contact = {
  id: number;
  name: string;
  preview: string;
  time: string;
  avatar: string;
  tags: string[];
};

const CONTACTS: Contact[] = [
  { id: 1, name: "Elmer Laverty", preview: "Haha oh man 🔥", time: "12m", avatar: "/assets/imgs/template/avatar/avatar-4.webp", tags: ["Question", "Help wanted"] },
  { id: 2, name: "Florencio Dorrance", preview: "woohoooo", time: "24m", avatar: "/assets/imgs/template/avatar/avatar-8.webp", tags: ["Some context"] },
  { id: 3, name: "Lavern Laboy", preview: "Haha that's terrifying 😅", time: "1h", avatar: "/assets/imgs/template/avatar/avatar-11.webp", tags: ["Bug", "Hacktoberfest"] },
  { id: 4, name: "Titus Kitamura", preview: "omg, this is amazing", time: "5h", avatar: "/assets/imgs/template/avatar/avatar-14.webp", tags: ["Question", "Some content"] },
  { id: 5, name: "Geoffrey Mott", preview: "aww 😍", time: "2d", avatar: "/assets/imgs/template/avatar/avatar-17.webp", tags: ["Request"] },
  { id: 6, name: "Alfonzo Schuessler", preview: "perfect!", time: "1m", avatar: "/assets/imgs/template/avatar/avatar-20.webp", tags: ["Follow up"] },
];

const TEAM = [
  ["Florencio Dorrance", "Market Development Manager", "avatar-8.webp"],
  ["Benny Spanbauer", "Area Sales Manager", "avatar-5.webp"],
  ["Jamel Eusebio", "Administrator", "avatar-9.webp"],
  ["Lavern Laboy", "Account Executive", "avatar-11.webp"],
  ["Alfonzo Schuessler", "Proposal Writer", "avatar-20.webp"],
  ["Daryl Nehls", "Nursing Assistant", "avatar-18.webp"],
];

const FILES = [
  ["i9.pdf", "PDF · 9mb", "pdf"],
  ["Screenshot-3817.png", "PNG · 4mb", "image"],
  ["sharefile.docx", "DOC · 555kb", "doc"],
  ["Jerry-2020_I-9_Form.xxl", "XXL · 24mb", "sheet"],
];

const INITIAL_MESSAGES = [
  { id: 1, side: "in", text: "omg, this is amazing" },
  { id: 2, side: "in", text: "perfect! ✅" },
  { id: 3, side: "in", text: "Wow, this is really epic" },
  { id: 4, side: "out", text: "How are you?" },
  { id: 5, side: "in", text: "just ideas for next time" },
  { id: 6, side: "in", text: "I'll be there in 2 mins ⏱" },
  { id: 7, side: "out", text: "woohoooo" },
  { id: 8, side: "out", text: "Haha oh man" },
  { id: 9, side: "out", text: "Haha that's terrifying 😅" },
  { id: 10, side: "in", text: "aww" },
  { id: 11, side: "in", text: "omg, this is amazing" },
  { id: 12, side: "in", text: "woohoooo 🔥" },
] as const;

function Avatar({ src, alt = "" }: { src: string; alt?: string }) {
  return <img className="pxc-message-avatar" src={src} alt={alt} />;
}

const CX_AREAS = [
  { id: "messages", label: "Messages", hint: "Unified inbox", group: "Daily work", icon: MessageCircle },
  { id: "email", label: "Email", hint: "Inbox and compose", group: "Daily work", icon: Mail },
  { id: "calls", label: "Calls", hint: "Voice and call history", group: "Daily work", icon: PhoneCall },
  { id: "bookings", label: "Bookings", hint: "Bookings and reservations", group: "Daily work", icon: CalendarCheck2 },
  { id: "customers", label: "Customers", hint: "Contacts and activity", group: "Customer data", icon: Users },
  { id: "audience", label: "Audience", hint: "Segments and targeting", group: "Customer data", icon: ContactRound },
  { id: "automations", label: "Automations", hint: "Follow-up flows", group: "Engagement", icon: Workflow },
  { id: "campaigns", label: "Campaigns", hint: "One-off broadcasts", group: "Engagement", icon: Megaphone },
  { id: "graphics", label: "Graphics", hint: "Design and social publishing", group: "Engagement", icon: Palette },
  { id: "channels", label: "Channels", hint: "Connected touchpoints", group: "Control", icon: RadioTower },
  { id: "assistant", label: "AI assistant", hint: "Job and boundaries", group: "Control", icon: Bot },
  { id: "insights", label: "Insights", hint: "Customer performance", group: "Control", icon: ChartNoAxesCombined },
] as const;

type CxArea = (typeof CX_AREAS)[number]["id"];

function CxSwitcher({ value, onChange }: { value: CxArea; onChange: (area: CxArea) => void }) {
  const [open, setOpen] = useState(false);
  const current = CX_AREAS.find((area) => area.id === value) ?? CX_AREAS[0];
  const groups = Array.from(new Set(CX_AREAS.map((area) => area.group)));
  return <div className="pxc-cx-switcher">
    <button className="pxc-cx-switcher-trigger" onClick={() => setOpen((state) => !state)} aria-haspopup="menu" aria-expanded={open}><current.icon size={13} /><strong>{current.label}</strong><ChevronDown size={11} /></button>
    {open && <div className="pxc-cx-menu" role="menu">{groups.map((group) => <section key={group}><small>{group}</small>{CX_AREAS.filter((area) => area.group === group).map((area) => <button className={area.id === value ? "active" : ""} key={area.id} onClick={() => { onChange(area.id); setOpen(false); }} role="menuitem"><area.icon size={14} /><span><strong>{area.label}</strong><small>{area.hint}</small></span>{area.id === value && <Check size={12} />}</button>)}</section>)}</div>}
  </div>;
}

const CUSTOMER_ROWS = [
  { id: 1, name: "Florencio Dorrance", email: "florencio@northstar.co", stage: "Customer", value: "£12,400", avatar: "avatar-8.webp" },
  { id: 2, name: "Lavern Laboy", email: "lavern@weekdays.co", stage: "Lead", value: "£4,800", avatar: "avatar-11.webp" },
  { id: 3, name: "Alfonzo Schuessler", email: "alfonzo@studio.io", stage: "At risk", value: "£3,600", avatar: "avatar-20.webp" },
  { id: 4, name: "Benny Spanbauer", email: "benny@fieldform.co", stage: "Customer", value: "£8,200", avatar: "avatar-5.webp" },
];

function CapabilityView({ area, onAreaChange }: { area: Exclude<CxArea, "messages">; onAreaChange: (area: CxArea) => void }) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [callMode, setCallMode] = useState("AI agent");
  const [phone, setPhone] = useState("+44 7700 900123");
  const [emailCompose, setEmailCompose] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ to: "", subject: "", body: "" });
  const [graphicsView, setGraphicsView] = useState<"designs" | "social">("designs");
  const [designs, setDesigns] = useState([
    { name: "City guide launch", format: "Instagram post", status: "Published", tone: "blue" },
    { name: "Customer story", format: "LinkedIn carousel", status: "Scheduled", tone: "coral" },
    { name: "Returning guest offer", format: "Email and social", status: "Draft", tone: "violet" },
  ]);
  const [customers, setCustomers] = useState(CUSTOMER_ROWS);
  const [switches, setSwitches] = useState<Record<string, boolean>>({
    "Website chat": true, Email: true, SMS: true, WhatsApp: false, Voice: true,
    "Lead qualification": true, "Booking follow-up": true, "Customer recovery": false,
    "External messages": true, "Pricing commitments": true, "Refunds and payments": true,
  });
  const [campaigns, setCampaigns] = useState([
    { name: "Returning guest offer", channel: "Email", status: "Scheduled", result: "1,180 recipients" },
    { name: "City guide launch", channel: "Email + SMS", status: "Live", result: "8.4% conversion" },
    { name: "Founder stories", channel: "WhatsApp", status: "Draft", result: "Audience not selected" },
  ]);
  const [bookings, setBookings] = useState([
    { name: "Amina Lawal", item: "Design consultation", date: "Today · 14:30", status: "Pending" },
    { name: "Marcus Reed", item: "Strategy workshop", date: "Tomorrow · 10:00", status: "Confirmed" },
    { name: "Zainab Bello", item: "Product review", date: "Friday · 09:30", status: "Confirmed" },
  ]);
  const [period, setPeriod] = useState("30 days");
  const title = CX_AREAS.find((item) => item.id === area)?.label ?? "Customers";
  const tell = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 1800); };
  const toggle = (key: string) => setSwitches((current) => ({ ...current, [key]: !current[key] }));
  const filteredCustomers = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.stage}`.toLowerCase().includes(query.toLowerCase()));

  return <section className="pxc-cx-view">
    <header><CxSwitcher value={area} onChange={onAreaChange} /><span>{title} for WamWam Experience</span>{notice && <em>{notice}</em>}</header>
    <div className="pxc-cx-view-body">
      {area === "calls" && <><div className="pxc-cx-hero"><div><small>Voice workspace</small><h2>Call customers with the right handoff.</h2><p>Let the AI call, bridge the owner, or speak directly from this browser.</p></div><strong>26 calls<small>last 30 days</small></strong></div><div className="pxc-call-controls"><div>{["AI agent","Phone bridge","Browser"].map((mode) => <button className={callMode === mode ? "active" : ""} key={mode} onClick={() => setCallMode(mode)}>{mode}</button>)}</div><label><Phone size={14} /><input value={phone} onChange={(event) => setPhone(event.target.value)} /><button onClick={() => tell(`${callMode} call started`)}>Start call</button></label></div><CxRows rows={[["Florencio Dorrance","Outgoing · 04:18","Booked"],["Lavern Laboy","Incoming · 02:46","Completed"],["Alfonzo Schuessler","AI outbound · 01:32","Escalated"]]} action="Open recording" onAction={() => tell("Recording opened")} /></>}

      {area === "email" && <><div className="pxc-cx-hero"><div><small>Email</small><h2>Write and reply with customer context.</h2><p>Connected email lands in the unified inbox while richer composition stays here.</p></div><button onClick={() => setEmailCompose((value) => !value)}>{emailCompose ? "Close composer" : <><Plus size={13} /> Compose</>}</button></div>{emailCompose ? <form className="pxc-email-composer" onSubmit={(event) => { event.preventDefault(); if (!emailDraft.to || !emailDraft.subject || !emailDraft.body) { tell("Complete the email before sending"); return; } tell("Email sent and added to the customer timeline"); setEmailDraft({ to: "", subject: "", body: "" }); setEmailCompose(false); }}><label>To<input type="email" value={emailDraft.to} onChange={(event) => setEmailDraft((draft) => ({ ...draft, to: event.target.value }))} placeholder="customer@example.com" /></label><label>Subject<input value={emailDraft.subject} onChange={(event) => setEmailDraft((draft) => ({ ...draft, subject: event.target.value }))} placeholder="What is this about?" /></label><label>Message<textarea value={emailDraft.body} onChange={(event) => setEmailDraft((draft) => ({ ...draft, body: event.target.value }))} placeholder="Write your email…" /></label><div><button type="button" onClick={() => tell("Attachment picker opened")}><Paperclip size={13} /> Attach</button><button>Send email <Send size={13} /></button></div></form> : <CxRows rows={[["Amina Lawal","Re: Design consultation · 12m","Unread"],["Marcus Reed","Workshop confirmation · 48m","Replied"],["Zainab Bello","Product review notes · 2h","AI draft"]]} action="Open" onAction={() => tell("Email thread opened")} />}</>}

      {area === "customers" && <><CxToolbar query={query} setQuery={setQuery} placeholder="Search customers"><button onClick={() => { setCustomers((rows) => [{ id: Date.now(), name: "New customer", email: "Add contact details", stage: "Lead", value: "£0", avatar: "avatar-10.webp" }, ...rows]); tell("Customer added"); }}><Plus size={13} /> Add customer</button></CxToolbar><div className="pxc-customer-table">{filteredCustomers.map((customer) => <button key={customer.id} onClick={() => tell(`${customer.name}'s profile opened`)}><Avatar src={`/assets/imgs/template/avatar/${customer.avatar}`} /><span><strong>{customer.name}</strong><small>{customer.email}</small></span><em className={`is-${customer.stage.toLowerCase().replace(" ", "-")}`}>{customer.stage}</em><b>{customer.value}</b></button>)}</div></>}

      {area === "audience" && <><div className="pxc-cx-hero"><div><small>Audience</small><h2>Serve each customer differently.</h2><p>Live segments feed campaigns, automations and the AI assistant.</p></div><button onClick={() => tell("New segment created")}><Plus size={13} /> New segment</button></div><div className="pxc-segment-grid">{[["High-intent enquiries","26 people","Updated live"],["Returning customers","184 people","14% growth"],["Needs re-engagement","38 people","Last active 30d"],["VIP customers","19 people","£48k value"]].map(([name,count,note]) => <button key={name} onClick={() => tell(`${name} selected`)}><ContactRound size={17} /><strong>{name}</strong><span>{count}</span><small>{note}</small></button>)}</div></>}

      {area === "automations" && <><div className="pxc-cx-hero"><div><small>Automations</small><h2>Follow up without losing human control.</h2><p>Every flow can pause before messages, commitments or payments.</p></div><button onClick={() => tell("Blank automation created")}><Plus size={13} /> New flow</button></div><div className="pxc-toggle-list">{[["Lead qualification","Reply, qualify and assign new enquiries","18 completed today"],["Booking follow-up","Confirm details and send reminders","7 running"],["Customer recovery","Reconnect with inactive customers","Paused"]].map(([name,detail,meta]) => <article key={name}><span><Workflow size={15} /></span><div><strong>{name}</strong><small>{detail}</small></div><em>{meta}</em><button className={switches[name] ? "on" : ""} onClick={() => toggle(name)}><i /></button></article>)}</div></>}

      {area === "campaigns" && <><div className="pxc-cx-hero"><div><small>Campaigns</small><h2>Reach the right people on every channel.</h2><p>Compose once, tailor by channel and review before anything goes live.</p></div><button onClick={() => { setCampaigns((items) => [{ name: "Untitled campaign", channel: "Choose channel", status: "Draft", result: "Audience not selected" }, ...items]); tell("Campaign draft created"); }}><Plus size={13} /> New campaign</button></div><div className="pxc-toggle-list">{campaigns.map((campaign, index) => <article key={`${campaign.name}-${index}`}><span><Megaphone size={15} /></span><div><strong>{campaign.name}</strong><small>{campaign.channel} · {campaign.result}</small></div><em>{campaign.status}</em><button className="pxc-row-action" onClick={() => { setCampaigns((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, status: item.status === "Draft" ? "Scheduled" : item.status === "Scheduled" ? "Live" : "Complete" } : item)); tell("Campaign status updated"); }}>Advance</button></article>)}</div></>}

      {area === "graphics" && <><div className="pxc-cx-hero"><div><small>Graphics and social</small><h2>Design once, publish everywhere.</h2><p>Create branded graphics, adapt each format and schedule posts across connected social accounts.</p></div><button onClick={() => { setDesigns((items) => [{ name: "Untitled design", format: "Choose format", status: "Draft", tone: "mint" }, ...items]); tell("New canvas created"); }}><Plus size={13} /> Create design</button></div><div className="pxc-graphics-tabs"><button className={graphicsView === "designs" ? "active" : ""} onClick={() => setGraphicsView("designs")}>Designs</button><button className={graphicsView === "social" ? "active" : ""} onClick={() => setGraphicsView("social")}>Social queue</button></div>{graphicsView === "designs" ? <div className="pxc-design-grid">{designs.map((design, index) => <article key={`${design.name}-${index}`}><button className={`pxc-design-preview is-${design.tone}`} onClick={() => tell(`${design.name} opened in the editor`)}><Palette size={23} /><span>Phoxta</span></button><div><span><strong>{design.name}</strong><small>{design.format}</small></span><em>{design.status}</em></div><footer><button onClick={() => tell(`${design.name} opened in the editor`)}>Edit</button><button onClick={() => { setDesigns((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, status: "Scheduled" } : item)); tell("Design added to the social queue"); }}>Post</button></footer></article>)}</div> : <div className="pxc-social-queue">{[["Customer story","Instagram · LinkedIn","Today · 18:30"],["City guide launch","Instagram · Facebook","Tomorrow · 09:00"],["Returning guest offer","LinkedIn","Friday · 12:00"]].map(([name,channels,time]) => <article key={name}><span><ImageIcon size={16} /></span><div><strong>{name}</strong><small>{channels}</small></div><em>{time}</em><button onClick={() => tell(`${name} opened for review`)}>Review</button></article>)}</div>}</>}

      {area === "bookings" && <><div className="pxc-cx-hero"><div><small>Bookings and reservations</small><h2>Keep every customer commitment clear.</h2><p>Confirm appointments, notify customers and track what happens next.</p></div><button onClick={() => tell("Booking form opened")}><Plus size={13} /> New booking</button></div><div className="pxc-booking-list">{bookings.map((booking, index) => <article key={`${booking.name}-${booking.date}`}><CalendarCheck2 size={17} /><span><strong>{booking.name}</strong><small>{booking.item} · {booking.date}</small></span><em className={`is-${booking.status.toLowerCase()}`}>{booking.status}</em>{booking.status === "Pending" && <button onClick={() => { setBookings((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, status: "Confirmed" } : item)); tell("Booking confirmed and customer notified"); }}>Confirm</button>}</article>)}</div></>}

      {area === "channels" && <><div className="pxc-cx-hero"><div><small>Omnichannel</small><h2>Choose where customers can reach you.</h2><p>Connected channels feed one inbox, one customer record and one AI context.</p></div><strong>4 of 5<small>connected</small></strong></div><div className="pxc-channel-grid">{[["Website chat","Live chat and forms"],["Email","Unified inbox and campaigns"],["SMS","Two-way messaging and reminders"],["WhatsApp","Conversations and templates"],["Voice","AI and human calls"]].map(([name,detail]) => <article key={name}><span><RadioTower size={16} /></span><div><strong>{name}</strong><small>{detail}</small></div><button className={switches[name] ? "on" : ""} onClick={() => { toggle(name); tell(`${name} ${switches[name] ? "disconnected" : "connected"}`); }}><i /></button></article>)}</div></>}

      {area === "assistant" && <><div className="pxc-cx-hero"><div><small>AI assistant</small><h2>Give the agent a clear job and boundaries.</h2><p>Phoxta handles routine work and pauses wherever human judgement matters.</p></div><button onClick={() => tell("Test conversation started")}>Test assistant</button></div><div className="pxc-ai-policy"><section><strong>Primary job</strong><select defaultValue="support"><option value="support">Answer, qualify and route customers</option><option value="sales">Convert enquiries into bookings</option><option value="care">Customer care and retention</option></select><label>Response tone<select defaultValue="warm"><option value="warm">Warm and concise</option><option value="formal">Professional</option><option value="direct">Direct</option></select></label></section><section><strong>Require human approval</strong>{["External messages","Pricing commitments","Refunds and payments"].map((policy) => <label key={policy}><span>{policy}</span><button className={switches[policy] ? "on" : ""} onClick={() => toggle(policy)}><i /></button></label>)}</section></div></>}

      {area === "insights" && <><div className="pxc-cx-hero"><div><small>Customer insights</small><h2>See what improves experience and revenue.</h2><p>Messages, calls, campaigns and bookings contribute to one view.</p></div><select value={period} onChange={(event) => setPeriod(event.target.value)}><option>7 days</option><option>30 days</option><option>90 days</option></select></div><div className="pxc-insight-metrics">{[[period === "7 days" ? "86" : period === "90 days" ? "1,482" : "524","Conversations","+18%"],["8m 42s","Response time","-31%"],["91%","Resolved","+7%"],["£24.8k","Attributed revenue","+16%"]].map(([value,label,delta]) => <article key={label}><small>{label}</small><strong>{value}</strong><em>{delta}</em></article>)}</div><div className="pxc-insight-bars"><strong>Performance by channel</strong>{[["Website chat",82],["Email",68],["SMS",57],["WhatsApp",44],["Voice",71]].map(([channel,value]) => <div key={channel}><span>{channel}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>)}</div></>}
    </div>
  </section>;
}

function CxToolbar({ query, setQuery, placeholder, children }: { query: string; setQuery: (value: string) => void; placeholder: string; children: React.ReactNode }) {
  return <div className="pxc-cx-toolbar"><label><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} /></label>{children}</div>;
}

function CxRows({ rows, action, onAction }: { rows: string[][]; action: string; onAction: () => void }) {
  return <div className="pxc-cx-rows">{rows.map(([name,detail,status]) => <article key={name}><Avatar src={CONTACTS.find((contact) => contact.name === name)?.avatar ?? CONTACTS[0].avatar} /><span><strong>{name}</strong><small>{detail}</small></span><em>{status}</em><button onClick={onAction}>{action}</button></article>)}</div>;
}

export function TodayWorkspace() {
  const [area, setArea] = useState<CxArea>("messages");
  const [activeContact, setActiveContact] = useState(2);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Array<{ id: number; side: "in" | "out"; text: string }>>([...INITIAL_MESSAGES]);
  const [callActive, setCallActive] = useState(false);
  const contact = CONTACTS.find((item) => item.id === activeContact) ?? CONTACTS[1];
  const contacts = useMemo(() => CONTACTS.filter((item) => `${item.name} ${item.preview}`.toLowerCase().includes(query.toLowerCase())), [query]);

  function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: Date.now(), side: "out", text }]);
    setDraft("");
  }

  return <section className="pxc-messenger" aria-label="Customer experience workspace">
    <nav className="pxc-message-tools" aria-label="Message tools">
      <button className={area === "insights" ? "active" : ""} onClick={() => setArea("insights")} aria-label="Customer overview"><span className="pxc-mini-home" /></button>
      <button className={area === "messages" ? "active" : ""} onClick={() => setArea("messages")} aria-label="Messages"><MessageCircle size={15} /></button>
      <button className={area === "email" ? "active" : ""} onClick={() => setArea("email")} aria-label="Email"><Mail size={15} /></button>
      <button className={area === "calls" ? "active" : ""} onClick={() => setArea("calls")} aria-label="Calls"><Mic size={14} /></button>
      <button className={area === "customers" ? "active" : ""} onClick={() => setArea("customers")} aria-label="Customers"><Search size={15} /></button>
      <button className={area === "bookings" ? "active" : ""} onClick={() => setArea("bookings")} aria-label="Bookings"><CalendarDays size={15} /></button>
      <button className={area === "graphics" ? "active" : ""} onClick={() => setArea("graphics")} aria-label="Graphics and social publishing"><Palette size={15} /></button>
      <button className={`pxc-message-settings${area === "channels" ? " active" : ""}`} onClick={() => setArea("channels")} aria-label="Channels"><Settings size={15} /></button>
    </nav>

    {area === "messages" ? <><aside className="pxc-inbox">
      <header><CxSwitcher value={area} onChange={setArea} /><span>12</span><button aria-label="Start a conversation"><Plus size={16} /></button></header>
      <label><Search size={12} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages" /></label>
      <div className="pxc-contact-list">{contacts.map((item) => <button className={item.id === activeContact ? "active" : ""} key={item.id} onClick={() => setActiveContact(item.id)}>
        <Avatar src={item.avatar} /><span><strong>{item.name}</strong><small>{item.preview}</small><em>{item.tags.map((tag) => <i key={tag}>{tag}</i>)}</em></span><time>{item.time}</time>
      </button>)}</div>
    </aside>

    <section className="pxc-conversation">
      <header><div><Avatar src={contact.avatar} alt={contact.name} /><span><strong>{contact.name}</strong><small><i /> Online</small></span></div><button className={callActive ? "active" : ""} onClick={() => setCallActive((value) => !value)}><Phone size={14} />{callActive ? "Calling…" : "Call"}</button></header>
      <div className="pxc-message-thread">{messages.map((message, index) => <div className={`is-${message.side}`} key={message.id}>{message.side === "in" && index % 3 === 0 && <Avatar src={contact.avatar} />}<span>{message.text}</span>{message.side === "out" && index % 3 === 1 && <Avatar src="/assets/imgs/template/avatar/avatar-16.webp" />}</div>)}</div>
      <form onSubmit={sendMessage}><button type="button" aria-label="Attach a file"><Paperclip size={14} /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message" /><button aria-label="Send message"><Send size={14} /></button></form>
    </section>

    <aside className="pxc-directory">
      <header><strong>Directory</strong><button aria-label="Directory options"><MoreVertical size={16} /></button></header>
      <section><div className="pxc-directory-title"><strong>Team Members</strong><span>6</span></div>{TEAM.map(([name, role, avatar]) => <button className="pxc-team-person" key={name}><Avatar src={`/assets/imgs/template/avatar/${avatar}`} /><span><strong>{name}</strong><small>{role}</small></span></button>)}</section>
      <section className="pxc-files"><div className="pxc-directory-title"><strong>Files</strong><span>125</span></div>{FILES.map(([name, meta, type]) => <button key={name}><span className={`is-${type}`}>{type === "image" ? <ImageIcon size={14} /> : <File size={14} />}</span><span><strong>{name}</strong><small>{meta}</small></span><Download size={13} /></button>)}</section>
    </aside>
    </> : <CapabilityView area={area} onAreaChange={setArea} />}
  </section>;
}

const PROJECTS = [
  { name: "Intercom", detail: "Digital Product Design", progress: 88, due: "July 23, 2026", tone: "violet", avatars: [3, 5, 8] },
  { name: "Zoho Recruit", detail: "Dashboard UI", progress: 58, due: "June 12, 2026", tone: "mint", avatars: [9, 11, 14] },
  { name: "Healthy Sure", detail: "Landing Page Website", progress: 30, due: "June 6, 2026", tone: "sand", avatars: [4, 16, 19] },
  { name: "UI/UX Studio", detail: "Landing Page Website", progress: 54, due: "June 6, 2026", tone: "pearl", avatars: [7, 12, 17] },
];

export function ProjectRail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [day, setDay] = useState(4);
  const [selected, setSelected] = useState("Intercom");
  return <aside className={`pxc-project-rail${open ? " is-open" : ""}`} aria-label="Schedule and projects">
    <button className="pxc-project-close" onClick={onClose} aria-label="Close schedule">×</button>
    <div className="pxc-week">{[["MON",4],["Tue",5],["Wed",6],["Thr",7],["Fri",8]].map(([label, value]) => <button className={day === value ? "active" : ""} key={value} onClick={() => setDay(Number(value))}><small>{label}</small><strong>{value}</strong></button>)}</div>
    <div className="pxc-project-list">{PROJECTS.map((project) => <button className={`pxc-project-card is-${project.tone}${selected === project.name ? " active" : ""}`} key={project.name} onClick={() => setSelected(project.name)}>
      <span className="pxc-project-copy"><strong>{project.name}</strong><small>{project.detail}</small></span><span className="pxc-progress" style={{ "--progress": `${project.progress * 3.6}deg` } as React.CSSProperties}><i>{project.progress}%</i></span>
      <span className="pxc-project-meta"><small>Team</small><span className="pxc-project-avatars">{project.avatars.map((avatar) => <img key={avatar} src={`/assets/imgs/template/avatar/avatar-${avatar}.webp`} alt="" />)}<i>+3</i></span></span>
      <span className="pxc-project-meta"><small>Due date</small><strong><CalendarDays size={11} />{project.due}</strong></span>
      {selected === project.name && <Check className="pxc-project-check" size={12} />}
    </button>)}</div>
    <button className="pxc-project-more"><CircleEllipsis size={15} /> View all projects</button>
  </aside>;
}
