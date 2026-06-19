"""Validate the in-browser (WebRTC) voice path without a browser. Acts as the
Pipecat JS client would: builds an SDP offer, POSTs it to /offer, applies the
answer, sends silence on the mic track, and counts audio frames coming back —
i.e. the agent speaking its greeting over WebRTC (same brain as the phone path).

Success = SDP answer received AND inbound audio frames (the spoken greeting)."""
import asyncio
import os

import httpx
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.mediastreams import AudioStreamTrack  # emits silence
from dotenv import load_dotenv

load_dotenv()

KEY = os.environ.get("PHOXTA_AGENT_KEY", "")
PORT = os.environ.get("SMOKE_PORT", os.environ.get("PORT", "8765"))


async def main():
    pc = RTCPeerConnection()
    pc.addTrack(AudioStreamTrack())  # outbound mic (silence)
    frames = {"audio": 0}

    @pc.on("track")
    def on_track(track):  # noqa: ANN001
        async def consume():
            try:
                while True:
                    await track.recv()
                    frames["audio"] += 1
            except Exception:  # noqa: BLE001
                pass

        asyncio.ensure_future(consume())

    await pc.setLocalDescription(await pc.createOffer())
    async with httpx.AsyncClient(timeout=30) as h:
        r = await h.post(
            f"http://localhost:{PORT}/offer?key={KEY}",
            json={"sdp": pc.localDescription.sdp, "type": pc.localDescription.type},
        )
        ans = r.json()

    print("answer:", ans.get("type"), "| has sdp:", bool(ans.get("sdp")), "| pc_id:", bool(ans.get("pc_id")))
    if not ans.get("sdp"):
        print("RESULT: FAIL — no SDP answer")
        await pc.close()
        return

    await pc.setRemoteDescription(RTCSessionDescription(sdp=ans["sdp"], type=ans["type"]))
    for _ in range(15):  # up to ~15s for the greeting to arrive
        await asyncio.sleep(1)
        if frames["audio"] > 5:
            break

    print("inbound audio frames:", frames["audio"])
    print("RESULT:", "PASS — agent spoke over WebRTC" if frames["audio"] > 0 else "SIGNALING OK but no audio — check server log")
    await pc.close()


asyncio.run(main())
