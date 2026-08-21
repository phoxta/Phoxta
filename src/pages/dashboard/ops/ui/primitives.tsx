import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { initialsOf } from "./util";
import {
  Bot,
  Check,
  CheckCheck,
  Globe,
  Headphones,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Smartphone,
  Ticket,
  User,
  UserRound,
} from "lucide-react";

/**
 * Shared inbox primitives.
 *
 * The console has no component library, so these are the smallest set that
 * makes the redesign consistent: a portalled menu (the old hand-rolled
 * `position-absolute` popovers clipped inside the scroll panes), an avatar
 * that carries its channel, a tag, and the height measurement that lets the
 * three-pane shell fill the viewport without a magic number.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Menu — a portalled popover with roving focus
// ─────────────────────────────────────────────────────────────────────────────

type MenuCtx = { close: () => void };
const MenuContext = createContext<MenuCtx>({ close: () => {} });

export function Menu({
  trigger,
  children,
  placement = "bottom-end",
  label,
  open: controlledOpen,
  onOpenChange,
  matchWidth = false,
}: {
  /** Rendered as the button. Gets the ref + aria props merged in. */
  trigger: ReactElement;
  children: ReactNode;
  placement?: "bottom-end" | "bottom-start" | "top-end" | "top-start";
  label?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  /** Constrain the panel to the trigger's width (used by the channel picker). */
  matchWidth?: boolean;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const setOpen = useCallback(
    (v: boolean) => {
      if (controlledOpen === undefined) setUncontrolled(v);
      onOpenChange?.(v);
    },
    [controlledOpen, onOpenChange],
  );

  const listRef = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ rects, elements, availableHeight }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(160, availableHeight)}px`,
            ...(matchWidth ? { width: `${rects.reference.width}px` } : {}),
          });
        },
      }),
    ],
  });

  const interactions = useInteractions([
    useClick(context),
    useDismiss(context, { outsidePress: true, escapeKey: true }),
    useRole(context, { role: "menu" }),
    useListNavigation(context, {
      listRef,
      activeIndex,
      onNavigate: setActiveIndex,
      loop: true,
      focusItemOnOpen: false,
    }),
  ]);

  const ctx = useMemo<MenuCtx>(() => ({ close: () => setOpen(false) }), [setOpen]);

  const triggerEl = isValidElement(trigger)
    ? cloneElement(
        trigger as ReactElement<Record<string, unknown>>,
        interactions.getReferenceProps({
          ref: refs.setReference,
          "aria-expanded": open,
          "aria-haspopup": "menu",
          ...(trigger.props as Record<string, unknown>),
        }) as Record<string, unknown>,
      )
    : null;

  return (
    <MenuContext.Provider value={ctx}>
      {triggerEl}
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="oc-menu"
              aria-label={label}
              {...interactions.getFloatingProps()}
            >
              {children}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </MenuContext.Provider>
  );
}

/** A menu row. Closes the menu after running, unless `keepOpen`. */
export function MenuItem({
  children,
  onSelect,
  icon,
  hint,
  danger,
  disabled,
  keepOpen,
}: {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  hint?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  keepOpen?: boolean;
}) {
  const { close } = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={`oc-menu__item${danger ? " is-danger" : ""}`}
      onClick={() => {
        onSelect?.();
        if (!keepOpen) close();
      }}
    >
      {icon}
      <span className="flex-grow-1" style={{ minWidth: 0 }}>
        {children}
      </span>
      {hint && <span className="ms-auto">{hint}</span>}
    </button>
  );
}

export const MenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="oc-menu__label">{children}</div>
);
export const MenuSep = () => <div className="oc-menu__sep" role="separator" />;

// ─────────────────────────────────────────────────────────────────────────────
// Channels
// ─────────────────────────────────────────────────────────────────────────────

/** Icons, not emoji — the console renders these at 9px inside an avatar badge. */
export function ChannelIcon({ channel, size: s = 13 }: { channel?: string | null; size?: number }) {
  const p = { width: s, height: s, strokeWidth: 2.2 } as const;
  switch (channel) {
    case "sms":
      return <Smartphone {...p} />;
    case "whatsapp":
      return <MessageCircle {...p} />;
    case "web":
      return <Globe {...p} />;
    case "voice":
      return <Phone {...p} />;
    case "email":
      return <Mail {...p} />;
    case "ticket":
      return <Ticket {...p} />;
    default:
      return <MessageSquare {...p} />;
  }
}

/** Who wrote a message, as a glyph for the bubble's meta line. */
export function AuthorIcon({ role, size: s = 12 }: { role: string; size?: number }) {
  const p = { width: s, height: s, strokeWidth: 2.2 } as const;
  if (role === "agent" || role === "ai") return <Bot {...p} />;
  if (role === "system") return <Headphones {...p} />;
  if (role === "customer") return <User {...p} />;
  // "human" / "agent" (ticket) — a teammate on this side of the conversation.
  return <UserRound {...p} />;
}

/** Delivery state: one tick sent, two ticks delivered/read. */
export function DeliveryTick({ status }: { status?: string | null }) {
  if (!status) return null;
  if (status === "read" || status === "delivered")
    return <CheckCheck className={status === "read" ? "is-read" : undefined} width={12} height={12} strokeWidth={2.4} />;
  return <Check width={12} height={12} strokeWidth={2.4} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministic hue per customer. The console had one flat grey for everyone,
 * which made a list of 40 threads impossible to scan — colour is the fastest
 * "have I seen this person before" cue there is.
 */
function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  name,
  channel,
  unread,
  size: s = "md",
  tinted = true,
}: {
  name: string;
  /** Rendered as a small glyph pinned to the avatar. */
  channel?: string | null;
  unread?: boolean;
  size?: "sm" | "md" | "lg";
  tinted?: boolean;
}) {
  const hue = hueOf(name || "?");
  return (
    <span
      className={`oc-av oc-av--${s}`}
      aria-hidden="true"
      style={tinted ? { background: `hsl(${hue} 42% 42%)` } : undefined}
    >
      {initialsOf(name || "?")}
      {channel && (
        <span className="oc-av__ch">
          <ChannelIcon channel={channel} />
        </span>
      )}
      {unread && <span className="oc-av__dot" />}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small bits
// ─────────────────────────────────────────────────────────────────────────────

export function Tag({
  children,
  tone = "plain",
  icon,
}: {
  children: ReactNode;
  tone?: "plain" | "accent" | "ok" | "warn" | "danger" | "solid";
  icon?: ReactNode;
}) {
  return (
    <span className={`oc-tag${tone === "plain" ? "" : ` oc-tag--${tone}`}`}>
      {icon}
      {children}
    </span>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  active,
  disabled,
  tone,
  children,
  type = "button",
  ...rest
}: {
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  tone?: "rec";
  /** Optional visible text — turns it into a wide button. */
  children?: ReactNode;
  type?: "button" | "submit";
} & Record<string, unknown>) {
  return (
    <button
      type={type}
      title={label}
      aria-label={children ? undefined : label}
      disabled={disabled}
      onClick={onClick}
      className={`oc-ico${children ? " oc-ico--wide" : ""}${active ? " is-on" : ""}${tone === "rec" ? " oc-ico--rec" : ""}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  noteMode,
}: {
  options: { v: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Colours the active segment amber — used by the Reply/Note switch. */
  noteMode?: boolean;
}) {
  return (
    <div className={`oc-seg${noteMode ? " is-note" : ""}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          aria-pressed={value === o.v}
          onClick={() => onChange(o.v)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="oc-empty">
      <span className="oc-empty__ico">{icon}</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Shaped placeholders while the queue loads — better than the word "Loading…". */
export function SkeletonRows({ n = 7 }: { n?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div className="oc-skel" key={i}>
          <i />
          <div className="flex-grow-1">
            <i style={{ height: 10, width: `${52 + ((i * 13) % 30)}%`, marginBottom: 7 }} />
            <i style={{ height: 9, width: `${68 + ((i * 7) % 24)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Right-hand sheet used by the saved-replies drawer, the rich email composer
 * and (below 1200px) the context rail. Escape closes; focus is trapped.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  labelledBy,
}: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div
      className="oc-sheet__scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="oc-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={ref}
      >
        {title && (
          <div className="oc-sheet__head">
            <h2 id={labelledBy}>{title}</h2>
            <IconButton icon={<CloseGlyph />} label="Close" onClick={onClose} />
          </div>
        )}
        <div className="oc-sheet__body">{children}</div>
        {footer && <div className="oc-sheet__foot">{footer}</div>}
      </div>
    </div>
  );
}

const CloseGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="oc-kbd">{children}</kbd>;
