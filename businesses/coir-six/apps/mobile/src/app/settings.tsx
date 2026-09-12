import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { base64Decode, type CategoryId, type Hue } from "@coir-six/core";
import { hueColors, useTheme } from "@/lib/theme";
import { useAuth } from "@/state/auth";
import { useData } from "@/state/data";
import { useTenant } from "@/state/tenant";
import { useToast } from "@/state/toast";
import { Avatar, Button, Card, Chip, Field } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

const HUES: Hue[] = ["lilac", "sky", "peach", "rose", "mint", "plum"];
const GOALS = [60, 120, 180, 300, 420, 600];

export default function SettingsScreen() {
    const { user, mutate, repo } = useData();
    const { demo, signOut, leaveDemo, session } = useAuth();
    const { name: school, host, canChoose, clearSchool } = useTenant();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    const p = user.profile;
    const [name, setName] = useState(p.name);
    const [handle, setHandle] = useState(p.handle);
    const [headline, setHeadline] = useState(p.headline);
    const [hue, setHue] = useState<Hue>(p.hue);
    const [goal, setGoal] = useState(p.weeklyGoalMin);
    const [interests, setInterests] = useState<CategoryId[]>(p.interests);
    const [saving, setSaving] = useState(false);
    const [photoBusy, setPhotoBusy] = useState(false);

    // Re-sync when the SAVED values change — not when only the photo did.
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

    const save = async () => {
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

    // The phone's own square cropper does what the web's PhotoCropper does; the
    // shared uploadPhoto stores the result (a JPEG under 512px is plenty).
    const pickPhoto = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return toast("Allow photo access in Settings to choose a picture", "danger");
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85, base64: true });
        if (res.canceled || !res.assets[0]?.base64) return;
        setPhotoBusy(true);
        try {
            const bytes = base64Decode(res.assets[0].base64);
            await mutate(async (r) => {
                const url = await r.uploadPhoto(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
                await r.updateProfile({ photoUrl: url });
            });
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

    const switchSchool = async () => {
        if (demo) leaveDemo();
        else await signOut();
        await clearSchool();
        router.replace("/school");
    };

    return (
        <Screen header={<Header title="Settings" />}>
            <PageTitle title="Settings" sub="Who you are here, and what you're aiming for." />
            <Card style={{ gap: 16 }}>
                <Txt role="h3" size={16} lineHeight={21}>
                    Profile
                </Txt>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <Avatar name={name || "?"} hue={hue} src={p.photoUrl} px={80} />
                    <View style={{ flex: 1, gap: 8 }}>
                        <Txt role="overline" color={c.muted}>
                            Profile photo
                        </Txt>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            <Button variant="outline" size="md" loading={photoBusy} icon={<Camera size={14} color={c.ink} />} onPress={() => void pickPhoto()}>
                                {p.photoUrl ? "Change photo" : "Upload photo"}
                            </Button>
                            {p.photoUrl && (
                                <Button variant="ghost" size="md" disabled={photoBusy} onPress={() => void removePhoto()}>
                                    Remove
                                </Button>
                            )}
                        </View>
                        <Txt role="caption">You choose the part that shows.</Txt>
                    </View>
                </View>
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>
                        Avatar tint{p.photoUrl ? " · shown when there's no photo" : ""}
                    </Txt>
                    <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
                        {HUES.map((h) => (
                            <Pressable key={h} accessibilityRole="radio" accessibilityLabel={h} accessibilityState={{ checked: hue === h }} onPress={() => setHue(h)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: hueColors(c, h).bg, borderWidth: hue === h ? 2 : 0, borderColor: c.ink }} />
                        ))}
                    </View>
                </View>
                <Field label="Name" value={name} onChangeText={setName} />
                <Field label="Handle" value={handle} onChangeText={setHandle} autoCapitalize="none" leading={<Txt color={c.caption}>@</Txt>} />
                <Field label="Headline" value={headline} onChangeText={setHeadline} placeholder="What you're learning towards" />
            </Card>

            <Card style={{ marginTop: 16, gap: 12 }}>
                <Txt role="h3" size={16} lineHeight={21}>
                    Weekly goal
                </Txt>
                <Txt role="small">The ring on your dashboard fills against this. Pick something you'll actually keep.</Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
                    {GOALS.map((g) => (
                        <Chip key={g} on={goal === g} tone="brand" onPress={() => setGoal(g)}>
                            {`${g < 60 ? `${g} min` : `${g / 60} h`} / wk`}
                        </Chip>
                    ))}
                </View>
            </Card>

            <Card style={{ marginTop: 16, gap: 12 }}>
                <Txt role="h3" size={16} lineHeight={21}>
                    Interests
                </Txt>
                <Txt role="small">Shapes what the dashboard recommends.</Txt>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {(["fe", "ux", "br"] as CategoryId[]).map((k) => {
                        const on = interests.includes(k);
                        return (
                            <Chip key={k} on={on} tone="brand" onPress={() => setInterests((v) => (on ? v.filter((x) => x !== k) : [...v, k]))}>
                                {CATEGORY_LABEL[k]}
                            </Chip>
                        );
                    })}
                </View>
            </Card>

            <Button block loading={saving} onPress={() => void save()} style={{ marginTop: 20 }}>
                Save changes
            </Button>

            <Card style={{ marginTop: 24, gap: 10 }}>
                <Txt role="h3" size={16} lineHeight={21}>
                    Account
                </Txt>
                {demo ? (
                    <>
                        <Txt role="small">You're exploring the demo as Jason. Everything you've done is kept on this phone only.</Txt>
                        <Button
                            size="md"
                            block
                            onPress={() => {
                                leaveDemo();
                                router.replace("/signup");
                            }}
                        >
                            Create a real account
                        </Button>
                        <Button variant="outline" size="md" block onPress={() => void repo.resetDemo?.().then(() => toast("Demo reset"))}>
                            Reset the demo
                        </Button>
                        <Button
                            variant="ghost"
                            size="md"
                            block
                            onPress={() => {
                                leaveDemo();
                                router.replace("/login");
                            }}
                        >
                            Exit demo
                        </Button>
                    </>
                ) : (
                    <>
                        <Txt role="small">
                            Signed in as <Txt role="small" weight="medium" color={c.ink}>{session?.user?.email}</Txt>
                            {host ? ` at ${school}` : ""}
                        </Txt>
                        <Button variant="outline" size="md" block onPress={() => void signOut().then(() => router.replace("/login"))}>
                            Sign out
                        </Button>
                    </>
                )}
                {canChoose && (
                    <Button variant="ghost" size="md" block onPress={() => void switchSchool()}>
                        {host ? `Switch school (${host})` : "Choose a school"}
                    </Button>
                )}
            </Card>
            <Card style={{ marginTop: 16, gap: 6 }}>
                <Txt role="h3" size={16} lineHeight={21}>
                    Your data
                </Txt>
                <Txt role="small">{demo ? "Nothing leaves this device in demo mode." : "Your progress, notes and messages are stored under your account and readable only by you — the same account as the web app."}</Txt>
            </Card>
        </Screen>
    );
}
