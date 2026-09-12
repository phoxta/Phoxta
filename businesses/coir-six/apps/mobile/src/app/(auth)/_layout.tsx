import { Stack } from "expo-router";

/** Sign in, create account, forgot password and the school picker — headerless, our own chrome. */
export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />;
}
