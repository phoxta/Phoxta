import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { AGE_BAND, ROLE_LABEL, type AgeBand, type Member, type Role } from "@/data/core";
import { cn } from "@/lib/cn";
import { hueFor, type Hue } from "@/lib/format";
import { Dialog } from "@/components/ui/overlay";
import { Avatar, Button, Field } from "@/components/ui/primitives";
import { GUEST_TAG, type GuestTag } from "../types";

/**
 * Adding or editing a person.
 *
 * `scope` is the whole permission model of this screen: a parent edits
 * everything; a child may change their picture and their colour and nothing
 * else (the brief: "own profile card: avatar and colour only"); an adult
 * guest may also fix their own name and birthday.
 */

export type MemberInput = {
    name: string;
    relation: string;
    role: Role;
    ageBand: AgeBand;
    birthday: string;
    email: string;
    avatarUrl: string;
    hue: Hue;
    guestTag: GuestTag;
};

const HUES: Hue[] = ["lilac", "sky", "peach", "rose", "mint", "plum"];
const BANDS: AgeBand[] = ["little", "junior", "teen", "young-adult", "adult"];
const ROLES: Role[] = ["parent", "child", "guest"];

const blank = (): MemberInput => ({ name: "", relation: "", role: "child", ageBand: "junior", birthday: "", email: "", avatarUrl: "", hue: "mint", guestTag: "relative" });

export function MemberDialog({
    open,
    onClose,
    member,
    guestTag,
    scope,
    lastParent,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    member?: Member;
    guestTag?: GuestTag;
    scope: "parent" | "self-child" | "self-adult";
    /** True when this member is the only parent left: their role is frozen. */
    lastParent?: boolean;
    onSave: (input: MemberInput) => Promise<void>;
}) {
    const [form, setForm] = useState<MemberInput>(blank);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setError(null);
        setForm(
            member
                ? {
                      name: member.name,
                      relation: member.relation,
                      role: member.role,
                      ageBand: member.ageBand,
                      birthday: member.birthday ?? "",
                      email: member.email ?? "",
                      avatarUrl: member.avatarUrl ?? "",
                      hue: member.hue,
                      guestTag: guestTag ?? "relative",
                  }
                : blank(),
        );
    }, [open, member, guestTag]);

    const set = <K extends keyof MemberInput>(k: K, v: MemberInput[K]) => setForm((f) => ({ ...f, [k]: v }));

    const pickPhoto = (file: File | undefined) => {
        if (!file) return;
        if (file.size > 3_000_000) {
            setError("That picture is over 3 MB. A smaller one loads faster on a phone.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => set("avatarUrl", String(reader.result ?? ""));
        reader.readAsDataURL(file);
    };

    const full = scope === "parent";
    const nameEditable = scope !== "self-child";

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError("A person needs a name");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSave({ ...form, name: form.name.trim(), relation: form.relation.trim(), hue: form.hue ?? hueFor(form.name) });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't save that");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={member ? `Edit ${member.name.split(" ")[0]}` : "Add someone"} wide>
            <form onSubmit={submit} className="grid gap-4">
                <div className="flex items-center gap-4">
                    <Avatar name={form.name || "New"} hue={form.hue} src={form.avatarUrl || undefined} size="xl" />
                    <div>
                        <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} aria-label="Choose a picture" />
                        <Button type="button" variant="outline" size="md" onClick={() => fileRef.current?.click()}>
                            <Camera size={15} aria-hidden="true" /> {form.avatarUrl ? "Change picture" : "Add a picture"}
                        </Button>
                        {form.avatarUrl && (
                            <button type="button" onClick={() => set("avatarUrl", "")} className="ml-3 text-sm font-medium text-muted underline underline-offset-4 hover:text-danger-ink">
                                Remove
                            </button>
                        )}
                        <div className="mt-3">
                            <span className="mb-1.5 block text-xs font-medium text-muted">Colour</span>
                            <div className="flex gap-2" role="radiogroup" aria-label="Colour">
                                {HUES.map((h) => (
                                    <button
                                        key={h}
                                        type="button"
                                        role="radio"
                                        aria-checked={form.hue === h}
                                        aria-label={h}
                                        onClick={() => set("hue", h)}
                                        className={cn("size-7 rounded-full border-2 transition-transform", form.hue === h ? "border-ink scale-110" : "border-transparent")}
                                        style={{ background: `var(--color-${h})` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={!nameEditable} hint={nameEditable ? undefined : "A parent looks after your name."} required />
                    <Field label="Relation" value={form.relation} onChange={(e) => set("relation", e.target.value)} placeholder="Mum, Dad, Son, Grandma…" disabled={!full} />
                </div>

                {full && (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Role</span>
                            <select
                                value={form.role}
                                onChange={(e) => {
                                    const role = e.target.value as Role;
                                    setForm((f) => ({ ...f, role, ageBand: role === "child" ? (f.ageBand === "adult" ? "junior" : f.ageBand) : "adult" }));
                                }}
                                disabled={lastParent}
                                className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand disabled:opacity-50"
                            >
                                {ROLES.map((r) => (
                                    <option key={r} value={r}>
                                        {ROLE_LABEL[r]}
                                    </option>
                                ))}
                            </select>
                            <span className="text-xs text-caption">{lastParent ? "The last parent cannot change role — a family needs someone who can manage it." : form.role === "guest" ? "A guest sees nothing until you share a named trip, board or album." : form.role === "child" ? "Child mode, and only what their band allows." : "Everything, including money and settings."}</span>
                        </label>
                        {form.role === "child" ? (
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Age band</span>
                                <select value={form.ageBand} onChange={(e) => set("ageBand", e.target.value as AgeBand)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                    {BANDS.filter((b) => b !== "adult").map((b) => (
                                        <option key={b} value={b}>
                                            {AGE_BAND[b].label} · {AGE_BAND[b].years}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs text-caption">{AGE_BAND[form.ageBand].note}</span>
                            </label>
                        ) : form.role === "guest" ? (
                            <label className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">Kind of guest</span>
                                <select value={form.guestTag} onChange={(e) => set("guestTag", e.target.value as GuestTag)} className="h-[46px] rounded-md border border-line-strong bg-card px-3 text-md outline-none focus:border-brand">
                                    {(Object.keys(GUEST_TAG) as GuestTag[]).map((t) => (
                                        <option key={t} value={t}>
                                            {GUEST_TAG[t].label}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs text-caption">{GUEST_TAG[form.guestTag].note}</span>
                            </label>
                        ) : (
                            <div />
                        )}
                    </div>
                )}

                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                    <Field label="Birthday" type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} disabled={scope === "self-child"} hint={scope === "self-child" ? "Ask a parent to change this." : "Drives the birthday nudge and the age-band prompt."} />
                    <Field label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={!full} hint={full ? "Only needed if they sign in." : undefined} />
                </div>

                {error && <p className="text-sm text-danger-ink">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="brand" loading={busy}>
                        {member ? "Save" : "Add to the family"}
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
