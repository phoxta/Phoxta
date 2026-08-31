"""Phoxta — Pipecat voice bridge.

Pipecat handles the *voice transport* only: telephony audio (Twilio) -> STT ->
[Phoxta agent] -> TTS -> audio. The reasoning, tools, booking, lead capture,
RAG and unified memory all live in Phoxta's hosted `agent-inbound` edge
function, so voice is just another channel into the same one agent.

The bridge below replaces the usual in-pipeline LLM with an HTTP call to
agent-inbound. That keeps "one brain, every touchpoint": whatever the agent can
do on web/SMS/WhatsApp, it does on the phone too.

Proving the call is real (VOICE_BRIDGE_SECRET):
  agent-inbound is public — anyone can POST it a message with an agent public
  key. The key names a BUSINESS, not a person, so a caller who could assert a
  phone number could read someone else's history back out of the reply. Every
  request this bridge makes therefore carries `x-voice-proof`, an HMAC of a fixed
  string keyed by the shared VOICE_BRIDGE_SECRET, vouching for EXACTLY what a
  phone call can truthfully claim: the "voice" channel and the caller's number.
  With the secret unset the header is omitted and agent-inbound treats us as an
  anonymous web caller — today's behaviour, so a half-finished rollout degrades
  instead of breaking.

NOTE: Pipecat's APIs move quickly. requirements.txt pins the installed version.
The structure (transport -> stt -> bridge -> tts) is stable.
"""

import asyncio
import base64
import hashlib
import hmac
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
    UserStoppedSpeakingFrame,
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

# Proof header, computed once per request from the current env (contract 1):
#   x-voice-proof = base64url(HMAC-SHA256(VOICE_BRIDGE_SECRET, "phoxta-voice-bridge-v1"))
# base64url here == urlsafe base64 with the trailing "=" padding stripped, which
# is exactly what agent-inbound's voiceProofValid() re-derives and compares.
_VOICE_PROOF_MSG = b"phoxta-voice-bridge-v1"

if not os.environ.get("VOICE_BRIDGE_SECRET"):
    logger.warning(
        "[phoxta] VOICE_BRIDGE_SECRET unset — the bridge speaks to agent-inbound as an "
        "ANONYMOUS web caller (channel not 'voice', caller number stripped). Set it here "
        "AND as a Supabase secret so the phone call is filed as voice."
    )


def _voice_proof_header() -> dict:
    secret = os.environ.get("VOICE_BRIDGE_SECRET", "")
    if not secret:
        return {}
    mac = hmac.new(secret.encode(), _VOICE_PROOF_MSG, hashlib.sha256).digest()
    return {"x-voice-proof": base64.urlsafe_b64encode(mac).decode().rstrip("=")}


# Read lazily so load_dotenv() (above / in server.py) has populated the env.
def _agent_url() -> str:
    return os.environ.get("PHOXTA_AGENT_URL", "")


def _anon_key() -> str:
    return os.environ.get("SUPABASE_ANON_KEY", "")


def _agent_headers() -> dict:
    """Headers for every bridge -> agent-inbound request: the anon gateway key
    AND the voice proof (contract 1). The proof is what lets agent-inbound trust
    the channel and caller number; without the secret it is simply absent."""
    hdr = {"Content-Type": "application/json"}
    anon = _anon_key()
    if anon:
        hdr["Authorization"] = f"Bearer {anon}"
        hdr["apikey"] = anon
    hdr.update(_voice_proof_header())
    return hdr


async def _fetch_voice(public_key: str) -> dict:
    """Fetch the business's saved voice settings (agent_config.voice) so the call
    uses a per-business TTS voice. Best-effort — empty dict on any failure."""
    url = _agent_url()
    if not url:
        return {}
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(url, json={"public_key": public_key, "voice_config": True}, headers=_agent_headers())
            return (r.json() or {}).get("voice") or {}
    except Exception:  # noqa: BLE001
        return {}


