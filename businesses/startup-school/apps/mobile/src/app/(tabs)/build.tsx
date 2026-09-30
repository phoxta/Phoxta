import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, CheckSquare, FlaskConical, Lightbulb, Rocket } from "lucide-react-native";
import { openTasks } from "@startup-school/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Card } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { HomeBar, PageTitle, Screen } from "@/components/shell/Screen";

function Destination({ icon, title, body, onPress }: { icon: ReactNode; title: string; body: string; onPress: () => void }) {
    const { c } = useTheme();
    return <Pressable accessibilityRole="button" onPress={onPress} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start", backgroundColor: c.card, borderRadius: 18, padding: 16 }}><View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: c.brandSoft, alignItems: "center", justifyContent: "center" }}>{icon}</View><View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Txt weight="semibold" size={16} lineHeight={21}>{title}</Txt><ArrowRight size={15} color={c.ink} /></View><Txt role="small" style={{ marginTop: 4 }}>{body}</Txt></View></Pressable>;
}

export default function BuildScreen() {
    const { user } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const claims = Object.values(user.venture.sections).flatMap((section) => section?.claims ?? []);
    const tasks = openTasks(user);
    const experiments = user.experiments.filter((item) => item.status === "planned" || item.status === "running").length;
    return (
        <Screen header={<HomeBar />} tabbed>
            <PageTitle title="Build" sub="Turn course work into venture decisions and the next action." />
            <Card style={{ backgroundColor: c.brandSoft, borderColor: c.brand, marginBottom: 16 }}>
                <Txt role="overline" color={c.brandInk}>YOUR VENTURE</Txt>
                <Txt weight="semibold" size={20} lineHeight={26} style={{ marginTop: 8 }}>{user.venture.name || "Name the venture you are building"}</Txt>
                <Txt role="small" style={{ marginTop: 4 }}>{claims.length} saved decision{claims.length === 1 ? "" : "s"}</Txt>
            </Card>
            <View style={{ gap: 12 }}>
                <Destination icon={<Rocket size={20} color={c.brand} />} title="Venture" body="Keep your evidence, assumptions, and decisions together." onPress={() => router.push("/venture")} />
                <Destination icon={<FlaskConical size={20} color={c.brand} />} title="Proof loop" body={experiments ? `${experiments} field test${experiments === 1 ? "" : "s"} in motion.` : "Turn the riskiest assumption into a small field test."} onPress={() => router.push("/experiments")} />
                <Destination icon={<CheckSquare size={20} color={c.brand} />} title="Next actions" body={tasks ? `${tasks} open task${tasks === 1 ? "" : "s"}` : "Plan the next experiment."} onPress={() => router.push("/tasks")} />
                <Destination icon={<Lightbulb size={20} color={c.brand} />} title="Ask the adviser" body="Challenge a decision using your venture record." onPress={() => router.push("/adviser")} />
            </View>
        </Screen>
    );
}
