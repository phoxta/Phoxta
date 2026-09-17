import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, View, useWindowDimensions } from "react-native";
import YoutubePlayer, { type YoutubeIframeRef } from "react-native-youtube-iframe";
import { ExternalLink } from "lucide-react-native";
import { useTheme } from "@/lib/theme";
import { Txt } from "@/components/ui/text";
import { GUTTER } from "@/components/shell/Screen";

/**
 * The lecture player for YouTube-hosted lessons, through YouTube's official
 * embedded player (the terms allow exactly this, not background play or
 * downloads). Same contract as the web player: resume from where you stopped,
 * progress saved every few seconds and on pause, completion on the end event,
 * and a per-second tick while actually playing that feeds study time.
 */
export interface YouTubePlayerProps {
    videoId: string;
    title: string;
    source?: string;
    startAt?: number;
    onProgress: (positionSec: number, durationSec: number) => void;
    onEnded: () => void;
    onPlayingSecond: () => void;
}

export function YouTubePlayer({ videoId, title, source, startAt = 0, onProgress, onEnded, onPlayingSecond }: YouTubePlayerProps) {
    const { c, r } = useTheme();
    const { width } = useWindowDimensions();
    const ref = useRef<YoutubeIframeRef>(null);
    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    const w = width - GUTTER * 2;
    const h = Math.round((w * 9) / 16);

    const report = useCallback(async () => {
        const p = ref.current;
        if (!p) return;
        const [pos, dur] = await Promise.all([p.getCurrentTime(), p.getDuration()]);
        if (dur > 0) onProgress(pos, dur);
    }, [onProgress]);

    // Tick every second while playing (study time); save progress every 5th tick.
    useEffect(() => {
        if (!playing) return;
        let n = 0;
        const t = setInterval(() => {
            onPlayingSecond();
            if (++n % 5 === 0) void report();
        }, 1000);
        return () => clearInterval(t);
    }, [playing, onPlayingSecond, report]);

    return (
        <View style={{ gap: 8 }}>
            <View style={{ width: w, height: h, borderRadius: r.xl, overflow: "hidden", backgroundColor: "#000" }}>
                <YoutubePlayer
                    ref={ref}
                    height={h}
                    width={w}
                    videoId={videoId}
                    play={playing}
                    initialPlayerParams={{ start: Math.floor(startAt), modestbranding: true, rel: false, preventFullScreen: false }}
                    onReady={() => setReady(true)}
                    onChangeState={(state: string) => {
                        if (state === "playing") setPlaying(true);
                        else if (state === "paused") {
                            setPlaying(false);
                            void report();
                        } else if (state === "ended") {
                            setPlaying(false);
                            onEnded();
                        }
                    }}
                    webViewProps={{ allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false }}
                />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Txt role="caption" style={{ flex: 1 }} numberOfLines={1}>
                    {ready ? (source ? `Lecture by ${source}` : title) : "Loading player…"}
                </Txt>
                <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Txt role="caption" weight="medium" color={c.brandInk}>
                        Watch on YouTube
                    </Txt>
                    <ExternalLink size={12} color={c.brandInk} />
                </Pressable>
            </View>
        </View>
    );
}
