import { Share, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Share2 } from "lucide-react-native";
import { courseMinutes, longDate } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { useTenant } from "@/state/tenant";
import { Button, Card, EmptyState, Mark, Sparkle } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { Header, Screen } from "@/components/shell/Screen";

/** A certificate you can show someone — the phone version of finishing. */
export default function CertificateScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { catalogue, user } = useData();
    const { name: school } = useTenant();
    const { c } = useTheme();
    const router = useRouter();
    const cert = user.certificates.find((x) => x.id === id);
    const course = cert && catalogue.courses.find((x) => x.id === cert.courseId);
    if (!cert || !course) {
        return (
            <Screen header={<Header />}>
                <EmptyState title="Certificate not found" action={<Button size="md" variant="outline" onPress={() => router.replace("/progress")}>Your progress</Button>} />
            </Screen>
        );
    }
    const mentor = catalogue.mentors.find((m) => m.id === course.mentorId);
    const share = () => void Share.share({ message: `${user.profile.name} completed "${course.title}" at ${school} — certificate ${cert.code}, issued ${longDate(cert.issuedAt)}.` });
    return (
        <Screen header={<Header title="Certificate" right={<Button variant="outline" size="md" icon={<Share2 size={14} color={c.ink} />} onPress={share} style={{ marginRight: 8 }}>Share</Button>} />}>
            <Card style={{ padding: 24, borderWidth: 1, borderColor: c.line, borderRadius: 24 }}>
                <Sparkle size={220} fill={c.brand} style={{ position: "absolute", right: -40, top: -56, opacity: 0.1 }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Mark size={28} />
                    <Txt weight="semibold" size={18} lineHeight={22}>
                        {school}
                    </Txt>
                </View>
                <Txt weight="semibold" size={12} lineHeight={15} color={c.brand} style={{ marginTop: 36, letterSpacing: 1.7 }}>
                    CERTIFICATE OF COMPLETION
                </Txt>
                <Txt role="small" style={{ marginTop: 22 }}>
                    This certifies that
                </Txt>
                <Txt weight="semibold" size={30} lineHeight={36} style={{ marginTop: 4 }}>
                    {user.profile.name}
                </Txt>
                <Txt role="small" style={{ marginTop: 22 }}>
                    has completed every lesson of
                </Txt>
                <Txt weight="semibold" size={20} lineHeight={27} style={{ marginTop: 4 }}>
                    {course.title}
                </Txt>
                <Txt role="small" style={{ marginTop: 8 }}>
                    {course.level} · {Math.round((courseMinutes(catalogue, course.id) / 60) * 10) / 10} hours · taught by {mentor?.name}
                </Txt>
                <View style={{ marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: c.line, gap: 16 }}>
                    <View style={{ flexDirection: "row", gap: 24 }}>
                        <View>
                            <Txt role="overline">Issued</Txt>
                            <Txt size={13} lineHeight={18} style={{ marginTop: 2 }}>
                                {longDate(cert.issuedAt)}
                            </Txt>
                        </View>
                        <View>
                            <Txt role="overline">Certificate ID</Txt>
                            <Txt size={13} lineHeight={18} style={{ marginTop: 2, fontVariant: ["tabular-nums"] }}>
                                {cert.code}
                            </Txt>
                        </View>
                    </View>
                    <View>
                        <Txt weight="semibold" size={16} lineHeight={20}>
                            {mentor?.name}
                        </Txt>
                        <Txt role="small">{mentor?.role}</Txt>
                    </View>
                </View>
            </Card>
        </Screen>
    );
}
