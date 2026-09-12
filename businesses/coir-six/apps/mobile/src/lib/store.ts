import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStore } from "@coir-six/core";

/** AsyncStorage already has the shape the shared demo repo expects. */
export const deviceStore: KeyValueStore = {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
};

/** Small typed JSON helpers for the app's own keys (chosen school, demo flag). */
export async function readJson<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
}
export async function writeJson(key: string, value: unknown): Promise<void> {
    try {
        if (value === null || value === undefined) await AsyncStorage.removeItem(key);
        else await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* the session still works without persistence */
    }
}
