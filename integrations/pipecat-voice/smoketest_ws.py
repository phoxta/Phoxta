"""Simulate a Twilio Media Stream against the running voice server to validate
the full pipeline (start -> Grok greeting -> Cartesia TTS -> outbound audio)
without placing a real phone call. Success = we receive `media` frames back
(the agent speaking its greeting)."""
import asyncio
import json
import os

import websockets
from dotenv import load_dotenv

load_dotenv()

SID = "MZ00000000000000000000000000000000"
CALL = "CA00000000000000000000000000000000"
KEY = os.environ.get("PHOXTA_AGENT_KEY", "")
ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")


async def main():
    uri = f"ws://localhost:{os.environ.get('SMOKE_PORT', os.environ.get('PORT', '8765'))}/ws"
    async with websockets.connect(uri, max_size=None) as ws:
        await ws.send(json.dumps({"event": "connected", "protocol": "Call", "version": "1.0.0"}))
        await ws.send(json.dumps({
            "event": "start",
            "sequenceNumber": "1",
            "streamSid": SID,
            "start": {
                "streamSid": SID,
                "accountSid": ACCOUNT_SID,
                "callSid": CALL,
                "tracks": ["inbound"],
                "customParameters": {"key": KEY, "from": "+15550001111"},
                "mediaFormat": {"encoding": "audio/x-mulaw", "sampleRate": 8000, "channels": 1},
            },
        }))
        # Phase 1: greeting audio.
        greeting = await _drain(ws, want=8, timeout=45)
        # Phase 2: press a keypad digit (exercises the DTMF -> agent path) and
        # expect a fresh burst of audio (the agent's spoken reply to the press).
        await ws.send(json.dumps({
            "event": "dtmf",
            "streamSid": SID,
            "dtmf": {"track": "inbound_track", "digit": "1"},
        }))
        dtmf_reply = await _drain(ws, want=8, timeout=45)

        print(f"GREETING audio frames: {greeting}")
        print(f"DTMF-reply audio frames: {dtmf_reply}")
        ok = greeting > 0
        print("RESULT:", "PASS — greeting spoken" + (" + DTMF reply spoken" if dtmf_reply else " (no DTMF reply — check log)") if ok else "NO AUDIO — check server log")


async def _drain(ws, want, timeout):
    """Count `media` frames received until `want` reached or it goes quiet."""
    media = 0
    try:
        while media < want:
            msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
            if json.loads(msg).get("event") == "media":
                media += 1
    except asyncio.TimeoutError:
        pass
    except Exception as e:  # noqa: BLE001
        print("recv error:", e)
    return media


asyncio.run(main())
