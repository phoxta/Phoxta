"""Phoxta — Pipecat voice bridge.

Pipecat handles the *voice transport* only: telephony audio (Twilio) -> STT ->
[Phoxta agent] -> TTS -> audio. The reasoning, tools, booking, lead capture,
RAG and unified memory all live in Phoxta's hosted `agent-inbound` edge
function, so voice is just another channel into the same one agent.

The bridge below replaces the usual in-pipeline LLM with an HTTP call to
agent-inbound. That keeps "one brain, every touchpoint": whatever the agent can
do on web/SMS/WhatsApp, it does on the phone too.

NOTE: Pipecat's APIs move quickly (v1.0, April 2026). Pin a version in
requirements.txt and adjust import paths / service constructors to match your
installed `pipecat-ai`. The structure (transport -> stt -> bridge -> tts) is stable.
"""

import os

import httpx
from dotenv import load_dotenv
from loguru import logger

load_dotenv()

from pipecat.frames.frames import (
    CancelFrame,
    EndFrame,
    Frame,
    InputDTMFFrame,
    StartFrame,
    TranscriptionFrame,
    TTSSpeakFrame,
    UserStartedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.worker import PipelineParams, PipelineTask
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.deepgram.tts import DeepgramTTSService

# Read lazily so load_dotenv() (above / in server.py) has populated the env.
def _agent_url() -> str:
    return os.environ.get("PHOXTA_AGENT_URL", "")


def _anon_key() -> str:
    return os.environ.get("SUPABASE_ANON_KEY", "")


async def _fetch_voice(public_key: str) -> dict:
    """Fetch the business's saved voice settings (agent_config.voice) so the call
    uses a per-business TTS voice. Best-effort — empty dict on any failure."""
    url = _agent_url()
    if not url:
        return {}
    anon = _anon_key()
    hdr = {"Content-Type": "application/json"}
    if anon:
        hdr["Authorization"] = f"Bearer {anon}"
        hdr["apikey"] = anon
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(url, json={"public_key": public_key, "voice_config": True}, headers=hdr)
            return (r.json() or {}).get("voice") or {}
    except Exception:  # noqa: BLE001
        return {}


def _build_tts(voice_cfg: dict):
    """Pick the TTS service from the business's voice settings. Falls back to the
    default Deepgram voice on anything unexpected (keeps the proven path stable)."""
    provider = (voice_cfg.get("provider") or "deepgram").lower()
    voice_id = (voice_cfg.get("voice_id") or "").strip()
    if provider == "cartesia" and os.environ.get("CARTESIA_API_KEY") and voice_id:
        try:
            from pipecat.services.cartesia.tts import CartesiaTTSService

            logger.info(f"[phoxta] TTS: Cartesia voice {voice_id[:8]}…")
            return CartesiaTTSService(api_key=os.environ["CARTESIA_API_KEY"], voice_id=voice_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] Cartesia TTS unavailable ({exc}); using Deepgram")
    return DeepgramTTSService(
        api_key=os.environ["DEEPGRAM_API_KEY"],
        voice=voice_id if (provider == "deepgram" and voice_id) else os.environ.get("DEEPGRAM_VOICE", "aura-asteria-en"),
    )


async def _finalize_recording(public_key, conversation_id, call_sid, chunks, meta):
    """Assemble the buffered call audio into a WAV, save it locally, and (best
    effort) push it to Supabase Storage via a signed upload URL minted by
    agent-inbound — then ask the brain to link it onto the call log. Any failure
    is swallowed: a recording is a nice-to-have, never a reason to break a call."""
    if not chunks:
        return
    import io
    import wave

    sr = int(meta.get("sample_rate", 8000))
    ch = int(meta.get("num_channels", 1))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)  # AudioBufferProcessor emits 16-bit PCM
        w.setframerate(sr)
        w.writeframes(b"".join(chunks))
    wav = buf.getvalue()

    os.makedirs("recordings", exist_ok=True)
    local = os.path.join("recordings", f"{conversation_id or call_sid}.wav")
    try:
        with open(local, "wb") as f:
            f.write(wav)
        logger.info(f"[phoxta] saved recording {local} ({len(wav)} bytes)")
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[phoxta] could not save local recording: {exc}")

    url = _agent_url()
    if not (conversation_id and url):
        return
    anon = _anon_key()
    hdr = {"Content-Type": "application/json"}
    if anon:
        hdr["Authorization"] = f"Bearer {anon}"
        hdr["apikey"] = anon
    try:
        async with httpx.AsyncClient(timeout=60) as http:
            r = await http.post(url, json={"public_key": public_key, "recording_init": True, "conversationId": conversation_id}, headers=hdr)
            d = r.json()
            base, bucket, path, token, public_url = d.get("base"), d.get("bucket"), d.get("path"), d.get("token"), d.get("publicUrl")
            if not (base and bucket and path and token):
                logger.warning(f"[phoxta] recording_init returned no upload URL: {d}")
                return
            put_url = f"{base}/storage/v1/object/upload/sign/{bucket}/{path}?token={token}"
            put_hdr = {"content-type": "audio/wav", "x-upsert": "true"}
            if anon:
                put_hdr["apikey"] = anon
                put_hdr["Authorization"] = f"Bearer {anon}"
            up = await http.put(put_url, content=wav, headers=put_hdr)
            if up.status_code >= 300:
                logger.warning(f"[phoxta] recording upload HTTP {up.status_code}: {up.text[:200]}")
                return
            if public_url:
                await http.post(url, json={"public_key": public_key, "recording_done": True, "conversationId": conversation_id, "recording_url": public_url}, headers=hdr)
                logger.info("[phoxta] recording uploaded and linked to call log")
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[phoxta] recording upload failed (kept local copy): {exc}")


