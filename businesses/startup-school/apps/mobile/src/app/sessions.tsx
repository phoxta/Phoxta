import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarClock } from "lucide-react-native";
import { shortDate, time } from "@startup-school/core";
import { useTheme } from "@/lib/theme";
import { useData } from "@/state/data";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { Header, PageTitle, Screen } from "@/components/shell/Screen";

export default function SessionsScreen() {
    const { catalogue, user } = useData();
    const { c } = useTheme();
    const router = useRouter();
    const upcoming = user.bookings.filter((booking) => booking.status === "confirmed" && new Date(booking.startsAt).getTime() >= Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return (
        <Screen header={<Header title="Your 1:1s" />}>
            <PageTitle title="Your 1:1s" sub="Prepare a focused agenda and make every mentor conversation build on the last." />
            {upcoming.length ? <View style={{ gap: 12 }}>{upcoming.map((booking) => { const mentor = catalogue.mentors.find((item) => item.id === booking.mentorId); return <Card key={booking.id} style={{ gap: 6 }}><Txt weight="semibold" size={16} lineHeight={21}>{mentor?.name ?? "Mentor"}</Txt><Txt role="small">{shortDate(booking.startsAt)} · {time(booking.startsAt)}</Txt><Txt role="small">{booking.agenda || "No agenda set yet"}</Txt><Pressable accessibilityRole="button" onPress={() => router.push(`/mentors/${booking.mentorId}`)}><Txt weight="semibold" size={13} lineHeight={17} color={c.brand}>Open mentor</Txt></Pressable></Card>; })}</View> : <EmptyState icon={<CalendarClock size={22} color={c.brand} />} title="No 1:1s booked" body="Choose a mentor and take a focused slot." action={<Pressable accessibilityRole="button" onPress={() => router.push("/mentors")}><Txt weight="semibold" size={14} lineHeight={18} color={c.brand}>Browse mentors</Txt></Pressable>} />}
        </Screen>
    );
}
