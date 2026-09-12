import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { isEmail } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/state/auth";
import { Button, Field, Inset } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { AuthFrame } from "@/components/shell/AuthFrame";

export default function ForgotScreen() {
    const { sendReset } = useAuth();
    const { c } = useTheme();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
    const [msg, setMsg] = useState<string | null>(null);
    const submit = async () => {
        if (!isEmail(email)) return setMsg("Enter a valid email.");
        setState("busy");
        const err = await sendReset(email.trim());
        if (err) {
            setState("error");
            setMsg(err);
        } else setState("sent");
    };
    return (
        <AuthFrame title="Reset your password" sub="We'll email you a link to choose a new one." back>
            {state === "sent" ? (
                <Inset style={{ backgroundColor: c.mintSoft }}>
                    <Txt size={14} lineHeight={20} color={c.mint}>
                        If that address has an account, a reset link is on its way.
                    </Txt>
                </Inset>
            ) : (
                <View style={{ gap: 16 }}>
                    <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={msg} />
                    <Button block loading={state === "busy"} onPress={() => void submit()}>
                        Send reset link
                    </Button>
                </View>
            )}
            <Txt role="small" align="center" style={{ marginTop: 16 }}>
                <Txt role="small" weight="semibold" color={c.brandInk} onPress={() => router.replace("/login")}>
                    Back to sign in
                </Txt>
            </Txt>
        </AuthFrame>
    );
}
