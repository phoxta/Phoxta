import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { useTheme } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/state/auth";
import { DataProvider, useData } from "@/state/data";
import { TenantProvider } from "@/state/tenant";
import { ToastProvider } from "@/state/toast";

/**
 * The app. Providers in the same order as the web app (tenant → auth → data),
 * then one Stack whose groups are guarded: signed out → the auth screens,
 * signed in without onboarding → onboarding, otherwise the tabs and every
 * screen they push. The native splash stays up until fonts, auth and the first
 * data load are in, so the first frame is a real dashboard, never a flash of
 * defaults.
 */

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [fontsLoaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
    return (
        <SafeAreaProvider>
            <TenantProvider>
                <AuthProvider>
                    <DataProvider>
                        <ToastProvider>
                            <Gate fontsLoaded={fontsLoaded} />
                        </ToastProvider>
                    </DataProvider>
                </AuthProvider>
            </TenantProvider>
        </SafeAreaProvider>
    );
}

function Gate({ fontsLoaded }: { fontsLoaded: boolean }) {
    const { c } = useTheme();
    const { ready, session, demo } = useAuth();
    const { loading, user } = useData();
    const signedIn = Boolean(session) || demo;
    const booted = fontsLoaded && ready && (!signedIn || !loading);
    const needsOnboarding = Boolean(session) && !user.profile.onboarded;

    useEffect(() => {
        if (booted) void SplashScreen.hideAsync();
    }, [booted]);

    if (!booted) return <View style={{ flex: 1, backgroundColor: c.brand }} />;

    return (
        <>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.page }, animation: "slide_from_right" }}>
                <Stack.Protected guard={signedIn && !needsOnboarding}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="courses/index" />
                    <Stack.Screen name="courses/[slug]" />
                    <Stack.Screen name="learn/[slug]/[lessonId]" />
                    <Stack.Screen name="groups/[id]" />
                    <Stack.Screen name="inbox/[id]" />
                    <Stack.Screen name="mentors/index" />
                    <Stack.Screen name="mentors/[id]" />
                    <Stack.Screen name="progress" />
                    <Stack.Screen name="notifications" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="certificates/[id]" />
                </Stack.Protected>
                <Stack.Protected guard={needsOnboarding}>
                    <Stack.Screen name="onboarding" />
                </Stack.Protected>
                <Stack.Protected guard={!signedIn}>
                    <Stack.Screen name="(auth)" />
                </Stack.Protected>
                <Stack.Screen name="+not-found" />
            </Stack>
        </>
    );
}
