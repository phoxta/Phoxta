/**
 * The component kit.
 *
 * Untitled UI foundations for the expressive surfaces, IBM Carbon density and
 * motion for the productive ones, implemented directly against the tokens in
 * `styles/tokens.css` so nothing is inherited from a third-party component CSS.
 * Every element here is unstyled markup plus a `u-` class from `styles/ui.css`.
 */
import {
  createContext, forwardRef, useCallback, useContext, useEffect, useId, useMemo, useRef, useState,
  type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ComponentType, type ElementType,
  type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle, InfoCircle, XClose,
} from '@untitledui/icons'

/** Content modules type their icons as `ElementType`; accept both. */
export type IconType = ComponentType<{ size?: number; className?: string }> | ElementType

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

/* ═══════════════════════════════════════════════════════════════════════════
   Button
   ═══════════════════════════════════════════════════════════════════════════ */

export type ButtonVariant = 'primary' | 'secondary' | 'gray' | 'tertiary' | 'danger' | 'inverse' | 'ghost-inverse'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonLook {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  leadingIcon?: IconType
  trailingIcon?: IconType
  loading?: boolean
}

const buttonClass = ({ variant = 'gray', size = 'md', block, className }: ButtonLook & { className?: string }) =>
  cx('u-btn', `u-btn--${variant}`, size !== 'md' && `u-btn--${size}`, block && 'u-btn--block', className)

const iconPx = (size: ButtonSize = 'md') => (size === 'sm' ? 15 : size === 'xl' ? 20 : 17)

function Inner({ leadingIcon: L, trailingIcon: T, loading, size, children }: ButtonLook & { children?: ReactNode }) {
  const px = iconPx(size)
  const L2 = L as ComponentType<{ size?: number }> | undefined
  const T2 = T as ComponentType<{ size?: number }> | undefined
  return (
    <>
      {loading ? <span className="u-spinner" style={{ width: px, height: px, borderWidth: 2 }} aria-hidden="true" /> : L2 ? <L2 size={px} /> : null}
      {children}
      {T2 && !loading ? <T2 size={px} /> : null}
    </>
  )
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, leadingIcon, trailingIcon, loading, className, children, disabled, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={buttonClass({ variant, size, block, className })}
      disabled={disabled || loading}
      {...rest}
    >
      <Inner leadingIcon={leadingIcon} trailingIcon={trailingIcon} loading={loading} size={size}>{children}</Inner>
    </button>
  )
})

export type LinkButtonProps = ButtonLook & { className?: string; children?: ReactNode } & (
  | ({ to: LinkProps['to'] } & Omit<LinkProps, 'className' | 'children'>)
  | ({ to?: undefined } & AnchorHTMLAttributes<HTMLAnchorElement>)
)

/** Renders a router `Link` when given `to`, otherwise a plain anchor. */
export function LinkButton(props: LinkButtonProps) {
  const { variant, size, block, leadingIcon, trailingIcon, loading, className, children, ...rest } = props
  const cls = buttonClass({ variant, size, block, className })
  const inner = <Inner leadingIcon={leadingIcon} trailingIcon={trailingIcon} loading={loading} size={size}>{children}</Inner>
  if ('to' in rest && rest.to !== undefined) {
    return <Link className={cls} {...(rest as LinkProps)}>{inner}</Link>
  }
  return <a className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>{inner}</a>
}

export type IconButtonProps = Omit<ButtonProps, 'leadingIcon' | 'trailingIcon' | 'children'> & {
  icon: IconType
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, variant = 'tertiary', size = 'md', className, ...rest }, ref,
) {
  const Icon = icon as ComponentType<{ size?: number }>
  return (
    <button ref={ref} type="button" className={cx(buttonClass({ variant, size, className }), 'u-btn--icon')} {...rest}>
      <Icon size={iconPx(size) + 1} />
    </button>
  )
})

/* ═══════════════════════════════════════════════════════════════════════════
   Badge · Tag · Featured icon
   ═══════════════════════════════════════════════════════════════════════════ */

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'error' | 'outline'

export function Badge({ tone = 'neutral', size = 'sm', dot, icon, children, className }: {
  tone?: Tone
  size?: 'sm' | 'md'
  dot?: boolean
  icon?: IconType
  children: ReactNode
  className?: string
}) {
  const Icon = icon as ComponentType<{ size?: number }> | undefined
  return (
    <span className={cx('u-badge', tone !== 'neutral' && `u-badge--${tone}`, size === 'md' && 'u-badge--md', className)}>
      {dot && <span className="u-badge__dot" aria-hidden="true" />}
      {Icon && <Icon size={12} />}
      {children}
    </span>
  )
}

export function Tag({ children, icon, className }: { children: ReactNode; icon?: IconType; className?: string }) {
  const Icon = icon as ComponentType<{ size?: number }> | undefined
  return <span className={cx('u-tag', className)}>{Icon && <Icon size={13} />}{children}</span>
}

