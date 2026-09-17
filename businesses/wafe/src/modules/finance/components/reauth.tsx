import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { useSpace } from "@/state/space";
import { useToast } from "@/state/toast";
import { Dialog } from "@/components/ui/overlay";
import { Button, Field } from "@/components/ui/primitives";
import { NEEDS_REAUTH } from "../local";
import type { FinanceRepo } from "../types";

/**
 * The fifteen-minute rule, as a hook (AC 8).
 *
 * Money is the one place in Wàfè where "you were signed in an hour ago" is not
 * good enough. Every write in the repo throws `NEEDS_REAUTH` once the session
 * has been idle past the family's `reauthMinutes`; `run()` catches exactly
 * that, holds the write, asks the person to prove it is still them, and then
 * replays it — so nobody loses what they had typed for the sake of a lock.
 *
 * A successful write is activity, so the clock only ever runs while nothing is
 * happening. The banner shows the state plainly and offers "Lock now", which is
 * both a real feature (walking away from a laptop) and the way to see the rule
 * work without waiting a quarter of an hour.
 */
export function useMoneyGuard(repo: FinanceRepo | undefined) {
    const { toast } = useToast();
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);
    const pending = useRef<null | (() => Promise<unknown>)>(null);

    const run = useCallback(
        async (fn: () => Promise<unknown>): Promise<boolean> => {
            try {
                await fn();
                return true;
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                if (msg === NEEDS_REAUTH) {
                    pending.current = fn;
                    setAsking(true);
                    return false;
                }
                toast(msg === "Not allowed" ? "That isn't yours to change." : msg, "danger");
                return false;
            }
        },
        [toast],
    );

    const confirm = useCallback(
        async (secret: string) => {
            if (!repo) return;
            setBusy(true);
            try {
                await repo.unlock(secret);
                const fn = pending.current;
                pending.current = null;
                setAsking(false);
                if (fn) await run(fn);
            } catch (e) {
                toast(e instanceof Error ? e.message : "That didn't work.", "danger");
            } finally {
                setBusy(false);
            }
        },
        [repo, run, toast],
    );

    const cancel = useCallback(() => {
        pending.current = null;
        setAsking(false);
    }, []);

    return { run, asking, busy, confirm, cancel };
}

export function ReauthDialog({ open, busy, onConfirm, onClose }: { open: boolean; busy: boolean; onConfirm: (secret: string) => void; onClose: () => void }) {
    const { kind } = useSpace();
    const [secret, setSecret] = useState("");
    useEffect(() => {
        if (open) setSecret("");
    }, [open]);
    return (
        <Dialog open={open} onClose={onClose} title="Is it still you?">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onConfirm(secret);
                }}
            >
                <p className="flex items-start gap-2 text-md leading-6 text-muted">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                    <span>Money changes ask again after fifteen quiet minutes. Confirm it&rsquo;s you and we&rsquo;ll carry on exactly where you were.</span>
                </p>
                <Field
                    label={kind === "demo" ? "Family passcode" : "Your password"}
                    type="password"
                    autoComplete={kind === "demo" ? "off" : "current-password"}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    hint={kind === "demo" ? "In this demo the passcode is 2009 — the year the Adeyemis started." : undefined}
                    className="mt-4"
                />
                <div className="mt-5 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Not now
                    </Button>
                    <Button type="submit" loading={busy} disabled={!secret.trim()}>
                        Confirm and continue
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

/** The small "unlocked for another N minutes" strip, with a real Lock now. */
export function LockStrip({ repo, onLock }: { repo: FinanceRepo | undefined; onLock: () => void }) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = window.setInterval(() => setTick((x) => x + 1), 20_000);
        return () => window.clearInterval(t);
    }, []);
    if (!repo) return null;
    const state = repo.lockState();
    const left = state.unlocked ? Math.max(1, Math.round((state.expiresAt - Date.now()) / 60_000)) : 0;
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-card px-3 py-2 text-xs text-muted">
            <Lock size={13} className="shrink-0" aria-hidden="true" />
            {state.unlocked ? (
                <span>
                    Money changes are unlocked for another <strong className="font-semibold text-ink">{left} min</strong>.
                </span>
            ) : (
                <span>Locked — the next change will ask for the passcode.</span>
            )}
            {state.unlocked && (
                <button
                    type="button"
                    onClick={() => {
                        repo.lock();
                        onLock();
                    }}
                    className="font-semibold text-brand underline-offset-4 hover:underline"
                >
                    Lock now
                </button>
            )}
        </div>
    );
}
