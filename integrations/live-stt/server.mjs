import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

/**
 * The classroom's transcription relay.
 *
 * Browser ⇄ here ⇄ Deepgram. The relay exists because Phoxta's Deepgram key is
 * scoped to `usage:write` only: it cannot mint child keys and cannot use
 * /v1/auth/grant, so the only key we have is one that can spend money and it
 * must never reach a browser. See README.md.
 */

const PORT = Number(process.env.PORT || 8791);
const DG_KEY = process.env.DEEPGRAM_API_KEY || "";
const SECRET = process.env.LIVE_STT_SECRET || "";
/** A class is long, but not unbounded — a forgotten tab must not bill all night. */
const MAX_SESSION_MS = 3 * 60 * 60 * 1000;
/** Deepgram closes a silent socket; the browser sends audio, we send this. */
const KEEPALIVE_MS = 8000;

if (!DG_KEY || !SECRET) {
    console.error("[live-stt] refusing to start without DEEPGRAM_API_KEY and LIVE_STT_SECRET");
    process.exit(1);
}

/** `base64url(HMAC(secret, "<lessonId>|<exp>"))` — the same string the edge function signs. */
function ticketValid(lessonId, exp, sig) {
    if (!lessonId || !exp || !sig) return false;
    const expMs = Number(exp);
    if (!Number.isFinite(expMs) || Date.now() > expMs) return false;
    const want = createHmac("sha256", SECRET).update(`${lessonId}|${exp}`).digest("base64url");
    const a = Buffer.from(want);
    const b = Buffer.from(String(sig));
    // Constant-time: a length check first, because timingSafeEqual throws on a mismatch.
    return a.length === b.length && timingSafeEqual(a, b);
}

const server = createServer((req, res) => {
    // Caddy forwards the full path, so this answers /health and /stt/health alike.
    if (req.url && req.url.split("?")[0].endsWith("/health")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, service: "live-stt" }));
        return;
    }
    res.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
    let url;
    try {
        url = new URL(req.url ?? "", "http://localhost");
    } catch {
        socket.destroy();
        return;
    }
    if (!url.pathname.startsWith("/stt")) {
        socket.destroy();
        return;
    }
    const lessonId = url.searchParams.get("lesson");
    const exp = url.searchParams.get("exp");
    const sig = url.searchParams.get("sig");
    if (!ticketValid(lessonId, exp, sig)) {
        // 401 before the upgrade, so a bad ticket never becomes a socket.
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req, { lessonId }));
});

wss.on("connection", (client, _req, ctx) => {
    const started = Date.now();
    const tag = `[live-stt ${ctx.lessonId}]`;
    console.log(`${tag} open`);

    // Deepgram's own parameters, chosen to match what the browser sends:
    // MediaRecorder gives webm/opus, which Deepgram sniffs — so no encoding hints.
    const params = new URLSearchParams({
        model: "nova-2",
        language: "en",
        smart_format: "true",
        interim_results: "true",
        punctuate: "true",
    });
    const dg = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, {
        headers: { Authorization: `Token ${DG_KEY}` },
    });

    const pending = [];
    let closed = false;

    const shutdown = (why) => {
        if (closed) return;
        closed = true;
        clearInterval(keepalive);
        clearTimeout(cap);
        try {
            if (dg.readyState === WebSocket.OPEN) dg.send(JSON.stringify({ type: "CloseStream" }));
            dg.close();
        } catch { /* already gone */ }
        try {
            client.close();
        } catch { /* already gone */ }
        console.log(`${tag} closed after ${Math.round((Date.now() - started) / 1000)}s (${why})`);
    };

    const cap = setTimeout(() => shutdown("session cap"), MAX_SESSION_MS);
    const keepalive = setInterval(() => {
        if (dg.readyState === WebSocket.OPEN) dg.send(JSON.stringify({ type: "KeepAlive" }));
    }, KEEPALIVE_MS);

    dg.on("open", () => {
        // Audio that arrived while Deepgram was still connecting is not dropped:
        // the first second of a class is usually someone saying hello.
        for (const chunk of pending.splice(0)) dg.send(chunk);
    });
    dg.on("message", (data) => {
        if (client.readyState === WebSocket.OPEN) client.send(data.toString());
    });
    dg.on("error", (err) => {
        console.error(`${tag} deepgram error:`, err.message);
        shutdown("deepgram error");
    });
    dg.on("close", () => shutdown("deepgram closed"));

    client.on("message", (data, isBinary) => {
        if (!isBinary) return; // the browser has nothing to say in words
        if (dg.readyState === WebSocket.OPEN) dg.send(data);
        else if (pending.length < 40) pending.push(data);
    });
    client.on("close", () => shutdown("client left"));
    client.on("error", () => shutdown("client error"));
});

server.listen(PORT, () => console.log(`[live-stt] listening on ${PORT}`));

for (const sig of ["SIGTERM", "SIGINT"]) {
    process.on(sig, () => {
        console.log("[live-stt] shutting down");
        wss.clients.forEach((c) => c.close());
        server.close(() => process.exit(0));
    });
}
