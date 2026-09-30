import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUp,
  Check,
  Compass,
  Mic,
  Minus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MediaRow, ProductCards, RichText, type ChatCard, type ChatMedia } from "@shared-chat/chatRich";
import { blueprintCover } from "@/lib/blueprintCover";
import { formatPrice, listBlueprints, type Blueprint } from "@/lib/db/marketplace";
import { PROMO, promoPriceCents } from "@/lib/promo";
import { HOMEPAGE_BLUEPRINTS } from "./homeBlueprints";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const AGENT_URL =
  (import.meta.env.VITE_AGENT_URL as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/agent-inbound` : "");
const AGENT_KEY = (import.meta.env.VITE_AGENT_PUBLIC_KEY as string | undefined) ?? "";
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
const STORAGE_KEY = "phoxta:hero:opportunity-guide:v1";

type GuideStep = "budget" | "industry" | "involvement" | null;
type GuideProfile = {
  budget?: number | null;
  industry?: string;
  involvement?: string;
};

type QuickAction = {
  label: string;
  action: "guide" | "prompt" | "budget" | "industry" | "involvement" | "compare" | "link";
  value?: string;
  prompt?: string;
  href?: string;
};

type HeroMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: ChatCard[];
  media?: ChatMedia[];
  businesses?: Blueprint[];
  actions?: QuickAction[];
};

type StoredGuide = {
  messages?: HeroMessage[];
  profile?: GuideProfile;
  step?: GuideStep;
  conversationId?: string | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0?: { transcript?: string } }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const messageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const BUDGET_ACTIONS: QuickAction[] = [
  { label: "Up to £3,000", action: "budget", value: "300000" },
  { label: "£3,000–£5,000", action: "budget", value: "500000" },
  { label: "£5,000–£10,000", action: "budget", value: "1000000" },
  { label: "Help me decide", action: "budget", value: "0" },
];

const INVOLVEMENT_ACTIONS: QuickAction[] = [
  { label: "Part-time", action: "involvement", value: "part-time" },
  { label: "Full-time", action: "involvement", value: "full-time" },
  { label: "Owner-managed", action: "involvement", value: "owner-managed" },
  { label: "Mostly automated", action: "involvement", value: "mostly automated" },
];

const FOLLOW_UP_ACTIONS: QuickAction[] = [
  {
    label: "Explore opportunities",
    action: "prompt",
    prompt: "Show me evidence-backed business opportunities and explain the customer demand, strongest market signals and main risks for each one.",
  },
  {
    label: "How Phoxta works",
    action: "prompt",
    prompt: "Explain how Phoxta helps me discover, validate and launch a business, and tell me the best next step for someone just starting.",
  },
  { label: "Open Startup School", action: "link", href: "/startup-school" },
];

function loadGuide(): StoredGuide {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw) as StoredGuide;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function displayPrice(blueprint: Blueprint) {
  const cents = PROMO.active ? promoPriceCents(blueprint.price_cents) : blueprint.price_cents;
  return formatPrice(cents, blueprint.currency);
}

function parseBudget(question: string): number | null {
  const match = question.replaceAll(",", "").match(/(?:£|gbp\s*)?(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!match) return null;
  const pounds = Number(match[1]) * (match[2] ? 1000 : 1);
  if (!Number.isFinite(pounds) || pounds < 500) return null;
  return Math.round(pounds * 100);
}

function industryFromQuestion(question: string, catalogue: Blueprint[]): string | undefined {
  const lower = question.toLowerCase();
  return [...new Set(catalogue.map((item) => item.vertical).filter(Boolean))]
    .find((industry) => lower.includes(industry.toLowerCase()));
}

function recommendationMatches(profile: GuideProfile, catalogue: Blueprint[]): Blueprint[] {
  const budget = profile.budget && profile.budget > 0 ? profile.budget : null;
  const industry = profile.industry && profile.industry !== "Open to anything" ? profile.industry : null;
  const ranked = catalogue
    .map((business) => ({
      business,
      score:
        (industry && business.vertical === industry ? 4 : 0) +
        (budget && business.price_cents <= budget ? 2 : 0) +
        Number(business.verified) +
        Number(business.ai_included),
    }))
    .filter(({ business }) => !budget || business.price_cents <= budget)
    .sort((a, b) => b.score - a.score || a.business.price_cents - b.business.price_cents)
    .map(({ business }) => business);

  if (industry) {
    const exact = ranked.filter((business) => business.vertical === industry);
    if (exact.length) return exact.slice(0, 3);
  }
  return (ranked.length ? ranked : catalogue).slice(0, 3);
}

function fallbackReply(question: string): { text: string; actions: QuickAction[] } {
  const lower = question.toLowerCase();
  if (lower.includes("include") || lower.includes("asset")) {
    return {
      text: "A Phoxta ready-to-launch business can include the product, brand system, customer workflows, automation, AI infrastructure and launch assets already developed. Open a business to review its exact scope, price and handover details.",
      actions: [
        { label: "Browse businesses", action: "link", href: "/marketplace" },
        ...FOLLOW_UP_ACTIONS.slice(0, 1),
      ],
    };
  }
  if (lower.includes("school") || lower.includes("validate") || lower.includes("learn")) {
    return {
      text: "Phoxta Startup School helps you identify a real customer problem, test critical assumptions, design the business model and launch with evidence. You can open the school now or ask me to find a business first.",
      actions: [
        { label: "Open Startup School", action: "link", href: "/startup-school" },
        { label: "Find me a business", action: "guide" },
      ],
    };
  }
  if (lower.includes("opportunit") || lower.includes("market") || lower.includes("problem")) {
    return {
      text: "Phoxta's opportunity research examines customer demand, priority markets, competition and regulation. Open the opportunity explorer for the full research, or tell me an industry and I will narrow the direction.",
      actions: [
        { label: "Explore opportunities", action: "link", href: "/discover" },
        { label: "Help me choose", action: "guide" },
      ],
    };
  }
  return {
    text: "I can help you find a ready-to-launch business, explore an evidence-backed opportunity, compare catalogue options or choose a Startup School path.",
    actions: FOLLOW_UP_ACTIONS,
  };
}

function getSpeechConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export default function HeroChat() {
  const restored = useMemo(loadGuide, []);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<HeroMessage[]>(() => Array.isArray(restored.messages) ? restored.messages.slice(-30) : []);
  const [catalogue, setCatalogue] = useState<Blueprint[]>(HOMEPAGE_BLUEPRINTS);
  const [profile, setProfile] = useState<GuideProfile>(() => restored.profile ?? {});
  const [guideStep, setGuideStep] = useState<GuideStep>(() => restored.step ?? null);
  const [conversationId, setConversationId] = useState<string | null>(() => restored.conversationId ?? null);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messageList = useRef<HTMLDivElement>(null);
  const speechRecognition = useRef<SpeechRecognitionLike | null>(null);
  const busyRef = useRef(false);
  const expanded = !minimized && (active || messages.length > 0 || busy || guideStep !== null);

  const industryActions = useMemo<QuickAction[]>(() => {
    const industries = [...new Set(catalogue.map((item) => item.vertical).filter(Boolean))].slice(0, 7);
    return [
      ...industries.map((industry) => ({ label: industry, action: "industry" as const, value: industry })),
      { label: "Open to anything", action: "industry", value: "Open to anything" },
    ];
  }, [catalogue]);

  useEffect(() => {
    let mounted = true;
    void listBlueprints().then(({ data }) => {
      if (mounted && data.length) setCatalogue(data);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechConstructor()));
    return () => speechRecognition.current?.abort();
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages: messages.slice(-30),
        profile,
        step: guideStep,
        conversationId,
      } satisfies StoredGuide));
    } catch { /* Session storage can be unavailable in privacy modes. */ }
  }, [conversationId, guideStep, messages, profile]);

  useEffect(() => {
    if (!expanded) return;
    messageList.current?.scrollTo({ top: messageList.current.scrollHeight, behavior: "smooth" });
  }, [expanded, messages, busy]);

  function addMessages(...next: HeroMessage[]) {
    setMessages((current) => [...current, ...next].slice(-30));
  }

  function userMessage(text: string): HeroMessage {
    return { id: messageId(), role: "user", text };
  }

  function assistantMessage(text: string, extra: Partial<HeroMessage> = {}): HeroMessage {
    return { id: messageId(), role: "assistant", text, ...extra };
  }

  function beginGuide(label = "Help me choose a business") {
    setActive(true);
    setMinimized(false);
    setGuideStep("budget");
    setProfile({});
    setCompareSelection([]);
    addMessages(
      userMessage(label),
      assistantMessage("Let's narrow the catalogue. What budget would you like to work within?", { actions: BUDGET_ACTIONS }),
    );
  }

  function showRecommendations(nextProfile: GuideProfile) {
    const matches = recommendationMatches(nextProfile, catalogue);
    const budgetText = nextProfile.budget
      ? ` within a ${formatPrice(nextProfile.budget, "GBP")} budget`
      : " without fixing the budget yet";
    const industryText = nextProfile.industry && nextProfile.industry !== "Open to anything"
      ? ` in ${nextProfile.industry}`
      : " across the catalogue";
    const involvementText = nextProfile.involvement ? ` for a ${nextProfile.involvement} role` : "";
    addMessages(assistantMessage(
      `These are the strongest current catalogue matches${industryText}${budgetText}${involvementText}. Select two or three to compare, or open one to review its full scope.`,
      {
        businesses: matches,
        actions: [
          { label: "Show all businesses", action: "link", href: "/marketplace" },
          ...FOLLOW_UP_ACTIONS.slice(0, 1),
        ],
      },
    ));
  }

  function compareBusinesses(items: Blueprint[], includeUserMessage = true) {
    if (items.length < 2) return;
    const lines = items.map((business) =>
      `- **${business.name}** — ${displayPrice(business)}, ${business.vertical}, ${business.tier} package${business.ai_included ? ", AI included" : ""}.`,
    );
    const comparison = assistantMessage(
        `Here is the factual catalogue comparison:\n${lines.join("\n")}\n\nPrice and category narrow the choice, but operating fit still matters. Tell me what you want to optimise for and I will explain the trade-offs.`,
        {
          actions: [
            {
              label: "Compare operating fit",
              action: "prompt",
              prompt: `Compare ${items.map((item) => item.name).join(", ")} for operating complexity, likely owner involvement and speed to launch. Use only verified Phoxta catalogue information and state any unknowns clearly.`,
            },
            { label: "Browse all", action: "link", href: "/marketplace" },
          ],
        },
      );
    if (includeUserMessage) addMessages(userMessage(`Compare ${items.map((item) => item.name).join(" and ")}`), comparison);
    else addMessages(comparison);
  }

  async function requestAgent(question: string) {
    busyRef.current = true;
    setBusy(true);
    try {
      if (!AGENT_URL || !AGENT_KEY) throw new Error("Phoxta agent configuration is unavailable.");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (ANON_KEY) {
        headers.Authorization = `Bearer ${ANON_KEY}`;
        headers.apikey = ANON_KEY;
      }
      const visitorContext = [
        profile.budget ? `budget ${formatPrice(profile.budget, "GBP")}` : "",
        profile.industry ? `industry ${profile.industry}` : "",
        profile.involvement ? `preferred involvement ${profile.involvement}` : "",
      ].filter(Boolean).join(", ");
      const contextualQuestion = visitorContext
        ? `${question}\n\nVisitor context already collected by the Phoxta hero guide: ${visitorContext}. Use this context, answer concisely, and use live Phoxta data when recommending a business or opportunity. For market evidence, name its source and date when available; state clearly when evidence is unavailable.`
        : `${question}\n\nAnswer as the Phoxta Opportunity Guide. Be concise and use live Phoxta data when recommending a business or opportunity. For market evidence, name its source and date when available; state clearly when evidence is unavailable.`;
      const response = await fetch(AGENT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          public_key: AGENT_KEY,
          channel: "web",
          conversationId,
          message: contextualQuestion,
        }),
      });
      const data = await response.json() as {
        conversationId?: unknown;
        reply?: unknown;
        cards?: unknown;
        media?: unknown;
      };
      if (typeof data.conversationId === "string") setConversationId(data.conversationId);
      const reply = typeof data.reply === "string" ? data.reply.trim() : "";
      if (!response.ok || !reply) throw new Error(`Phoxta agent returned ${response.status}.`);
      addMessages(assistantMessage(reply, {
        cards: Array.isArray(data.cards) ? data.cards as ChatCard[] : [],
        media: Array.isArray(data.media) ? data.media as ChatMedia[] : [],
        actions: Array.isArray(data.cards) && data.cards.length
          ? [
              { label: "Help me choose", action: "guide" },
              { label: "Browse all", action: "link", href: "/marketplace" },
            ]
          : FOLLOW_UP_ACTIONS,
      }));
    } catch (error) {
      console.error("[phoxta] hero opportunity guide unavailable:", error);
      const fallback = fallbackReply(question);
      addMessages(assistantMessage(fallback.text, { actions: fallback.actions }));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function sendMessage(raw: string, visibleText = raw) {
    const question = raw.trim();
    if (!question || busyRef.current) return;
    setActive(true);
    setMinimized(false);
    setDraft("");
    addMessages(userMessage(visibleText.trim() || question));

    const lower = question.toLowerCase();
    const named = catalogue.filter((business) => lower.includes(business.name.toLowerCase()));
    if (lower.includes("compare") && named.length >= 2) {
      compareBusinesses(named.slice(0, 3), false);
      return;
    }

    const catalogueIntent = /\b(find|show|recommend|suggest|looking for|best)\b.*\b(business|businesses)\b/i.test(question);
    if (catalogueIntent) {
      const budget = parseBudget(question);
      const industry = industryFromQuestion(question, catalogue);
      if (!budget && !industry) {
        setGuideStep("budget");
        addMessages(assistantMessage("What budget would you like the business to fit?", { actions: BUDGET_ACTIONS }));
        return;
      }
      const nextProfile = { ...profile, ...(budget ? { budget } : {}), ...(industry ? { industry } : {}) };
      setProfile(nextProfile);
      showRecommendations(nextProfile);
      return;
    }

    await requestAgent(question);
  }

  function handleAction(action: QuickAction) {
    if (busyRef.current) return;
    if (action.action === "guide") {
      beginGuide(action.label);
      return;
    }
    if (action.action === "prompt" && action.prompt) {
      void sendMessage(action.prompt, action.label);
      return;
    }
    if (action.action === "compare") {
      const selected = catalogue.filter((business) => compareSelection.includes(business.id));
      compareBusinesses(selected);
      return;
    }
    if (action.action === "budget") {
      const budget = Number(action.value ?? 0) || null;
      setProfile({ budget });
      setGuideStep("industry");
      addMessages(
        userMessage(action.label),
        assistantMessage("Which industry interests you most?", { actions: industryActions }),
      );
      return;
    }
    if (action.action === "industry") {
      const nextProfile = { ...profile, industry: action.value ?? action.label };
      setProfile(nextProfile);
      setGuideStep("involvement");
      addMessages(
        userMessage(action.label),
        assistantMessage("How involved would you like to be in running it?", { actions: INVOLVEMENT_ACTIONS }),
      );
      return;
    }
    if (action.action === "involvement") {
      const nextProfile = { ...profile, involvement: action.value ?? action.label };
      setProfile(nextProfile);
      setGuideStep(null);
      addMessages(userMessage(action.label));
      showRecommendations(nextProfile);
    }
  }

  function toggleCompare(business: Blueprint) {
    setCompareSelection((current) => {
      if (current.includes(business.id)) return current.filter((id) => id !== business.id);
      if (current.length >= 3) return current;
      return [...current, business.id];
    });
  }

  function resetGuide() {
    speechRecognition.current?.abort();
    setDraft("");
    setMessages([]);
    setProfile({});
    setGuideStep(null);
    setConversationId(null);
    setCompareSelection([]);
    setBusy(false);
    busyRef.current = false;
    setMinimized(false);
    setActive(true);
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* No-op. */ }
  }

  function minimiseGuide() {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement) focused.blur();
    setActive(false);
    setMinimized(true);
  }

  function toggleDictation() {
    if (listening) {
      speechRecognition.current?.abort();
      return;
    }
    const Constructor = getSpeechConstructor();
    if (!Constructor) return;
    const recognition = new Constructor();
    speechRecognition.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || "en-GB";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setDraft((current) => current ? `${current} ${transcript}` : transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <form
      className={`phoxta-hero-chat${expanded ? " phoxta-hero-chat--expanded" : ""}${messages.length ? " phoxta-hero-chat--has-session" : ""}`}
      aria-label="Phoxta Opportunity Guide"
      onSubmit={submit}
    >
      {expanded && (
        <header className="phoxta-hero-chat__header">
          <div>
            <span className="phoxta-hero-chat__mark"><Sparkles size={14} aria-hidden="true" /></span>
            <span><strong>Phoxta Guide</strong><small>Opportunity and business discovery</small></span>
          </div>
          <div className="phoxta-hero-chat__header-actions">
            <button type="button" onClick={resetGuide} aria-label="Start a new conversation" title="Start again">
              <RotateCcw size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={minimiseGuide} aria-label="Minimise conversation" title="Minimise">
              <Minus size={16} aria-hidden="true" />
            </button>
          </div>
        </header>
      )}

      {expanded && (
        <div className="phoxta-hero-chat__messages" ref={messageList} role="log" aria-live="polite" aria-busy={busy}>
          {!messages.length && (
            <div className="phoxta-hero-chat__welcome">
              <strong>What would you like to build or discover?</strong>
              <p>Tell me your budget, interests or goal, and I will help you choose the strongest route.</p>
              <div className="phoxta-hero-chat__suggestions">
                <button type="button" onClick={() => beginGuide("Find me a business")}>Find me a business</button>
                <button type="button" onClick={() => void sendMessage("Show me evidence-backed business opportunities and explain the customer demand, strongest market signals and main risks for each one.", "Explore opportunities")}>Explore opportunities</button>
                <button type="button" onClick={() => beginGuide("Help me choose")}>Help me choose</button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              className={`phoxta-hero-chat__message phoxta-hero-chat__message--${message.role}${message.businesses?.length || message.cards?.length ? " phoxta-hero-chat__message--wide" : ""}`}
              key={message.id}
            >
              <RichText text={message.text} />
              <MediaRow media={message.media} />
              <ProductCards cards={message.cards} />
              {message.businesses?.length ? (
                <div className="phoxta-hero-chat__businesses" aria-label="Recommended ready-to-launch businesses">
                  {message.businesses.map((business) => {
                    const selected = compareSelection.includes(business.id);
                    const compareFull = compareSelection.length >= 3 && !selected;
                    const viewBusiness = `/marketplace?q=${encodeURIComponent(business.name)}`;
                    return (
                      <article className="phoxta-hero-chat__business" key={business.id}>
                        <img src={blueprintCover(business.slug, business.cover_url)} alt="" width={240} height={154} loading="lazy" />
                        <div className="phoxta-hero-chat__business-copy">
                          <span>{business.vertical} · {business.tier}</span>
                          <strong>{business.name}</strong>
                          <p>{business.tagline}</p>
                          <div>
                            <b>{displayPrice(business)}</b>
                            <button
                              type="button"
                              className="phoxta-hero-chat__compare-toggle"
                              data-selected={selected}
                              disabled={compareFull}
                              onClick={() => toggleCompare(business)}
                              aria-pressed={selected}
                            >
                              {selected && <Check size={12} aria-hidden="true" />}
                              {selected ? "Selected" : "Compare"}
                            </button>
                          </div>
                          <Link to={viewBusiness}>View business <ArrowRight size={12} aria-hidden="true" /></Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}
              {message.businesses?.length && compareSelection.length >= 2 ? (
                <button
                  type="button"
                  className="phoxta-hero-chat__compare-action"
                  onClick={() => handleAction({ label: "Compare selected", action: "compare" })}
                >
                  Compare {compareSelection.length} selected businesses
                </button>
              ) : null}
              {message.actions?.length ? (
                <div className="phoxta-hero-chat__suggestions phoxta-hero-chat__suggestions--message">
                  {message.actions.map((action, index) => action.action === "link" && action.href ? (
                    <Link to={action.href} key={`${action.label}-${index}`}>{action.label}</Link>
                  ) : (
                    <button type="button" onClick={() => handleAction(action)} key={`${action.label}-${index}`} disabled={busy}>
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {busy && (
            <div className="phoxta-hero-chat__typing" role="status" aria-label="Phoxta is reviewing its research">
              <span />
              <span />
              <span />
              <small>Reviewing Phoxta research</small>
            </div>
          )}
        </div>
      )}

      <div className="phoxta-hero-chat__composer">
        <label htmlFor="phoxta-hero-question" className="visually-hidden">Ask Phoxta to find, compare or launch a business opportunity</label>
        <textarea
          id="phoxta-hero-question"
          rows={1}
          maxLength={4000}
          placeholder={messages.length ? "Ask Phoxta a follow-up question…" : "What would you like to build or discover?"}
          value={draft}
          onFocus={() => { setActive(true); setMinimized(false); }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="phoxta-hero-chat__toolbar">
          <div className="phoxta-hero-chat__tools">
            <button type="button" disabled={busy} onClick={() => void sendMessage("Show me evidence-backed business opportunities and explain the customer demand, strongest market signals and main risks for each one.", "Explore opportunities")} aria-label="Explore evidence-backed opportunities" title="Explore opportunities">
              <Compass size={18} aria-hidden="true" />
            </button>
            <button type="button" disabled={busy} onClick={() => beginGuide("Help me choose a business")} aria-label="Set business preferences" title="Help me choose">
              <SlidersHorizontal size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={toggleDictation}
              disabled={!speechSupported || busy}
              data-listening={listening}
              aria-label={listening ? "Stop voice input" : "Use voice input"}
              title={speechSupported ? (listening ? "Stop listening" : "Voice input") : "Voice input is not supported by this browser"}
            >
              <Mic size={18} aria-hidden="true" />
            </button>
          </div>
          <button type="submit" className="phoxta-hero-chat__send" disabled={busy || !draft.trim()} aria-label="Ask Phoxta">
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  );
}
