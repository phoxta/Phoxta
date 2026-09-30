export const SITE_CHAT_EVENT = "phoxta:site-chat";
export const SITE_VOICE_EVENT = "phoxta:site-voice";

export function submitSiteChat(message: string) {
  window.dispatchEvent(new CustomEvent<string>(SITE_CHAT_EVENT, { detail: message }));
}

export function openSiteVoice() {
  window.dispatchEvent(new Event(SITE_VOICE_EVENT));
}
