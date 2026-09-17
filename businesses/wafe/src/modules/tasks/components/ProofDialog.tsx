import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import type { Task } from "../types";
import { useTasks } from "./useTasks";

/**
 * "Show me it's done."
 *
 * A photo chore is not finished when the child says so — it is finished when a
 * parent has seen it (AC 4). This is the child's half: take (or choose) the
 * picture, send it, and the Sprouts wait. In the demo an upload becomes a data
 * URL in the browser; live it goes to the storage bucket.
 */

const SAMPLES = [
    { url: "/images/tasks-proof-shoes.jpg", label: "The shoe rack" },
    { url: "/images/tasks-proof-hoover.jpg", label: "The front room" },
    { url: "/images/tasks-proof-dishwasher.jpg", label: "The dishwasher" },
    { url: "/images/tasks-proof-bella.jpg", label: "Bella's bowl" },
];

export function ProofDialog({ open, onClose, task, onSent }: { open: boolean; onClose: () => void; task: Task; onSent?: () => void }) {
    const { mutate, toast } = useTasks();
    const [picked, setPicked] = useState<string | null>(task.proofUrl);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const onFile = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 4_000_000) {
            setError("That picture is a bit big — try a smaller one.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setPicked(String(reader.result));
        reader.readAsDataURL(file);
    };

    const send = async () => {
        if (!picked) return;
        setBusy(true);
        setError(null);
        try {
            await mutate((r) => r.submitProof(task.id, picked));
            // `onSent` ticks the chore off, which says "photo sent — a parent
            // will check it" itself; saying it twice is two identical toasts.
            if (onSent) onSent();
            else toast("Photo sent — a parent will check it", "success");
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't send that photo.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="Show it's done">
            <p className="text-md leading-6 text-muted">
                {task.title} is worth {task.sprouts} Sprouts. Send a photo and a parent will say yes.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
                {SAMPLES.map((sample) => (
                    <button
                        key={sample.url}
                        type="button"
                        onClick={() => setPicked(sample.url)}
                        aria-pressed={picked === sample.url}
                        className={cn("overflow-hidden rounded-md border-2 text-left", picked === sample.url ? "border-brand" : "border-transparent hover:border-line-strong")}
                    >
                        <img src={sample.url} alt={sample.label} width={400} height={300} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                        <span className="block px-2 py-1.5 text-xs font-medium">{sample.label}</span>
                    </button>
                ))}
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" aria-hidden="true" tabIndex={-1} />
            <Button variant="outline" block className="mt-3" onClick={() => fileRef.current?.click()}>
                <Upload size={15} aria-hidden="true" /> Use a photo from this device
            </Button>

            {picked && !SAMPLES.some((sm) => sm.url === picked) && <img src={picked} alt="What you chose" width={400} height={300} loading="lazy" className="mt-3 aspect-[4/3] w-full rounded-md object-cover" />}

            {error && (
                <p className="mt-3 text-sm text-danger-ink" role="alert">
                    {error}
                </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                    Not yet
                </Button>
                <Button loading={busy} disabled={!picked} onClick={send}>
                    <Camera size={15} aria-hidden="true" /> Send it
                </Button>
            </div>
        </Dialog>
    );
}
