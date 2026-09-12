import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { isEmail } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/state/auth";
import { Button, Field, Inset } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { AuthFrame } from "@/components/shell/AuthFrame";
import { DemoButton, PasswordField, SchoolLine } from "./login";

const MIN_PASSWORD = 8;

export default function SignupScreen() {
    const { signUp, configured } = useAuth();
    const { c } = useTheme();
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        if (name.trim().length < 2) return setErr("Tell us your name.");
        if (!isEmail(email)) return setErr("Enter a valid email.");
        if (pw.length < MIN_PASSWORD) return setErr(`Use at least ${MIN_PASSWORD} characters.`);
        setBusy(true);
        const msg = await signUp(email.trim(), pw, name.trim());
        setBusy(false);
        if (msg) return setErr(msg);
        router.replace("/onboarding");
    };
    return (
        <AuthFrame title="Create your account" sub="Free. Your progress is saved from the first lesson." back>
            <SchoolLine />
            {configured ? (
                <View style={{ gap: 16 }}>
                    <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
                    <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                    <PasswordField value={pw} onChange={setPw} error={err} />
                    <Button block loading={busy} onPress={() => void submit()}>
                        Create account
                    </Button>
                    <Txt role="small" align="center">
                        Already have one?{" "}
                        <Txt role="small" weight="semibold" color={c.brandInk} onPress={() => router.replace("/login")}>
                            Sign in
                        </Txt>
                    </Txt>
                </View>
            ) : (
                <Inset style={{ backgroundColor: c.peachSoft }}>
                    <Txt role="small" color={c.peach}>
                        Accounts need a school. Pick yours above, or try the demo instead.
                    </Txt>
                </Inset>
            )}
            <DemoButton />
        </AuthFrame>
    );
}
