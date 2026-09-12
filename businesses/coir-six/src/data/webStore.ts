import type { KeyValueStore } from "@coir-six/core";

/** localStorage behind the async store shape the shared `LocalRepo` expects (the phone hands it AsyncStorage). */
export const webStore: KeyValueStore = {
    async getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    async setItem(key, value) {
        localStorage.setItem(key, value);
    },
    async removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch {
            /* fine */
        }
    },
};
