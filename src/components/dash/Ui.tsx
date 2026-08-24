import type { ReactNode } from "react";

/**
 * The dashboard's shared UI kit — thin wrappers over the .hrx-* classes in
 * src/styles/dashboard-theme.css (loaded once by DashboardLayout).
 *
 * Every dashboard page composes these so the design stays consistent by
 * construction: the header band, bordered cards, stat tiles, chips, list rows
 * and empty states all come from here rather than per-page markup.
 */

/** The page-top band: breadcrumb, big title, pill actions and an optional big stat. */
export function PageHeader({
  crumb = "Portal",
  title,
  note,
  tabs,
  actions,
  stat,
  compact = true,
}: {
  /** Left part of the breadcrumb; the right part is the page title. */
  crumb?: string;
  title: ReactNode;
  /** One supporting sentence under the title. */
  note?: ReactNode;
  /** A .hrx-tabbar of filter/section pills — rendered right-aligned on the
   *  title line (it scrolls horizontally instead of wrapping to a second row). */
  tabs?: ReactNode;
  /** Pill buttons (use .hrx-pill / .hrx-pill.primary). */
  actions?: ReactNode;
  /** The big right-hand figure. */
  stat?: { label: ReactNode; value: ReactNode };
  /** Inner pages use the compact band; the home page passes false. */
  compact?: boolean;
}) {
  return (
    <header className={`hrx-header${compact ? " sub" : ""}`}>
      <div style={{ minWidth: 0 }}>
        <p className="hrx-crumb">{crumb}&nbsp; <span>/&nbsp; {title}</span></p>
        <h1 className="hrx-greet">{title}</h1>
        {note && <p className="hrx-sub-note">{note}</p>}
      </div>
      {(tabs || actions || stat) && (
        <div className="hrx-header-right">
          {tabs}
          {actions && <div className="hrx-actions">{actions}</div>}
          {stat && (
            <div className="hrx-total">
              <span className="lbl">{stat.label}</span>
              <span className="val">{stat.value}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

/** A bordered white card with the standard padding and an optional title row. */
export function Card({
  title,
  right,
  children,
  className = "",
  pad = true,
}: {
  title?: ReactNode;
  /** Rendered opposite the title (a .hrx-seeall link, a select, …). */
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`hrx-card${pad ? " hrx-pad" : ""} ${className}`.trim()}>
      {(title || right) && (
        <div className="hrx-card-head">
          {title && <h2 className="hrx-card-title">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** One metric tile. `tone` maps to the comp's dark/blue/soft fills. */
export function StatTile({
  label,
  value,
  delta,
  tone,
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  /** e.g. { text: "+12%", up: true } */
  delta?: { text: ReactNode; up?: boolean };
  tone?: "soft" | "dark" | "blue";
  icon?: ReactNode;
}) {
  return (
    <div className={`hrx-stat${tone ? ` tint-${tone}` : ""}`}>
      <span className="l">{icon}{label}</span>
      <div className="v">{value}</div>
      {delta && <span className={`d ${delta.up ? "up" : "down"}`}>{delta.text}</span>}
    </div>
  );
}

/** Status/category badge. */
export function Chip({
  tone = "plain",
  children,
  icon,
}: {
  tone?: "plain" | "blue" | "orange" | "ok" | "warn" | "danger" | "solid" | "line";
  children: ReactNode;
  icon?: ReactNode;
}) {
  return <span className={`hrx-chip${tone === "plain" ? "" : ` ${tone}`}`}>{icon}{children}</span>;
}

/** Maps a business/order/etc. stage to a chip tone so colours stay consistent. */
export function stageTone(stage?: string | null): "ok" | "warn" | "blue" | "danger" | "plain" {
  switch (String(stage ?? "").toLowerCase()) {
    case "active":
    case "live":
    case "paid":
    case "fulfilled":
    case "confirmed":
    case "completed":
      return "ok";
    case "building":
    case "pending":
    case "draft":
    case "in progress":
      return "warn";
    case "cancelled":
    case "canceled":
    case "failed":
    case "refunded":
      return "danger";
    default:
      return "plain";
  }
}

/** The standard "nothing here yet" block. */
export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="hrx-empty" role="status">
      {icon && <span className="ico">{icon}</span>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Initials avatar in the theme's orange tint. */
export function InitialAvatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  return (
    <span className="hrx-avat" style={size !== 40 ? { width: size, height: size, fontSize: Math.round(size / 3) } : undefined} aria-hidden="true">
      {(name || "?").trim().slice(0, 1).toUpperCase()}
    </span>
  );
}
