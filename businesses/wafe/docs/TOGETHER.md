# Together — family chat and calling

Wàfè's brief names WhatsApp as one of the disconnected tools it replaces, and the
demo calendar carries "Video call with Mama Fọláké at 14:00" — an event the app
could not fulfil. This is the module that closes that gap: **one place the family
talks**, in writing, in voice notes, and face to face.

The research behind this decision is in `together-research.json` (four parallel
surveys of self-hosted media servers, peer-to-peer libraries, managed APIs, and
the product patterns of family-communication apps).

## The decision

**Chat: Supabase Realtime + Postgres + Storage. No new vendor.**

Not because it is cheapest, but because it is the only option that keeps ONE
permission system. Wàfè's hardest requirement is that a child never sees
something simply because they belong to the family. Supabase Realtime
Authorization enforces row-level security on private broadcast and presence
channels using the same policies and the same JWT as every other table in the
app. Stream, Matrix or Rocket.Chat would each force us to mirror that privacy
model into a second system and keep the two in sync forever — which is precisely
how a fifteen-year-old ends up reading a thread about her own guardianship.

**Calling: the browser's own WebRTC, signalled over Supabase Realtime, relayed
by Cloudflare TURN when it must be. No media server, no per-minute bill.**

- **Signalling** is a private Supabase Realtime broadcast channel per call,
  guarded by RLS on `realtime.messages`. We already run this websocket. Offer,
  answer and ICE candidates travel over it; nothing new is deployed.
- **The connection** is `RTCPeerConnection` written directly, using the
  *perfect negotiation* pattern. No library: `simple-peer` has been unmaintained
  for four years and needs Node polyfills under Vite; PeerJS would put a
  permanent Node service on the Oracle box duplicating a transport we already
  operate; Trystero opens a second websocket on public channels outside RLS.
- **TURN** is Cloudflare Realtime TURN, with short-lived credentials minted by a
  Supabase edge function. 1,000 GB free per month, then $0.05/GB — roughly two
  thousand relayed hours before a bill. This matters more than it looks: 15–20%
  of consumer sessions cannot connect peer-to-peer, and that share is materially
  higher on Nigerian mobile carriers behind symmetric CGNAT. Mama Fọláké is the
  user most likely to need the relay.
- **Group calls** use a mesh, which is honest up to four participants. Beyond
  that the UI says so and offers audio-only, which meshes comfortably further.

### What we deliberately did not do

| Rejected | Why |
|---|---|
| **Self-hosted LiveKit** (the strongest single candidate: Apache-2.0, arm64, embedded TURN, one binary) | It is a new always-on service with a wide UDP range, its own TLS and DNS, sharing a small box with the Pipecat voice server. It fails in the worst way — silently, for some users, on some networks. For a family app whose commonest call is two people, an SFU is infrastructure we would operate but rarely need. It stays the documented upgrade path the day group calls outgrow the mesh. |
| **Jitsi, embedded** | Four interacting services to self-host; and the iframe path drops a corporate conferencing UI into a product that must be warm enough for a five-year-old. `meet.jit.si` caps free use at 25 active endpoints a month. Its prejoin/lobby flow is worth reading as a design reference, which we did. |
| **LiveKit Cloud, Daily, 100ms, Agora, Twilio** | All price per participant-minute. A five-person forty-minute call is 200 participant-minutes; every free tier bites at roughly 25–40 active families. This is a product sold to families on a marketplace — a bill that scales with family closeness is the wrong business. |
| **Matrix / Stream / Rocket.Chat for chat** | A second permission system to keep in sync with our RLS. |

### What we did reuse

- **wavesurfer.js** (BSD-3-Clause, 10.4k stars, maintained) for voice-note
  waveforms — the single warmest feature for a grandmother on a bad line.
- **Jitsi's prejoin and lobby flow**, read as a design spec, not imported.
- The browser's own `SpeechRecognition`, on-device only, for live captions.

## The product shape

