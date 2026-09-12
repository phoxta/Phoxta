import { Linking, Pressable, View, useWindowDimensions } from "react-native";
import { youtubeThumb } from "@coir-six/core";
import { Image } from "expo-image";
import { Play } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { Txt } from "@/components/ui/text";
import { GUTTER } from "@/components/shell/Screen";
import type { YouTubePlayerProps } from "./YouTubePlayer";

/**
 * The web build of the app (used for previews and screenshots, not for
 * learners — they use the web app) has no WebView, so the lesson opens on
 * YouTube itself. Progress tracking lives in the native player.
 */
export function YouTubePlayer({ videoId, title }: YouTubePlayerProps) {
    const { c, r } = useTheme();
    const { width } = useWindowDimensions();
    const w = Math.min(width, 480) - GUTTER * 2;
    const h = Math.round((w * 9) / 16);
    return (
        <Pressable accessibilityRole="link" accessibilityLabel={`Play ${title} on YouTube`} onPress={() => void Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)} style={{ width: w, height: h, borderRadius: r.xl, overflow: "hidden", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
            <Image source={{ uri: youtubeThumb(videoId) }} style={{ position: "absolute", width: w, height: h, opacity: 0.7 }} contentFit="cover" />
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
                <Play size={22} color={c.white} fill={c.white} />
            </View>
            <Txt role="caption" color={c.white} style={{ position: "absolute", bottom: 10, left: 12 }}>
                Opens on YouTube
            </Txt>
        </Pressable>
    );
}
