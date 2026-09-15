import type { ComponentType } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * One participant's video, on a phone.
 *
 * React Native has no `<video>`, so the room hands out the track object
 * (`LiveRoom.trackOf`) and `@livekit/react-native` renders it.
 *
 * The import is a guarded `require`, not a static import, for one reason:
 * `@livekit/react-native-webrtc` is a native module, so it does not exist in
 * Expo Go. A static import would crash the whole app on launch there — every
 * screen, not just this one. Guarded, a developer running in Expo Go gets the
 * app with avatars where video would be, and a dev build gets the video.
 */

type TrackViewProps = { trackRef?: unknown; objectFit?: "cover" | "contain"; mirror?: boolean; style?: StyleProp<ViewStyle> };

let Native: ComponentType<TrackViewProps> | null | undefined;

function resolve(): ComponentType<TrackViewProps> | null {
    if (Native !== undefined) return Native;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("@livekit/react-native") as { VideoTrack?: ComponentType<TrackViewProps> };
        Native = mod.VideoTrack ?? null;
    } catch {
        Native = null;
    }
    return Native;
}

export function VideoTrack({ track, mirror, style }: { track: unknown; mirror?: boolean; style?: StyleProp<ViewStyle> }) {
    const Impl = resolve();
    if (!Impl || !track) return <View style={style} />;
    // `track` is the TrackReference that `LiveRoom.trackOf` hands out.
    return <Impl trackRef={track} objectFit="cover" mirror={mirror} style={style} />;
}

/**
 * Call once before connecting to a room. `registerGlobals` installs the WebRTC
 * shims (`RTCPeerConnection`, `MediaStream`, …) that `livekit-client` expects to
 * find on `globalThis` — without it the SDK loads and then fails at connect
 * with something unhelpful about an undefined constructor.
 */
export function registerWebrtcGlobals(): boolean {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("@livekit/react-native") as { registerGlobals?: () => void };
        mod.registerGlobals?.();
        return true;
    } catch {
        return false;
    }
}
