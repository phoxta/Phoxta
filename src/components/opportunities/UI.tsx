import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowUpRight, LoaderCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

// eslint-disable-next-line react-refresh/only-export-components
export function useLoad<T>(loader: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const previousKey = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    if (previousKey.current !== key) {
      setLoading(true);
      setData(null);
      previousKey.current = key;
    }
    setError("");
    loader()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Unable to load this page.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // The caller supplies a key covering the identity and route parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision]);
  const reload = useCallback(() => setRevision((n) => n + 1), []);
  return { data, error, loading, reload };
}
export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="p2-heading">
      <div>
        {eyebrow && <span className="p2-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Notice({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`p2-notice ${danger ? "is-error" : ""}`}
      role={danger ? "alert" : "status"}
    >
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="p2-loading" role="status">
      <LoaderCircle size={22} className="p2-spin" /> Loading your workspace…
    </div>
  );
}
export function Pagination({
  page,
  total,
  pageSize = 24,
  change,
}: {
  page: number;
  total: number;
  pageSize?: number;
  change: (page: number) => void;
}) {
  if (total <= pageSize && page === 0) return null;
  return (
    <nav className="p2-actions p2-pagination" aria-label="Results pages">
      <button
        className="p2-button secondary"
        disabled={page === 0}
        onClick={() => change(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))} · {total}{" "}
        results
      </span>
      <button
        className="p2-button secondary"
        disabled={(page + 1) * pageSize >= total}
        onClick={() => change(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="p2-empty">
      <span className="p2-eyebrow">A place to begin</span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </section>
  );
}
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`p2-button ${secondary ? "secondary" : ""}`} to={to}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`p2-badge ${tone}`}>{children}</span>;
}
export function Field({
  label,
  name,
  type = "text",
  required = false,
  value = "",
  placeholder,
  options,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string | number;
  placeholder?: string;
  options?: readonly (string | { value: string; label: string })[];
  min?: number;
  max?: number;
}) {
  return (
    <label className="p2-field">
      <span>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {options ? (
        <select name={name} defaultValue={value} required={required}>
          {options.map((o) => {
            const option =
              typeof o === "string"
                ? { value: o, label: o.replaceAll("_", " ") }
                : o;
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          })}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={value}
          rows={4}
          required={required}
          maxLength={12000}
          placeholder={placeholder}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={value}
          required={required}
          placeholder={placeholder}
          min={min}
          max={max}
          maxLength={4000}
        />
      )}
    </label>
  );
}
export function ActionForm({
  children,
  submit = "Save",
  action,
  onSuccess,
}: {
  children: ReactNode;
  submit?: string;
  action: (data: Record<string, string>) => Promise<unknown>;
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSaved(false);
    const form = event.currentTarget;
    try {
      const formData = new FormData(form);
      const values: Record<string, string> = {};
      for (const key of new Set(formData.keys()))
        values[key] = formData.getAll(key).map(String).join(",");
      await action(values);
      setSaved(true);
      onSuccess?.();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="p2-form" onSubmit={handle}>
      {children}
      {error && <Notice danger>{error}</Notice>}
      <div className="p2-actions">
        <button className="p2-button" disabled={busy} type="submit">
          {busy ? "Saving…" : submit}
        </button>
        {saved && <span role="status">Saved.</span>}
      </div>
    </form>
  );
}
export function ActionButton({
  children,
  action,
  onSuccess,
  secondary = true,
}: {
  children: ReactNode;
  action: () => Promise<unknown>;
  onSuccess?: () => void;
  secondary?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="p2-inline-action">
      <button
        className={`p2-button ${secondary ? "secondary" : ""}`}
        disabled={busy}
        type="button"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await action();
            onSuccess?.();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Unable to complete this action.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : children}
      </button>
      {error && (
        <span className="p2-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
