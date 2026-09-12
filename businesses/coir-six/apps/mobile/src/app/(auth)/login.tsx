import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff, School } from "lucide-react-native";
import { isEmail } from "@coir-six/core";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/state/auth";
import { useTenant } from "@/state/tenant";
import { Button, Field, Inset } from "@/components/ui/primitives";
import { Txt } from "@/components/ui/text";
import { AuthFrame } from "@/components/shell/AuthFrame";

export function PasswordField({ value, onChange, error, label = "Password" }: { value: string; onChange: (v: string) => void; error?: string | null; label?: string }) {
    const { c } = useTheme();
    const [show, setShow] = useState(false);
    return (
        <Field
            label={label}
            value={value}
            onChangeText={onChange}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete="password"
            error={error}
            trailing={
                <Pressable accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"} hitSlop={8} onPress={() => setShow((s) => !s)}>
                    {show ? <EyeOff size={16} color={c.caption} /> : <Eye size={16} color={c.caption} />}
                </Pressable>
            }
        />
    );
}

/** The school this phone is signed up with, and the way to change it. */
export function SchoolLine() {
    const { c } = useTheme();
    const { tenant, name, host, canChoose } = useTenant();
    const router = useRouter();
    if (!canChoose) return null;
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={tenant ? `School: ${name}. Change school` : "Find your school"} onPress={() => router.push("/school")} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.lineStrong, marginBottom: 16 }}>
            <School size={18} color={c.brand} />
            <View style={{ flex: 1, minWidth: 0 }}>
                <Txt weight="medium" size={14} lineHeight={18} numberOfLines={1}>
                    {tenant ? name : "Find your school"}
                </Txt>
                <Txt role="caption" numberOfLines={1}>
                    {tenant ? host : "Accounts live at a school. Pick yours to sign in."}
                </Txt>
            </View>
            <Txt weight="semibold" size={13} lineHeight={16} color={c.brandInk}>
                {tenant ? "Change" : "Choose"}
            </Txt>
        </Pressable>
    );
}

export function DemoButton() {
    const { enterDemo } = useAuth();
    const router = useRouter();
    const { c } = useTheme();
    return (
        <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: c.line, gap: 8 }}>
            <Button
                variant="tonal"
                block
                onPress={() => {
                    enterDemo();
                    router.replace("/");
                }}
            >
                Explore the demo as Jason
            </Button>
            <Txt role="caption" align="center">
                Every screen works. Kept on this phone, nothing to sign up for.
            </Txt>
        </View>
    );
}

export default function LoginScreen() {
    const { signIn, configured } = useAuth();
    const { c } = useTheme();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        if (!isEmail(email)) return setErr("Enter a valid email.");
        setBusy(true);
        const msg = await signIn(email.trim(), pw);
        setBusy(false);
        if (msg) return setErr(msg);
        router.replace("/");
    };
    return (
        <AuthFrame title="Welcome back" sub="Sign in to pick up where you left off.">
            <SchoolLine />
            {configured ? (
                <View style={{ gap: 16 }}>
                    <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
                    <PasswordField value={pw} onChange={setPw} error={err} />
                    <Pressable accessibilityRole="link" onPress={() => router.push("/forgot")} style={{ alignSelf: "flex-end", marginTop: -6 }}>
                        <Txt weight="medium" size={13} lineHeight={16} color={c.brandInk}>
                            Forgot password?
                        </Txt>
                    </Pressable>
                    <Button block loading={busy} onPress={() => void submit()}>
                        Sign in
                    </Button>
                    <Txt role="small" align="center">
                        New here?{" "}
                        <Txt role="small" weight="semibold" color={c.brandInk} onPress={() => router.push("/signup")}>
                            Create an account
                        </Txt>
                    </Txt>
                </View>
            ) : (
                <Inset style={{ backgroundColor: c.peachSoft }}>
                    <Txt role="small" color={c.peach}>
                        Accounts need a school. Pick yours above, or explore the demo — it has everything.
                    </Txt>
                </Inset>
            )}
            <DemoButton />
        </AuthFrame>
    );
}