def _build_stt() -> DeepgramSTTService:
    """Deepgram STT tuned for phone turn-taking. Endpointing (~300ms) is how
    quickly Deepgram calls a pause the end of a segment; utterance_end_ms (~1000)
    is the silence after which it declares the whole utterance done. Set both
    explicitly rather than inheriting whatever the default is, because the bridge
    now fires one agent turn per finished utterance (see PhoxtaAgentBridge) and
    those two numbers decide when 'finished' happens."""
    return DeepgramSTTService(
        api_key=os.environ["DEEPGRAM_API_KEY"],
        settings=DeepgramSTTService.Settings(endpointing=300, utterance_end_ms=1000),
    )


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

    def _build_and_save():
        # Encoding a multi-second WAV and writing it to disk is blocking work;
        # done in a worker thread so it can't stall the event loop right as the
        # next call is trying to set up its audio.
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
        data = buf.getvalue()
        os.makedirs("recordings", exist_ok=True)
        path = os.path.join("recordings", f"{conversation_id or call_sid}.wav")
        saved = None
        try:
            with open(path, "wb") as f:
                f.write(data)
            saved = path
        except Exception as exc:  # noqa: BLE001
            logger.warning(f"[phoxta] could not save local recording: {exc}")
        return data, saved

    wav, saved = await asyncio.to_thread(_build_and_save)
    if saved:
        logger.info(f"[phoxta] saved recording {saved} ({len(wav)} bytes)")

    url = _agent_url()
    if not (conversation_id and url):
        return
    anon = _anon_key()
    hdr = _agent_headers()
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

    Turn-taking, the hard part of a voice agent, works like this:
      • Deepgram emits an is_final TranscriptionFrame for each finished segment.
        One caller sentence can arrive as several. We BUFFER them and do NOT call
        the agent per segment — that would start several overlapping agent turns
        for one sentence.
      • When the VAD says the caller stopped (UserStoppedSpeakingFrame) we flush
        the buffer and fire ONE agent turn. A fallback timer (~1.5s after the
        last is_final) covers a missed stop frame so the call can't stall.
      • The agent call runs as a cancellable task, not awaited inline: when the
        caller starts speaking again, presses a key, or the call ends, the
        in-flight reply (and its timers) is cancelled so we never talk over them.
      • A monotonic turn id guards late replies that slipped past cancellation.

    It deliberately does NOT forward TranscriptionFrames downstream (or the TTS
    would read the caller's own words back to them)."""

    def __init__(self, public_key: str, caller: str, caller_name: str = "", direction: str = "inbound", opening: str = ""):
        super().__init__()
        self._public_key = public_key
        self._caller = caller                 # customer phone (dialled number on outbound)
        self._caller_name = caller_name        # Twilio caller-ID name, when known
        self._direction = direction            # "inbound" | "outbound"
        self._opening = opening                # outbound calls open with this line instead of the greeting
        self._conversation_id = None
        # 15s client timeout: a phone caller will not wait 30s in silence, and a
        # reply that slow is better served by the fallback line than a late answer.
        self._http = httpx.AsyncClient(timeout=15)
        self._turn = 0                         # bumped by every caller utterance/keypress
        self._dtmf = ""                        # buffer of keypad digits between speech turns
        self._buffer: list[str] = []           # is_final segments of the current utterance
        self._reply_task = None                # in-flight agent reply
        self._filler_task = None               # "one moment…" holding line
        self._fallback_task = None             # missed-stop-frame safety timer

    # --- customer / payloads --------------------------------------------------
    def _customer(self) -> dict:
        c: dict = {"phone": self._caller}
        if self._caller_name:
            c["name"] = self._caller_name
        return c

    def _greeting_payload(self) -> dict:
        return {
            "public_key": self._public_key,
            "greeting": True,
            "channel": "voice",
            "direction": self._direction,
            "customer": self._customer(),
        }

    async def _post(self, payload: dict) -> dict:
        try:
            resp = await self._http.post(_agent_url(), json=payload, headers=_agent_headers())
            return resp.json()
        except asyncio.CancelledError:
            raise  # barge-in / shutdown cancelled us — propagate, don't swallow
        except Exception as exc:  # noqa: BLE001
            logger.error(f"[phoxta] agent call failed: {exc}")
            return {}

    # --- task cancellation (all synchronous — no self-cancel deadlocks) -------
    @staticmethod
    def _kill(task) -> None:
        if task is not None and not task.done():
            task.cancel()

    def _cancel_reply(self) -> None:
        self._kill(self._reply_task)
        self._reply_task = None

    def _cancel_filler(self) -> None:
        self._kill(self._filler_task)
        self._filler_task = None

    def _cancel_fallback(self) -> None:
        self._kill(self._fallback_task)
        self._fallback_task = None

    def _cancel_pending(self) -> None:
        self._cancel_reply()
        self._cancel_filler()
        self._cancel_fallback()

    # --- greeting -------------------------------------------------------------
    async def _greet(self):
        data = await self._post(self._greeting_payload())
        if not data.get("conversationId"):
            # Retry once: a greeting with no conversation id means the call opens
            # with no thread, so every later turn would file as a fresh
            # conversation. The first _ask still sends channel:"voice", so even if
            # this second try also fails the thread is opened as voice by the
            # proof on that message.
            logger.warning("[phoxta] greeting returned no conversationId — retrying once")
            data = await self._post(self._greeting_payload())
        self._conversation_id = data.get("conversationId")
        # Outbound: open with the operator's purpose line; inbound: the greeting.
        line = self._opening or data.get("reply")
        if line:
            await self.push_frame(TTSSpeakFrame(line))

    # --- one caller turn ------------------------------------------------------
    def _fire(self, text: str) -> None:
        """Start (or restart) the agent turn for `text` as a cancellable task.
        Clears any in-flight reply, holding-line filler and stray fallback timer
        first, so exactly one turn is ever live."""
        self._turn += 1
        self._cancel_pending()
        self._reply_task = self.create_task(self._ask(text, self._turn))

    def _flush_turn(self) -> None:
        self._cancel_fallback()
        text = " ".join(self._buffer).strip()
        self._buffer = []
        if text:
            self._fire(text)

    def _arm_fallback(self) -> None:
        # (Re)start the safety timer on each is_final so it lands ~1.5s after the
        # LAST one. If the stop frame arrives first it cancels this; if it never
        # comes, this flushes the turn so the caller is never left hanging.
        self._cancel_fallback()
        self._fallback_task = self.create_task(self._fallback_fire(self._turn))

    async def _fallback_fire(self, turn: int):
        try:
            await asyncio.sleep(1.5)
        except asyncio.CancelledError:
            return
        self._fallback_task = None  # detach before flushing so we don't cancel ourselves
        if turn == self._turn and self._buffer:
            logger.debug("[phoxta] stop-frame missed — firing buffered turn on the fallback timer")
            self._flush_turn()

    async def _filler(self, turn: int):
        try:
            await asyncio.sleep(2.5)
        except asyncio.CancelledError:
            return
        if turn == self._turn:
            await self.push_frame(TTSSpeakFrame("One moment…"))

    async def _ask(self, text: str, turn: int):
        # Holding line if the brain is slow; cancelled the instant the reply lands.
        self._filler_task = self.create_task(self._filler(turn))
        try:
            data = await self._post(
                {
                    "public_key": self._public_key,
                    "channel": "voice",
                    "direction": self._direction,
                    "conversationId": self._conversation_id,
                    "customer": self._customer(),
                    "message": text,
                }
            )
        finally:
            self._cancel_filler()

        if data.get("conversationId"):
            self._conversation_id = data["conversationId"]
        # Barge-in backstop: if the caller has moved on since we asked, drop this
        # reply rather than talk over them. Cancellation usually gets here first;
        # this catches a reply that slipped in just as the turn advanced.
        if turn != self._turn:
            logger.debug(f"[phoxta] dropping stale reply for turn {turn} (now {self._turn})")
            return
        reply = (data.get("reply") or "").strip()
        # An EMPTY reply is a DECISION, not a failure. agent-inbound answers
        # reply:"" with human:true when somebody has pressed "Take over" on the
        # thread, or when the owner has set auto-reply to Off / Ask me. Speaking a
        # canned line there is exactly what those settings promise will not
        # happen. Only a genuine failure (the call errored, or came back with no
        # `reply` key at all — including the 15s timeout, which returns {}) gets
        # the fallback, said ONCE, and we do NOT auto re-ask.
        if reply:
            await self.push_frame(TTSSpeakFrame(reply))
            return
        if data.get("human") or data.get("autoReply") in ("off", "approve"):
            logger.info("[phoxta] staying silent: a human owns this conversation")
            return
        if "reply" in data:
            logger.info("[phoxta] the agent chose to say nothing this turn")
            return
        await self.push_frame(TTSSpeakFrame("Sorry, could you say that again?"))

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, StartFrame):
            await self.push_frame(frame, direction)
            await self._greet()

        elif isinstance(frame, UserStartedSpeakingFrame):
            # Caller (re)started talking — a fresh utterance. Invalidate any
            # in-flight reply and its timers (barge-in), drop a half-collected
            # transcript, and forward the frame so TTS downstream stops speaking.
            self._turn += 1
            self._buffer = []
            self._cancel_pending()
            await self.push_frame(frame, direction)

        elif isinstance(frame, InputDTMFFrame):
            # Keypad press (IVR / verification codes / "press 1 to…"). Buffer the
            # digit and hand it to the one brain as a normal message on the SAME
            # cancellable path as speech, so the next press or utterance can
            # interrupt it too.
            digit = getattr(frame.button, "value", str(frame.button))
            self._dtmf += str(digit)
            self._buffer = []
            self._fire(f"[Caller pressed keypad: {self._dtmf}]")

        elif isinstance(frame, TranscriptionFrame) and frame.text and frame.text.strip():
            # A Deepgram is_final segment. Buffer it and (re)arm the fallback — do
            # NOT fire yet; we fire once when the caller stops (below).
            self._dtmf = ""  # speech supersedes any half-entered keypad buffer
            self._buffer.append(frame.text.strip())
            self._arm_fallback()

        elif isinstance(frame, UserStoppedSpeakingFrame):
            # The caller finished — fire the one buffered turn.
            self._flush_turn()
            await self.push_frame(frame, direction)

        elif isinstance(frame, (EndFrame, CancelFrame)):
            self._cancel_pending()
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

    stt = _build_stt()
    tts = _build_tts(await _fetch_voice(public_key))
    bridge = PhoxtaAgentBridge(public_key=public_key, caller=caller, direction="inbound")

    pipeline = Pipeline([transport.input(), stt, bridge, tts, transport.output()])
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    # Mirror the Twilio handler: end the pipeline the moment the browser peer
    # goes away. Without it the task lingers until Pipecat's idle timeout, holding
    # the Deepgram STT + TTS sockets open and a concurrency slot with them.
    try:
        @transport.event_handler("on_client_disconnected")
        async def _on_webrtc_disconnect(_transport, _client):  # noqa: ANN001
            logger.info(f"[phoxta] webrtc session ({public_key[:6]}…) disconnected — ending pipeline")
            await task.cancel()
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[phoxta] could not attach webrtc disconnect handler: {exc}")

    runner = PipelineRunner(handle_sigint=False)
    logger.info(f"[phoxta] webrtc session ({public_key[:6]}…) from {caller} started")
    await runner.run(task)
    logger.info("[phoxta] webrtc session ended")