The most important finding in the whole survey came from the family-UX lane:
**ship async before live**. Marco Polo's success and the Portal and Glow
post-mortems all point the same way — what keeps a distant grandmother in a
family's daily life is not scheduled video calls, it is the voice note she plays
three times and the photo she keeps. Live calling matters, but it is the second
feature, not the first.

So Together leads with the thread and the voice note, and treats the call as
something you start *from* a conversation or a calendar event.

- **Threads** — one always-present *Family* thread, direct messages, and small
  groups a parent creates. Text, photos, voice notes, reactions, replies.
- **Voice notes** — record, waveform, scrub, play at 1.5×, transcribe on device.
  A voice note can be saved to Memories with one tap.
- **Calls** — audio or video, started from a thread, a person, or a calendar
  event. A ring, an answer, mute, camera, speaker, hang up. Nothing else on the
  screen while a five-year-old is holding the phone.
- **Call again** — the last call is one tap to repeat, which is how a
  grandmother actually uses this.
- **Missed calls and unread** reach the dashboard and the follow-up engine.

### Ayo is five

She does not dial. Her Together screen is faces: a photo of each person she is
allowed to call, big enough to hit, one tap to ring. No keypad, no contact list,
no free-text search, no way to reach anyone a parent has not approved.

### Mama Fọláké is sixty-eight and in Ibadan

- Joins by link, no install, no account.
- The prejoin screen shows her own face and one green button.
- If the connection fails twice, the app stops trying video and offers audio.
- If it still fails, it offers a voice note instead — because a message that
  arrives beats a call that does not.
- "Call again" is the largest thing on her screen after a call ends.

### Child safety, disclosed rather than hidden

Children may message and call only people a parent has approved. Parents can see
children's threads — and **the child is told so, in the interface, in plain
words**, on the thread itself: *"Mum and Dad can see this chat."* A monitored
conversation the child knows about is safeguarding. One they do not know about is
surveillance, and it teaches a child that being watched is normal.

Dami is fifteen. Her direct messages with her parents are private from her
siblings, and the disclosure banner tells her exactly who can read what.

## Acceptance criteria

1. The Family thread exists for every space and cannot be deleted or left.
2. A parent can create a group thread and choose its members; a child cannot.
3. Sending text, a photo and a voice note all work in the demo and persist across reload.
4. A voice note records, shows a waveform, scrubs, plays at 1× and 1.5×, and can be saved to Memories.
5. A child sees a plain-language banner naming exactly which parents can read the thread.
6. A child can only open threads with approved people; unapproved contacts are absent, not greyed out.
7. Ayo's Together screen is faces only: no keypad, no search field, no free text.
8. Tapping a face starts a call with a ring, and the callee sees an answer/decline screen.
9. Declining sends a "can't talk now" message into the thread rather than silence.
10. A call shows mute, camera, speaker and hang-up, each with a label a nine-year-old can read.
11. When the peer connection fails, the app retries once, then offers audio-only, then offers a voice note — each step visible and explained.
12. A guest can join a call from a link without an account, seeing a prejoin screen with self-view and one join button.
13. Ending a call writes a history row with duration and participants; "call again" repeats it in one tap.
14. A missed call raises a notification and appears on the dashboard's attention list.
15. A calendar event marked as a call shows "Start the call" at its time.
16. The unread count reaches the shell badge and the dashboard.
17. Everything is reachable by keyboard, captions can be turned on, and reduced motion is honoured.
18. At 390px there is no horizontal scroll, and the in-call controls stay above the fold.
19. Parents can mute a thread's notifications and set quiet hours per member.
20. The companion can draft a message for a member to review and send — never sends on its own.

## Cost, honestly

| Item | Cost |
|---|---|
| Chat (Supabase Realtime, Postgres, Storage) | Included in what Wàfè already pays |
| Signalling | Included — same websocket |
| Peer-to-peer calls | £0 — the media never touches our servers |
| TURN relay (~15–20% of sessions, higher in Nigeria) | 1,000 GB/month free, then $0.05/GB |
| Voice-note storage | Opus at ~24 kbps ≈ 180 KB per minute |
| New always-on services to operate | **None** |
