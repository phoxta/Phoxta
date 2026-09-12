import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isConfigured } from "@/lib/env";

/**
 * One client for the whole app — the same project, tables and auth users as
 * the web app. The session lives in AsyncStorage; tokens refresh while the app
 * is in the foreground and pause when it is not (Supabase's recommended shape
 * for React Native).
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL || "http://localhost", SUPABASE_ANON_KEY || "anon", {
    auth: {
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        storageKey: "coir-six-auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});

if (isConfigured && Platform.OS !== "web") {
    AppState.addEventListener("change", (state) => {
        if (state === "active") void supabase.auth.startAutoRefresh();
        else void supabase.auth.stopAutoRefresh();
    });
}
