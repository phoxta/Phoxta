import { useRouter } from "expo-router";
import { Button, EmptyState } from "@/components/ui/primitives";
import { Header, Screen } from "@/components/shell/Screen";

export default function NotFoundScreen() {
    const router = useRouter();
    return (
        <Screen header={<Header />}>
            <EmptyState title="That page isn't here" body="It may have moved. Your dashboard is one tap away." action={<Button variant="primary" size="md" onPress={() => router.replace("/")}>Back to dashboard</Button>} />
        </Screen>
    );
}