class PhoxtaAgentBridge(FrameProcessor):
    """Speech-in / agent-reply-out. Sits between STT and TTS in the pipeline.

    On the opening StartFrame it fetches the agent's greeting; on each final
    transcription it calls the agent and speaks the reply. It deliberately does
    NOT forward TranscriptionFrames downstream (or the TTS would read the
    caller's own words back to them)."""

    def __init__(self, public_key: str, caller: str, opening: str = ""):
        super().__init__()
        self._public_key = public_key
        self._caller = caller
        self._opening = opening  # outbound calls open with this line instead of the greeting
        self._conversation_id = None
        self._http = httpx.AsyncClient(timeout=30)
        # Monotonic turn counter for barge-in: each new caller utterance/keypress
        # bumps it; a reply whose turn is stale by the time the agent answers is
        # dropped, so we never speak over a caller who has already moved on.
        self._turn = 0
        self._dtmf = ""  # buffer of keypad digits between speech turns

    async def _post(self, payload: dict) -> dict:
        anon = _anon_key()
        headers = {"Content-Type": "application/json"}
        if anon:
            headers["Authorization"] = f"Bearer {anon}"
            headers["apikey"] = anon
        try:
            resp = await self._http.post(_agent_url(), json=payload, headers=headers)
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            logger.error(f"[phoxta] agent call failed: {exc}")
            return {}

    async def _greet(self):
        data = await self._post(
            {"public_key": self._public_key, "greeting": True, "channel": "voice", "customer": {"phone": self._caller}}
        )
        self._conversation_id = data.get("conversationId")
        # Outbound: open with the operator's purpose line; inbound: the greeting.
        line = self._opening or data.get("reply")
        if line:
            await self.push_frame(TTSSpeakFrame(line))

    async def _ask(self, text: str, turn: int):
        data = await self._post(
            {
                "public_key": self._public_key,
                "channel": "voice",
                "conversationId": self._conversation_id,
                "customer": {"phone": self._caller},
                "message": text,
            }
        )
        if data.get("conversationId"):
            self._conversation_id = data["conversationId"]
        # Barge-in: if the caller has spoken again (or pressed a key) while the
        # agent was thinking, this reply is stale — drop it rather than talk over.
        if turn != self._turn:
            logger.debug(f"[phoxta] dropping stale reply for turn {turn} (now {self._turn})")
            return
        reply = data.get("reply") or "Sorry, could you say that again?"
        await self.push_frame(TTSSpeakFrame(reply))

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, StartFrame):
            await self.push_frame(frame, direction)
            await self._greet()
        elif isinstance(frame, UserStartedSpeakingFrame):
            # Caller started talking — invalidate any in-flight reply (barge-in)
            # and forward the frame so TTS downstream stops speaking.
            self._turn += 1
            await self.push_frame(frame, direction)
        elif isinstance(frame, InputDTMFFrame):
            # Keypad press (IVR / verification codes / "press 1 to…"). Buffer the
            # digit and hand it to the one brain as a normal message so the agent
            # can act on it (route, confirm a code, pick a menu option, etc.).
            digit = getattr(frame.button, "value", str(frame.button))
            self._dtmf += str(digit)
            self._turn += 1
            turn = self._turn
            await self._ask(f"[Caller pressed keypad: {self._dtmf}]", turn)
        elif isinstance(frame, TranscriptionFrame) and frame.text and frame.text.strip():
            self._dtmf = ""  # speech supersedes any half-entered keypad buffer
            self._turn += 1
            turn = self._turn
            await self._ask(frame.text.strip(), turn)
        elif isinstance(frame, (EndFrame, CancelFrame)):
            # Summarize the call so it joins the customer's cross-channel memory.
            if self._conversation_id:
                try:
                    await self._post({"public_key": self._public_key, "summarize": True, "conversationId": self._conversation_id})
                except Exception:  # noqa: BLE001
                    pass
            await self._http.aclose()
            await self.push_frame(frame, direction)
        else:
            await self.push_frame(frame, direction)