export function FeaturedIcon({ icon, tone = 'brand', size = 'md', className }: {
  icon: IconType
  tone?: 'brand' | 'gradient' | 'success' | 'warning' | 'error' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const Icon = icon as ComponentType<{ size?: number }>
  const px = size === 'sm' ? 18 : size === 'lg' ? 26 : 21
  return (
    <span className={cx('u-feat', tone !== 'brand' && `u-feat--${tone}`, size !== 'md' && `u-feat--${size}`, className)} aria-hidden="true">
      <Icon size={px} />
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Alert
   ═══════════════════════════════════════════════════════════════════════════ */

const ALERT_ICON = { info: InfoCircle, success: CheckCircle, warning: AlertTriangle, error: AlertTriangle } as const

export function Alert({ tone = 'info', title, children, onDismiss, action, className }: {
  tone?: 'info' | 'success' | 'warning' | 'error'
  title?: ReactNode
  children?: ReactNode
  onDismiss?: () => void
  action?: ReactNode
  className?: string
}) {
  const Icon = ALERT_ICON[tone]
  return (
    <div className={cx('u-alert', `u-alert--${tone}`, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="u-alert__icon" aria-hidden="true"><Icon size={18} /></span>
      <div>
        {title && <div className="u-alert__title">{title}</div>}
        {children && <div className="u-alert__body">{children}</div>}
        {action && <div style={{ marginTop: 'var(--space-3)' }}>{action}</div>}
      </div>
      {onDismiss && <IconButton icon={XClose} size="sm" aria-label="Dismiss" onClick={onDismiss} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card
   ═══════════════════════════════════════════════════════════════════════════ */

export function Card({ as: As = 'div', raised, muted, flush, interactive, className, children, ...rest }: {
  as?: ElementType
  raised?: boolean
  muted?: boolean
  flush?: boolean
  interactive?: boolean
  className?: string
  children: ReactNode
} & Record<string, unknown>) {
  return (
    <As
      className={cx('u-card', raised && 'u-card--raised', muted && 'u-card--muted', flush && 'u-card--flush', interactive && 'u-card--interactive', className)}
      {...rest}
    >
      {children}
    </As>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Form controls
   ═══════════════════════════════════════════════════════════════════════════ */

export function Field({ label, hint, error, children, id, className }: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode
  id?: string
  className?: string
}) {
  const auto = useId()
  const fieldId = id ?? auto
  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined
  return (
    <div className={cx('u-field', className)}>
      {label && <label className="u-label" htmlFor={fieldId}>{label}</label>}
      {children({ id: fieldId, 'aria-describedby': describedBy, ...(error ? { 'aria-invalid': true as const } : {}) })}
      {error ? <span className="u-error-text" id={`${fieldId}-err`}>{error}</span>
        : hint ? <span className="u-hint" id={`${fieldId}-hint`}>{hint}</span> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { small?: boolean }>(
  function Input({ className, small, ...rest }, ref) {
    return <input ref={ref} className={cx('u-input', small && 'u-input--sm', className)} {...rest} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx('u-textarea', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { small?: boolean }>(
  function Select({ className, small, children, ...rest }, ref) {
    return <select ref={ref} className={cx('u-select', small && 'u-input--sm', className)} {...rest}>{children}</select>
  },
)

export function Checkbox({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="u-check">
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}

export function Toggle({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label className="u-toggle">
      <input type="checkbox" role="switch" {...rest} />
      <i aria-hidden="true" />
      {label && <span className="u-text-sm">{label}</span>}
    </label>
  )
}

export function Range({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="range" className={cx('u-range', className)} {...rest} />
}

/* ═══════════════════════════════════════════════════════════════════════════
   Feedback
   ═══════════════════════════════════════════════════════════════════════════ */

export function Spinner({ size = 'md', label }: { size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const style = size === 'sm' ? { width: 14, height: 14, borderWidth: 2 } : undefined
  return (
    <span role={label ? 'status' : undefined} aria-label={label} className="u-row u-row--tight">
      <span className={cx('u-spinner', size === 'lg' && 'u-spinner--lg')} style={style} aria-hidden="true" />
      {label && <span className="u-text-sm u-muted">{label}</span>}
    </span>
  )
}

export function Progress({ value, tone, label, small }: { value: number; tone?: 'success' | 'warning' | 'error'; label?: string; small?: boolean }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cx('u-progress', tone && `u-progress--${tone}`, small && 'u-progress--sm')}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i style={{ width: `${v}%` }} />
    </div>
  )
}

export function EmptyState({ icon, title, children, action }: {
  icon?: IconType
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  const Icon = icon
  return (
    <div className="u-empty">
      {Icon && <FeaturedIcon icon={Icon} tone="neutral" size="lg" />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="u-row" style={{ justifyContent: 'center', marginTop: 'var(--space-2)' }}>{action}</div>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Navigation
   ═══════════════════════════════════════════════════════════════════════════ */

export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  label: string
}) {
  return (
    <div className="u-segment" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, options, label }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: IconType }[]
  label: string
}) {
  return (
    <div className="u-tabs" role="tablist" aria-label={label}>
      {options.map((o) => (
        <TabButton key={o.value} option={o} selected={o.value === value} onSelect={() => onChange(o.value)} />
      ))}
    </div>
  )
}

function TabButton({ option, selected, onSelect }: { option: { label: ReactNode; icon?: IconType }; selected: boolean; onSelect: () => void }) {
  const Icon = option.icon as ComponentType<{ size?: number }> | undefined
  return (
    <button type="button" role="tab" className="u-tab" aria-selected={selected} onClick={onSelect}>
      {Icon && <Icon size={16} />}
      {option.label}
    </button>
  )
}

export function Avatar({ src, name, size = 'md' }: { src?: string; name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <span className={cx('u-avatar', size === 'sm' && 'u-avatar--sm')} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Menu — a small accessible dropdown, so no third-party overlay is needed.
   ═══════════════════════════════════════════════════════════════════════════ */

interface MenuCtx { close: () => void }
const MenuContext = createContext<MenuCtx>({ close: () => undefined })

export function Menu({ trigger, children, align = 'end', label }: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  label: string
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const ctx = useMemo(() => ({ close }), [close])

  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', [align === 'end' ? 'right' : 'left']: 0, zIndex: 60,
            minWidth: 220, background: 'var(--bg-primary)', border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 'var(--space-1)', display: 'grid', gap: 2,
          }}
        >
          <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  )
}

export function MenuItem({ children, onSelect, icon, danger }: {
  children: ReactNode
  onSelect?: () => void
  icon?: IconType
  danger?: boolean
}) {
  const { close } = useContext(MenuContext)
  const Icon = icon as ComponentType<{ size?: number }> | undefined
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => { onSelect?.(); close() }}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%', textAlign: 'left',
        padding: '8px 10px', borderRadius: 'var(--radius-md)', border: 0, background: 'none', cursor: 'pointer',
        font: 'inherit', fontSize: 'var(--text-sm-size)', fontWeight: 500,
        color: danger ? 'var(--text-error)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}

export function MenuDivider() {
  return <hr className="u-divider" style={{ margin: 'var(--space-1) 0' }} />
}

/* ═══════════════════════════════════════════════════════════════════════════
   Modal
   ═══════════════════════════════════════════════════════════════════════════ */

export function Modal({ open, onClose, title, subtitle, children, footer, width = 560 }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-overlay)', display: 'grid', placeItems: 'center', padding: 'var(--space-4)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        style={{
          width: '100%', maxWidth: width, background: 'var(--bg-primary)', borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-2xl)', border: '1px solid var(--border-secondary)', outline: 'none',
          maxHeight: '90vh', display: 'grid', gridTemplateRows: 'auto 1fr auto',
        }}
      >
        <header style={{ padding: 'var(--space-6) var(--space-6) var(--space-4)', display: 'flex', gap: 'var(--space-4)', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <h2 className="u-display-xs" style={{ fontSize: 'var(--text-lg-size)', lineHeight: 1.4 }}>{title}</h2>
            {subtitle && <p className="u-text-sm u-muted" style={{ marginTop: 4 }}>{subtitle}</p>}
          </div>
          <IconButton icon={XClose} size="sm" aria-label="Close" onClick={onClose} />
        </header>
        <div style={{ padding: '0 var(--space-6)', overflowY: 'auto' }}>{children}</div>
        <footer style={{ padding: 'var(--space-5) var(--space-6) var(--space-6)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          {footer ?? <Button onClick={onClose}>Close</Button>}
        </footer>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Layout helpers
   ═══════════════════════════════════════════════════════════════════════════ */

export function Container({ wide, className, children, style }: { wide?: boolean; className?: string; children: ReactNode; style?: React.CSSProperties }) {
  return <div className={cx('u-container', wide && 'u-container--wide', className)} style={style}>{children}</div>
}

export function Divider({ children, className }: { children?: ReactNode; className?: string }) {
  if (children) return <div className={cx('u-divider--text', className)}>{children}</div>
  return <hr className={cx('u-divider', className)} />
}

export function Checks({ items }: { items: ReactNode[] }) {
  return (
    <ul className="u-checks">
      {items.map((it, i) => (
        <li key={i}><span><CheckCircle size={15} /></span><span>{it}</span></li>
      ))}
    </ul>
  )
}

export function CodeBlock({ code, label, wrap }: { code: string; label?: string; wrap?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600) }).catch(() => undefined)
  }
  return (
    <div className="u-code-wrap">
      <pre className="u-code" tabIndex={0} style={wrap ? { whiteSpace: 'pre-wrap' } : undefined}><code>{code}</code></pre>
      <div className="u-code-wrap__actions">
        {label && <span className="u-badge u-badge--outline" style={{ background: 'rgb(255 255 255 / .06)', borderColor: 'rgb(255 255 255 / .18)', color: 'var(--gray-300)' }}>{label}</span>}
        <Button size="sm" variant="ghost-inverse" onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
      </div>
    </div>
  )
}

export { cx }