async def run_bot(websocket, stream_sid: str, call_sid: str, caller: str, public_key: str, caller_name: str = "", direction: str = "inbound", opening: str = ""):
    """Run one Pipecat call session over a Twilio Media Stream websocket.

    `caller` is the customer's number (the dialled number on an outbound call);
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

    # A hard ceiling on call length. Pipecat's session_timeout fires this many
    # seconds after the stream starts (absolute, not idle), so it is not a stall
    # detector — on_client_disconnected already handles a clean hang-up. It is the
    # backstop for a call that never sends a close (a wedged carrier leg, media
    # still flowing): without it that call holds a Deepgram socket and a
    # concurrency slot until Pipecat's own idle timeout. One hour is far above any
    # real call; override with MAX_CALL_SECS.
    max_call = int(os.environ.get("MAX_CALL_SECS", "3600"))

    param_kwargs = dict(
        audio_in_enabled=True,
        audio_out_enabled=True,
        add_wav_header=False,
        vad_analyzer=SileroVADAnalyzer(),
        serializer=serializer,
        session_timeout=max_call,
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
        for k in ("turn_analyzer", "audio_in_filter", "session_timeout"):
            param_kwargs.pop(k, None)
        params = FastAPIWebsocketParams(**param_kwargs)

    transport = FastAPIWebsocketTransport(websocket=websocket, params=params)

    stt = _build_stt()
    tts = _build_tts(await _fetch_voice(public_key))
    bridge = PhoxtaAgentBridge(public_key=public_key, caller=caller, caller_name=caller_name, direction=direction, opening=opening)

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
    # End the pipeline the moment Twilio closes the media stream, or the call
    # stalls past the hard ceiling. Without this nothing notices the hang-up and
    # the task lingers until Pipecat's idle timeout (~5 min) — holding the
    # Deepgram STT *and* TTS websockets open, occupying a concurrency slot, and
    # delaying the recording write/upload by the same five minutes.
    try:
        @transport.event_handler("on_client_disconnected")
        async def _on_disconnect(_transport, _client):  # noqa: ANN001
            logger.info(f"[phoxta] call {call_sid} disconnected — ending pipeline")
            await task.cancel()

        @transport.event_handler("on_session_timeout")
        async def _on_session_timeout(_transport, _client):  # noqa: ANN001
            logger.info(f"[phoxta] call {call_sid} hit the {max_call}s ceiling — ending pipeline")
            await task.cancel()
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"[phoxta] could not attach transport lifecycle handlers: {exc}")

    runner = PipelineRunner(handle_sigint=False)
    logger.info(f"[phoxta] call {call_sid} from {caller} ({direction}) started")
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
