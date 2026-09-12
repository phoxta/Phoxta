import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { CategoryId } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Button, Chip } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { CATEGORY_LABEL } from "@/components/ui/icons";
import { AuthFrame } from "@/components/shell/AuthFrame";

/** First run for a real account: interests and a goal — nothing else stands between them and a lesson. */
export default function OnboardingScreen() {
    const { user, mutate } = useData();
    const { toast } = useToast();
    const { c } = useTheme();
    const router = useRouter();
    const [interests, setInterests] = useState<CategoryId[]>(user.profile.interests);
    const [goal, setGoal] = useState(user.profile.weeklyGoalMin || 180);
    const [busy, setBusy] = useState(false);
    const finish = async () => {
        setBusy(true);
        try {
            await mutate((r) => r.updateProfile({ interests, weeklyGoalMin: goal, onboarded: true }));
            router.replace("/");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't save", "danger");
            setBusy(false);
        }
    };
    return (
        <AuthFrame title={`Hi ${user.profile.name.split(" ")[0]} — what are you here for?`} sub="Two questions. Both can change later in Settings.">
            <View style={{ gap: 24 }}>
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>
                        I want to get better at
                    </Txt>
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
                </View>
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>
                        Each week I can give it
                    </Txt>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {[60, 120, 180, 300, 420].map((g) => (
                            <Chip key={g} on={goal === g} tone="brand" onPress={() => setGoal(g)}>
                                {`${g / 60} h`}
                            </Chip>
                        ))}
                    </View>
                </View>
                <Button block loading={busy} onPress={() => void finish()}>
                    Take me to my dashboard
                </Button>
            </View>
        </AuthFrame>
    );
}
