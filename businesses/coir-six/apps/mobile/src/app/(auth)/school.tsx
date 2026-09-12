import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { SCHOOL_HOST_SUFFIX } from "@/lib/env";
import { useTheme } from "@/lib/theme";
import { useTenant } from "@/state/tenant";
import { Button, Field, Inset } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { AuthFrame } from "@/components/shell/AuthFrame";

/**
 * One app, every school. The learner types the address their school gave
 * them — the same one they'd open in a browser — and the app scopes itself to
 * that school from then on.
 */
export default function SchoolScreen() {
    const { chooseSchool, clearSchool, tenant, name, host } = useTenant();
    const { c } = useTheme();
    const router = useRouter();
    const [input, setInput] = useState(host?.replace(SCHOOL_HOST_SUFFIX, "") ?? "");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        setBusy(true);
        setErr(null);
        const msg = await chooseSchool(input);
        setBusy(false);
        if (msg) return setErr(msg);
        router.back();
    };
    return (
        <AuthFrame title="Find your school" sub="Type the address your school gave you. It's the same one you'd open in a browser." back>
            <View style={{ gap: 16 }}>
                <Field
                    label="School address"
                    value={input}
                    onChangeText={setInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    placeholder="yourschool"
                    error={err}
                    hint={input && !input.includes(".") ? `${input.trim().toLowerCase()}${SCHOOL_HOST_SUFFIX}` : `e.g. yourschool${SCHOOL_HOST_SUFFIX}`}
                />
                <Button block loading={busy} disabled={!input.trim()} onPress={() => void submit()}>
                    Use this school
                </Button>
                {tenant && (
                    <Inset style={{ gap: 10 }}>
                        <Txt role="small">
                            Currently: <Txt role="small" weight="semibold" color={c.ink}>{name}</Txt> ({host})
                        </Txt>
                        <Button variant="ghost" size="md" onPress={() => void clearSchool().then(() => router.back())}>
                            Forget this school
                        </Button>
                    </Inset>
                )}
            </View>
        </AuthFrame>
    );
}
