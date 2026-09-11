import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import type { CategoryId } from "@/data/types";
import { cn } from "@/lib/cn";
import { type Hue } from "@/lib/format";
import { useAuth } from "@/state/auth";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { PageTitle } from "@/components/shell/AppShell";
import { PhotoCropper } from "@/components/ui/PhotoCropper";
import { Avatar, Button, Card, Field } from "@/components/ui/primitives";
import { CATEGORY_LABEL } from "@/components/ui/icons";

const HUES: Hue[] = ["lilac", "sky", "peach", "rose", "mint", "plum"];
const GOALS = [60, 120, 180, 300, 420, 600];
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export default function SettingsPage() {
    const { user, mutate, repo } = useData();
    const { demo, signOut, leaveDemo, session } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const p = user.profile;
    const [name, setName] = useState(p.name);
    const [handle, setHandle] = useState(p.handle);
    const [headline, setHeadline] = useState(p.headline);
    const [hue, setHue] = useState<Hue>(p.hue);
    const [goal, setGoal] = useState(p.weeklyGoalMin);
    const [interests, setInterests] = useState<CategoryId[]>(p.interests);
    const [saving, setSaving] = useState(false);
    const [pending, setPending] = useState<File | null>(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Re-sync the form when the SAVED values change (another tab, a save here) —
    // but not when only the photo changed, so an unsaved edit isn't thrown away.
    const synced = useRef("");
    useEffect(() => {
        const sig = JSON.stringify([p.name, p.handle, p.headline, p.hue, p.weeklyGoalMin, p.interests]);
        if (sig === synced.current) return;
        synced.current = sig;
        setName(p.name);
        setHandle(p.handle);
        setHeadline(p.headline);
        setHue(p.hue);
        setGoal(p.weeklyGoalMin);
        setInterests(p.interests);
    }, [p]);

    useEffect(() => {
        if (location.hash === "#goal") document.getElementById("goal")?.scrollIntoView({ block: "center" });
    }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast("Your name can't be empty", "danger");
        setSaving(true);
        try {
            await mutate((r) => r.updateProfile({ name: name.trim(), handle: handle.trim().toLowerCase().replace(/[^a-z0-9]/g, ""), headline: headline.trim(), hue, weeklyGoalMin: goal, interests }));
            toast("Saved", "success");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't save", "danger");
        }
        setSaving(false);
    };

    // ---- Profile photo: pick → crop → store, saved on its own, not with the form.
    const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = ""; // so picking the same file again still fires
        if (!f) return;
        if (!f.type.startsWith("image/")) return toast("Choose an image file", "danger");
        if (f.size > MAX_PHOTO_BYTES) return toast("That photo is over 12 MB — try a smaller one", "danger");
        setPending(f);
    };
    const savePhoto = async (blob: Blob) => {
        setPhotoBusy(true);
        try {
            await mutate(async (r) => {
                const url = await r.uploadPhoto(blob);
                await r.updateProfile({ photoUrl: url });
            });
            setPending(null);
            toast("Photo updated", "success");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't save the photo", "danger");
        }
        setPhotoBusy(false);
    };
    const removePhoto = async () => {
        setPhotoBusy(true);
        try {
            await mutate((r) => r.updateProfile({ photoUrl: "" }));
            toast("Photo removed");
        } catch (err) {
            toast(err instanceof Error ? err.message : "Couldn't remove the photo", "danger");
        }
        setPhotoBusy(false);
    };
    const photoError = useCallback(
        (message: string) => {
            toast(message, "danger");
            setPending(null);
        },
        [toast],
    );

    return (
        <>
            <PageTitle title="Settings" sub="Who you are here, and what you're aiming for." />
            <form onSubmit={(e) => void save(e)} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex flex-col gap-6">
                    <Card as="section" aria-labelledby="prof-h">
                        <h2 id="prof-h" className="mb-4 text-[16px] font-semibold">Profile</h2>
                        <div className="mb-5 flex items-center gap-4">
                            <Avatar name={name || "?"} hue={hue} src={p.photoUrl} size="xl" className="!size-20 !text-[26px]" />
                            <div className="min-w-0">
                                <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Profile photo</div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button variant="outline" size="md" onClick={() => fileRef.current?.click()} loading={photoBusy}>
                                        <Camera size={14} /> {p.photoUrl ? "Change photo" : "Upload photo"}
                                    </Button>
                                    {p.photoUrl && (
                                        <Button variant="ghost" size="md" onClick={() => void removePhoto()} disabled={photoBusy}>
                                            Remove
                                        </Button>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/*" onChange={pick} className="sr-only" aria-label="Choose a photo" tabIndex={-1} />
                                </div>
                                <p className="mt-1.5 text-[12px] text-caption">JPG, PNG or WebP. You choose the part that shows.</p>
                            </div>
                        </div>
                        <div className="mb-5">
                            <div className="mb-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">Avatar tint {p.photoUrl && <span className="normal-case tracking-normal text-caption">· shown when there's no photo</span>}</div>
                            <div className="flex gap-2" role="radiogroup" aria-label="Avatar tint">
                                {HUES.map((h) => (
                                    <button key={h} type="button" role="radio" aria-checked={hue === h} aria-label={h} onClick={() => setHue(h)} className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", hue === h && "ring-2 ring-ink")}>
                                        <Avatar name="" hue={h} size="xs" className="!size-7" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
                            <Field label="Handle" value={handle} onChange={(e) => setHandle(e.target.value)} leading={<span className="text-caption">@</span>} />
                            <Field label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="What you're learning towards" className="md:col-span-2" />
                        </div>
                    </Card>

                    <Card as="section" id="goal" aria-labelledby="goal-h">
                        <h2 id="goal-h" className="mb-1 text-[16px] font-semibold">Weekly goal</h2>
                        <p className="mb-4 text-[13px] text-muted">The ring on your dashboard fills against this. Pick something you'll actually keep.</p>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Weekly goal">
                            {GOALS.map((g) => (
                                <button key={g} type="button" role="radio" aria-checked={goal === g} onClick={() => setGoal(g)} className={cn("h-10 rounded-full border px-4 text-[13px] font-semibold", goal === g ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                                    {g < 60 ? `${g} min` : `${g / 60} h`}
                                    <span className="ml-1 font-normal text-caption">/ wk</span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card as="section" aria-labelledby="int-h">
                        <h2 id="int-h" className="mb-1 text-[16px] font-semibold">Interests</h2>
                        <p className="mb-4 text-[13px] text-muted">Shapes what the dashboard recommends.</p>
                        <div className="flex flex-wrap gap-2">
                            {(["fe", "ux", "br"] as CategoryId[]).map((c) => {
                                const on = interests.includes(c);
                                return (
                                    <button key={c} type="button" aria-pressed={on} onClick={() => setInterests((v) => (on ? v.filter((x) => x !== c) : [...v, c]))} className={cn("h-10 rounded-full border px-4 text-[13px] font-semibold", on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong text-muted hover:text-ink")}>
                                        {CATEGORY_LABEL[c]}
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    <div>
                        <Button type="submit" loading={saving}>Save changes</Button>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <Card as="section" aria-labelledby="acct-h">
                        <h2 id="acct-h" className="mb-2 text-[16px] font-semibold">Account</h2>
                        {demo ? (
                            <>
                                <p className="text-[13px] leading-5 text-muted">You're exploring the demo as Jason. Everything you've done is kept in this browser only.</p>
                                <div className="mt-3 flex flex-col gap-2">
                                    <Button variant="brand" size="md" block onClick={() => navigate("/signup")}>Create a real account</Button>
                                    <Button variant="outline" size="md" block onClick={() => void repo.resetDemo?.().then(() => toast("Demo reset"))}>Reset the demo</Button>
                                    <Button variant="ghost" size="md" block onClick={() => { leaveDemo(); navigate("/login"); }}>Exit demo</Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[13px] text-muted">Signed in as <span className="font-medium text-ink">{session?.user?.email}</span></p>
                                <Button variant="outline" size="md" block className="mt-3" onClick={() => void signOut().then(() => navigate("/login"))}>Sign out</Button>
                            </>
                        )}
                    </Card>
                    <Card as="section" aria-labelledby="priv-h">
                        <h2 id="priv-h" className="mb-2 text-[16px] font-semibold">Your data</h2>
                        <p className="text-[13px] leading-5 text-muted">{demo ? "Nothing leaves this device in demo mode." : "Your progress, notes and messages are stored under your account and readable only by you."}</p>
                    </Card>
                </div>
            </form>

            <PhotoCropper file={pending} onCancel={() => setPending(null)} onDone={savePhoto} onError={photoError} />
        </>
    );
}
