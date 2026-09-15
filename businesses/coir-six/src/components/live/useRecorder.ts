import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveLesson, LiveRoom } from "@coir-six/core";
import { useData } from "@/state/data";
import { useToast } from "@/state/toast";

/**
 * The "Recorder" toggle.
 *
 * What it records is the *host's own* camera, screen and microphone — the
 * lecture, which is what learners come back to rewatch. It deliberately does
 * not composite the whole room: that needs a server-side egress worker running
 * a headless browser, which would want a machine of its own. This runs in the
 * tab that is already capturing those tracks, costs nothing, and produces the
 * file the existing "Watch recording" button already knows how to play.
 *
 * On stop the blob is uploaded and attached to the lesson. If the upload fails
 * the recording is offered as a download instead, because losing an hour of
 * someone's class to a network blip is not acceptable.
 */
export function useRecorder(lesson: LiveLesson | null, room: LiveRoom | null, canHost: boolean) {
    const { repo } = useData();
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);
    const rec = useRef<MediaRecorder | null>(null);
    const chunks = useRef<BlobPart[]>([]);

    const stop = useCallback(async () => {
        const r = rec.current;
        if (!r || r.state === "inactive") return;
        setBusy(true);
        await new Promise<void>((resolve) => {
            r.onstop = () => resolve();
            r.stop();
        });
        r.stream.getTracks().forEach((t) => t.stop());
        rec.current = null;

        const blob = new Blob(chunks.current, { type: r.mimeType });
        chunks.current = [];
        try {
            if (lesson) await repo.saveRecording(lesson.id, blob, r.mimeType);
            toast("Recording saved — it's on the lesson now", "success");
        } catch {
            // Hand it over rather than lose it.
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${lesson?.id ?? "class"}-recording.webm`;
            a.click();
            URL.revokeObjectURL(url);
            toast("We couldn't upload it, so we've downloaded it to your device", "danger");
        } finally {
            setBusy(false);
            await room?.setRecording(false).catch(() => {});
        }
    }, [lesson, repo, room, toast]);

    const start = useCallback(async () => {
        if (!canHost || rec.current) return;
        if (typeof MediaRecorder === "undefined") {
            toast("This browser can't record. Try Chrome or Edge.", "danger");
            return;
        }
        setBusy(true);
        try {
            // Ask for the screen, with the microphone mixed in — one prompt, and
            // the host chooses whether that is the slides or the whole class.
            const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
            const stream = new MediaStream([...display.getVideoTracks(), ...display.getAudioTracks(), ...(mic?.getAudioTracks() ?? [])]);

            const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
            const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            chunks.current = [];
            r.ondataavailable = (e) => {
                if (e.data.size) chunks.current.push(e.data);
            };
            // The host stopping the share from the browser's own bar ends it too.
            display.getVideoTracks()[0]?.addEventListener("ended", () => void stop());
            rec.current = r;
            r.start(4000); // flush every few seconds so a crash costs seconds, not the class
            await room?.setRecording(true);
            toast("Recording — the class can see it", "success");
        } catch {
            toast("Recording didn't start — the screen share was cancelled", "danger");
        } finally {
            setBusy(false);
        }
    }, [canHost, room, stop, toast]);

    // A host who closes the tab mid-recording still gets their file.
    useEffect(() => () => void stop(), [stop]);

    return { busy, start, stop };
}
