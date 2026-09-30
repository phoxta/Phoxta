import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import type { CategoryId, VenturePath, VentureStage } from "@startup-school/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";
import { Button, Chip, Field } from "@/components/ui/primitives";
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
    const [stage, setStage] = useState<VentureStage>(user.venture.stage || "opportunity");
    const [path, setPath] = useState<VenturePath>(user.venture.path || "build");
    const [idea, setIdea] = useState(user.venture.oneLiner);
    const [busy, setBusy] = useState(false);
    const finish = async () => {
        setBusy(true);
        try {
            await mutate(async (repo) => {
                await repo.saveVenture({ stage, oneLiner: idea.trim(), path });
                await repo.updateProfile({ interests, weeklyGoalMin: goal, onboarded: true });
            });
            router.replace("/");
        } catch (e) {
            toast(e instanceof Error ? e.message : "Couldn't save", "danger");
            setBusy(false);
        }
    };
    return (
        <AuthFrame title={`Hi ${user.profile.name.split(" ")[0]} — where are you starting?`} sub="Four short choices. You can change all of them later.">
            <View style={{ gap: 24 }}>
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>
                        I want to get better at
                    </Txt>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {(["start", "fund", "grow"] as CategoryId[]).map((k) => {
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
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>My startup is currently at</Txt>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {([{ id: "opportunity", label: "An idea to validate" }, { id: "model", label: "A model to test" }, { id: "launch", label: "Preparing to launch" }, { id: "growth", label: "Ready to grow" }] as { id: VentureStage; label: string }[]).map((option) => <Chip key={option.id} on={stage === option.id} tone="brand" onPress={() => setStage(option.id)}>{option.label}</Chip>)}
                    </View>
                </View>
                <View style={{ gap: 8 }}>
                    <Txt role="overline" color={c.muted}>I am starting by</Txt>
                    <View style={{ gap: 8 }}>
                        {([
                            { id: "build", label: "Building a new venture" },
                            { id: "phoxta_turnkey", label: "Launching a Phoxta AI business" },
                            { id: "hybrid", label: "Adapting a Phoxta AI business" },
                        ] as { id: VenturePath; label: string }[]).map((option) => <Chip key={option.id} on={path === option.id} tone="brand" onPress={() => setPath(option.id)}>{option.label}</Chip>)}
                    </View>
                    <Txt role="caption">A turnkey system gives you a starting point; your proof loop validates the local customer, offer and operation.</Txt>
                </View>
                <Field label="What are you building?" value={idea} onChangeText={setIdea} placeholder="One sentence is enough for now" />
                <Button block loading={busy} onPress={() => void finish()}>
                    Build my path
                </Button>
            </View>
        </AuthFrame>
    );
}
