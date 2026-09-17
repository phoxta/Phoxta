import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";

/**
 * The parent PIN.
 *
 * It guards two doors: leaving child mode, and deleting the family. Both are
 * the same shape — prove you are a parent standing at this device — so both
 * use this one dialog. Three wrong tries and it says so plainly rather than
 * locking a nine-year-old out of their own homework.
 */
export function PinDialog({
    open,
    onClose,
    title,
    body,
    confirmLabel = "Unlock",
    hint,
    verify,
    onVerified,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    body?: string;
    confirmLabel?: string;
    hint?: string;
    verify: (pin: string) => Promise<boolean>;
    onVerified: () => Promise<void> | void;
}) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [tries, setTries] = useState(0);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open) {
            setPin("");
            setError(null);
            setTries(0);
        }
    }, [open]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (await verify(pin)) {
                await onVerified();
                onClose();
            } else {
                setTries((t) => t + 1);
                setError(tries >= 2 ? "Still not right. Ask a parent to type it." : "That PIN isn't right.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't check that.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={title}>
            <form onSubmit={submit}>
                {body && <p className="mb-4 text-md leading-6 text-muted">{body}</p>}
                <Field
                    label="Parent PIN"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="••••"
                    error={error}
                    hint={hint}
                />
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={busy} disabled={pin.length < 4}>
                        {confirmLabel}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