async def run_webrtc_bot(connection, public_key: str, caller: str = "web visitor"):
    """Run one in-browser (WebRTC) voice session against the same one brain.

    This is the phone pipeline's twin: identical PhoxtaAgentBridge, Deepgram STT
    and Deepgram TTS — only the transport differs (a SmallWebRTC peer connection
    instead of a Twilio Media Stream, so full-band browser audio, no 8kHz mulaw
    serializer). Lets visitors *talk* to the agent on the website, not just type."""
    from pipecat.transports.base_transport import TransportParams
    from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport

    transport = SmallWebRTCTransport(
        webrtc_connection=connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    stt = DeepgramSTTService(api_key=os.environ["DEEPGRAM_API_KEY"])
    tts = _build_tts(await _fetch_voice(public_key))
    bridge = PhoxtaAgentBridge(public_key=public_key, caller=caller)

    pipeline = Pipeline([transport.input(), stt, bridge, tts, transport.output()])
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )
    runner = PipelineRunner(handle_sigint=False)
    logger.info(f"[phoxta] webrtc session ({public_key[:6]}…) from {caller} started")
    await runner.run(task)
    logger.info("[phoxta] webrtc session ended")


async def run_bot(websocket, stream_sid: str, call_sid: str, caller: str, public_key: str, opening: str = ""):
    """Run one Pipecat call session over a Twilio Media Stream websocket.

    `opening` (set for outbound calls) is spoken first instead of the greeting."""
    serializer = TwilioFrameSerializer(
        stream_sid=stream_sid,
        call_sid=call_sid,
        account_sid=os.environ.get("TWILIO_ACCOUNT_SID", ""),
        auth_token=os.environ.get("TWILIO_AUTH_TOKEN", ""),
    )
    # Optional, key-free upgrades — off by default so the proven path is stable.
    #   SMART_TURN=1  natural end-of-turn detection (local ONNX, no API key) so
    #                 the agent waits for the caller to actually finish instead of
    #                 cutting in on a pause. Needs `pip install onnxruntime`.
    #   DENOISE=1     RNNoise background-noise suppression on the inbound audio
    #                 (cleaner STT on noisy lines). Needs the rnnoise native dep.
    turn_analyzer = None
    if os.environ.get("SMART_TURN") == "1":
        try:
            from pipecat.audio.turn.smart_turn.local_smart_turn_v3 import (
                LocalSmartTurnAnalyzerV3,
            )

            turn_analyzer = LocalSmartTurnAnalyzerV3()
            logger.info("[phoxta] Smart Turn (local v3) enabled")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] SMART_TURN requested but unavailable: {exc}")

    audio_in_filter = None
    if os.environ.get("DENOISE") == "1":
        try:
            from pipecat.audio.filters.rnnoise_filter import RNNoiseFilter

            audio_in_filter = RNNoiseFilter()
            logger.info("[phoxta] RNNoise noise reduction enabled")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] DENOISE requested but unavailable: {exc}")

    param_kwargs = dict(
        audio_in_enabled=True,
        audio_out_enabled=True,
        add_wav_header=False,
        vad_analyzer=SileroVADAnalyzer(),
        serializer=serializer,
    )
    if turn_analyzer is not None:
        param_kwargs["turn_analyzer"] = turn_analyzer
    if audio_in_filter is not None:
        param_kwargs["audio_in_filter"] = audio_in_filter
    try:
        params = FastAPIWebsocketParams(**param_kwargs)
    except TypeError as exc:
        # Older/newer Pipecat may name these params differently — degrade rather
        # than fail the call; the core pipeline still runs without the extras.
        logger.warning(f"[phoxta] optional transport params unsupported here ({exc}); continuing without them")
        param_kwargs.pop("turn_analyzer", None)
        param_kwargs.pop("audio_in_filter", None)
        params = FastAPIWebsocketParams(**param_kwargs)

    transport = FastAPIWebsocketTransport(websocket=websocket, params=params)

    stt = DeepgramSTTService(api_key=os.environ["DEEPGRAM_API_KEY"])
    tts = _build_tts(await _fetch_voice(public_key))
    bridge = PhoxtaAgentBridge(public_key=public_key, caller=caller, opening=opening)

    # Optional call recording (RECORD_CALLS=1): an AudioBufferProcessor at the
    # tail captures both legs (caller + agent); we collect the chunks and, on
    # hang-up, write/upload one WAV. Uploaded to a Supabase Storage bucket via a
    # signed URL minted by agent-inbound, then linked onto the call log.
    record = os.environ.get("RECORD_CALLS") == "1"
    audio_buffer = None
    rec_chunks: list[bytes] = []
    rec_meta: dict = {}
    stages = [transport.input(), stt, bridge, tts, transport.output()]
    if record:
        try:
            from pipecat.processors.audio.audio_buffer_processor import (
                AudioBufferProcessor,
            )

            audio_buffer = AudioBufferProcessor(sample_rate=8000, num_channels=1)

            @audio_buffer.event_handler("on_audio_data")
            async def _on_audio_data(_buf, audio, sample_rate, num_channels):  # noqa: ANN001
                rec_chunks.append(audio)
                rec_meta["sample_rate"] = sample_rate
                rec_meta["num_channels"] = num_channels

            stages.append(audio_buffer)
            logger.info("[phoxta] call recording enabled")
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] RECORD_CALLS requested but unavailable: {exc}")
            audio_buffer = None

    pipeline = Pipeline(stages)
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=8000,   # Twilio mulaw is 8kHz
            audio_out_sample_rate=8000,
            allow_interruptions=True,
            enable_metrics=True,          # TTFB / processing latency per service
            enable_usage_metrics=True,    # STT/TTS usage for cost visibility
        ),
    )
    runner = PipelineRunner(handle_sigint=False)
    logger.info(f"[phoxta] call {call_sid} from {caller} started")
    if audio_buffer is not None:
        try:
            await audio_buffer.start_recording()
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] could not start recording: {exc}")
    await runner.run(task)
    logger.info(f"[phoxta] call {call_sid} ended")

    if audio_buffer is not None:
        try:
            await audio_buffer.stop_recording()
        except Exception:  # noqa: BLE001
            pass
        await _finalize_recording(public_key, bridge._conversation_id, call_sid, rec_chunks, rec_meta)
