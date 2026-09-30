import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/primitives";

export function StaffPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold leading-snug">{title}</h2>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          {description}
        </p>
      )}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm leading-6 ${error ? "bg-danger-soft text-danger-ink" : "bg-brand-soft text-brand-ink"}`}
    >
      {children}
    </p>
  );
}
export function Empty({
  children = "Nothing here yet.",
}: {
  children?: ReactNode;
}) {
  return (
    <p className="rounded-xl border border-dashed border-line p-5 text-sm leading-6 text-muted">
      {children}
    </p>
  );
}
export const inputClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60";
export type FormField = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
  value?: string | number;
  min?: number;
  max?: number;
  help?: string;
};
export function ActionForm({
  fields,
  submitLabel,
  onSubmit,
  children,
  onValuesChange,
}: {
  fields: FormField[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  children?: ReactNode;
  onValuesChange?: (values: Record<string, string>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    ) as Record<string, string>;
    try {
      await onSubmit(values);
      setMessage("Saved successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      onSubmit={(e) => void submit(e)}
      onChange={
        onValuesChange
          ? (e) =>
              onValuesChange(
                Object.fromEntries(
                  new FormData(e.currentTarget).entries(),
                ) as Record<string, string>,
              )
          : undefined
      }
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label
            key={field.name}
            className={`flex min-w-0 flex-col gap-2 text-sm font-medium ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
          >
            {field.label}
            {field.options ? (
              <select
                name={field.name}
                required={!field.optional}
                defaultValue={field.value ?? ""}
                className={inputClass}
              >
                <option value="">Choose…</option>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                name={field.name}
                required={!field.optional}
                defaultValue={field.value}
                rows={4}
                className={`${inputClass} resize-y leading-6`}
              />
            ) : (
              <input
                name={field.name}
                type={field.type ?? "text"}
                required={!field.optional}
                defaultValue={field.value}
                min={field.min}
                max={field.max}
                className={inputClass}
              />
            )}
            {field.help && (
              <span className="text-xs font-normal leading-5 text-muted">
                {field.help}
              </span>
            )}
          </label>
        ))}
      </div>
      {children}
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <Button type="submit" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
export function ActionButton({
  children,
  action,
  destructive = false,
}: {
  children: ReactNode;
  action: () => Promise<unknown>;
  destructive?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      {error && <Notice error>{error}</Notice>}
      <button
        type="button"
        disabled={busy}
        className={`min-h-11 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold disabled:opacity-50 ${destructive ? "text-danger-ink" : "text-brand"}`}
        onClick={() => {
          if (destructive && !window.confirm("Confirm this action?")) return;
          setBusy(true);
          setError("");
          void action()
            .catch((e: unknown) =>
              setError(e instanceof Error ? e.message : "Please try again."),
            )
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Working…" : children}
      </button>
    </div>
  );
}
