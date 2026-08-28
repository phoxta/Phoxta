/**
 * Publishing one picture and one caption to one social account.
 *
 * WRITTEN FROM EACH PLATFORM'S OWN DOCUMENTATION, not lifted from anyone's
 * implementation. Postiz solves the same problem and is AGPL-3.0: copying its
 * source into this repo would make Phoxta's server-side a derivative work and
 * oblige us to publish it. Endpoints, scopes and upload sequences are facts
 * about Meta's and LinkedIn's APIs, and facts are not copyrightable — so this
 * is our own code against the public specifications.
 *
 * WHAT IS THE SAME EVERYWHERE, and therefore lives here rather than in four
 * copies: nothing publishes without credentials, every adapter returns the
 * platform's own refusal rather than a swallowed boolean, and a missing
 * developer app degrades to "simulated" so the whole queue is exercisable
 * before any of the four review processes has finished. That last one matters:
 * these APIs each require an approved app, and without it there is no way to
 * test the machinery at all.
 *
 * WHAT IS NOT HERE YET: video, carousels, threads, and per-platform options
 * like first-comment or alt text. One picture and one caption is what the
 * graphics studio makes, so it is what this publishes.
 */

const env = (k: string) => Deno.env.get(k) ?? "";

export type SocialAccount = {
  id: string;
  platform: "instagram" | "linkedin" | "tiktok" | "x";
  external_id: string;
  handle: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
};

export type PublishResult = {
  ok: boolean;
  /** 'simulated' when the platform app is not configured yet. */
  status: "sent" | "simulated" | "failed";
  externalId?: string;
  permalink?: string;
  error?: string;
};

const fail = (error: string): PublishResult => ({ ok: false, status: "failed", error: error.slice(0, 500) });
const simulated = (why: string): PublishResult => ({ ok: true, status: "simulated", error: why });

/** Read a fetch failure the way a person would want it reported. */
async function reason(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `HTTP ${res.status} ${body.slice(0, 300)}`;
}

// ── Instagram ───────────────────────────────────────────────────────────────
// Two steps: create a media container pointing at a PUBLIC image URL, then
// publish it. Instagram fetches the picture itself, which is why the asset
// store has to be public — a signed URL that expires before Instagram pulls it
// is the classic failure here.
//
// graph.instagram.com, not graph.facebook.com: the connection now uses
// Instagram Login, whose token is the account's own and is not valid against
// the Facebook host. Posting to the wrong host with a good token fails in a way
// that reads like a permissions problem, so it is worth being explicit.
/**
 * Instagram builds the container ASYNCHRONOUSLY, and publishing before it is
 * built fails.
 *
 * /media returns a container id straight away, but Instagram has not fetched
 * the picture yet. Calling /media_publish at that moment returns 9007 /
 * 2207027 — "Media ID is not available. The media is not ready to be
 * published." — which reads like a permissions or an id problem and is
 * neither. It is simply too early. The documented sequence is to poll the
 * container until its status_code is FINISHED, and that step was missing.
 *
 * POLLING ALSO RECOVERS THE ERROR MESSAGE. When Instagram cannot fetch or
 * accept the image — the asset URL is not public, the aspect ratio is out of
 * range, the file is too large — /media has ALREADY returned 200 and told us
 * nothing. The reason only ever appears on the container, as status_code ERROR
 * with the explanation in `status`. Without this, every one of those failures
 * arrived as the same opaque 9007.
 *
 * The ceiling is deliberately short. social-publish works through a batch of
 * ten sequentially and cron allows the whole call 100 seconds, so a long wait
 * per item would spend the budget on one post. An image container normally
 * finishes in a few seconds; one that has not finished in twenty is reported
 * as retryable, and the next tick tries it again.
 */
const CONTAINER_TRIES = 10;
const CONTAINER_WAIT_MS = 2000;

async function waitForContainer(id: string, token: string): Promise<{ ok: true } | { ok: false; why: string }> {
  for (let i = 0; i < CONTAINER_TRIES; i++) {
    // Sleep first: the container is never ready the instant it is created, so
    // an immediate check is a guaranteed miss and one wasted call.
    await new Promise((r) => setTimeout(r, CONTAINER_WAIT_MS));
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return { ok: false, why: "the container could not be checked: " + (await reason(res)) };
    const s = await res.json().catch(() => ({}));
    const code = String(s?.status_code ?? "");
    if (code === "FINISHED") return { ok: true };
    // EXPIRED is a container left unpublished for 24 hours. It cannot happen on
    // this path, and is cheaper to handle than to reason about.
    if (code === "ERROR" || code === "EXPIRED") return { ok: false, why: String(s?.status || code) };
  }
  return { ok: false, why: "IN_PROGRESS" };
}

async function instagram(a: SocialAccount, caption: string, media: string): Promise<PublishResult> {
  if (!(env("INSTAGRAM_APP_ID") || env("META_APP_ID")) || !a.access_token) return simulated("No Instagram app configured.");
  const base = `https://graph.instagram.com/v21.0/${a.external_id}`;
  try {
    const create = await fetch(`${base}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: media, caption, access_token: a.access_token }),
    });
    if (!create.ok) return fail("Instagram refused the image: " + await reason(create));
    const { id: creationId } = await create.json();
    if (!creationId) return fail("Instagram accepted the image but returned no container id.");

    const ready = await waitForContainer(String(creationId), a.access_token);
    if (!ready.ok) {
      return ready.why === "IN_PROGRESS"
        ? fail("Instagram was still processing the image after 20 seconds. It will be retried.")
        : fail("Instagram could not use the image: " + ready.why);
    }

    const publish = await fetch(`${base}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: creationId, access_token: a.access_token }),
    });
    if (!publish.ok) return fail("Instagram refused to publish it: " + await reason(publish));
    const { id } = await publish.json();
    return { ok: true, status: "sent", externalId: id, permalink: `https://www.instagram.com/p/${id}` };
  } catch (e) {
    return fail(String((e as Error)?.message ?? e));
  }
}

/**
 * LinkedIn pins every call to a dated version, and refuses undated ones.
 *
 * THIS HAS A SHELF LIFE. Versions are supported for a minimum of one year and
 * then sunset, and a request carrying a sunset version gets an error rather
 * than a fallback to the newest — so this stops working on a timer whether or
 * not anybody touches the code. It was 202405 when written, which was already
 * long dead by the time anything tried to post through it.
 *
 * Bump it once a year, from
 * learn.microsoft.com/en-us/linkedin/marketing/versioning, and read that
 * release's changelog before doing so.
 */
const LINKEDIN_VERSION = "202608";

// ── LinkedIn ────────────────────────────────────────────────────────────────
// Three steps: ask for an upload slot, PUT the bytes to it, then create the
// post referencing the returned image urn. Unlike Instagram, LinkedIn wants the
// bytes rather than a URL, so the picture is fetched here and forwarded.
async function linkedin(a: SocialAccount, caption: string, media: string): Promise<PublishResult> {
  if (!env("LINKEDIN_CLIENT_ID") || !a.access_token) return simulated("No LinkedIn app configured.");
  const owner = a.external_id.startsWith("urn:") ? a.external_id : `urn:li:person:${a.external_id}`;
  const H = {
    Authorization: `Bearer ${a.access_token}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": LINKEDIN_VERSION,
  };
  try {
    const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ initializeUploadRequest: { owner } }),
    });
    if (!init.ok) return fail("LinkedIn would not open an upload: " + await reason(init));
    const { value } = await init.json();
    const uploadUrl = value?.uploadUrl;
    const imageUrn = value?.image;
    if (!uploadUrl || !imageUrn) return fail("LinkedIn opened an upload but named no target.");

    const pic = await fetch(media);
    if (!pic.ok) return fail("The picture could not be read for upload: " + await reason(pic));
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${a.access_token}` },
      body: new Uint8Array(await pic.arrayBuffer()),
    });
    if (!put.ok) return fail("LinkedIn rejected the bytes: " + await reason(put));

    const post = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({
        author: owner,
        commentary: caption,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        content: { media: { id: imageUrn } },
        lifecycleState: "PUBLISHED",
      }),
    });
    if (!post.ok) return fail("LinkedIn refused the post: " + await reason(post));
    // The id comes back in a header, not the body.
    const id = post.headers.get("x-restli-id") ?? "";
    return { ok: true, status: "sent", externalId: id, permalink: id ? `https://www.linkedin.com/feed/update/${id}` : "" };
  } catch (e) {
    return fail(String((e as Error)?.message ?? e));
  }
}

// ── X ───────────────────────────────────────────────────────────────────────
// Media still goes through the v1.1 upload endpoint; the post itself is v2.
async function x(a: SocialAccount, caption: string, media: string): Promise<PublishResult> {
  if (!env("X_CLIENT_ID") || !a.access_token) return simulated("No X app configured.");
  try {
    const pic = await fetch(media);
    if (!pic.ok) return fail("The picture could not be read for upload: " + await reason(pic));
    const form = new FormData();
    form.append("media", new Blob([await pic.arrayBuffer()], { type: "image/png" }));

    const up = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${a.access_token}` },
      body: form,
    });
    if (!up.ok) return fail("X rejected the picture: " + await reason(up));
    const { media_id_string } = await up.json();

    const tweet = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${a.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: caption,
        ...(media_id_string ? { media: { media_ids: [media_id_string] } } : {}),
      }),
    });
    if (!tweet.ok) return fail("X refused the post: " + await reason(tweet));
    const { data } = await tweet.json();
    return {
      ok: true, status: "sent", externalId: data?.id ?? "",
      permalink: data?.id ? `https://x.com/${a.handle || "i"}/status/${data.id}` : "",
    };
  } catch (e) {
    return fail(String((e as Error)?.message ?? e));
  }
}

// ── TikTok ──────────────────────────────────────────────────────────────────
// Content Posting API, photo mode: init with the picture's URL, then TikTok
// pulls it. Note the account must be in the app's allow-list until the app is
// approved, and unaudited apps can only post privately — which is a platform
// rule, not something this can work around.
async function tiktok(a: SocialAccount, caption: string, media: string): Promise<PublishResult> {
  if (!env("TIKTOK_CLIENT_KEY") || !a.access_token) return simulated("No TikTok app configured.");
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
      method: "POST",
      headers: { Authorization: `Bearer ${a.access_token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        post_info: { title: caption.slice(0, 90), description: caption, privacy_level: "SELF_ONLY" },
        source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: [media] },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      }),
    });
    if (!res.ok) return fail("TikTok refused the post: " + await reason(res));
    const body = await res.json();
    const id = body?.data?.publish_id ?? "";
    if (body?.error?.code && body.error.code !== "ok") return fail("TikTok: " + JSON.stringify(body.error).slice(0, 300));
    return { ok: true, status: "sent", externalId: id, permalink: "" };
  } catch (e) {
    return fail(String((e as Error)?.message ?? e));
  }
}

export function publish(a: SocialAccount, caption: string, media: string): Promise<PublishResult> {
  if (!media) return Promise.resolve(fail("There is no picture to post."));
  switch (a.platform) {
    case "instagram": return instagram(a, caption, media);
    case "linkedin": return linkedin(a, caption, media);
    case "x": return x(a, caption, media);
    case "tiktok": return tiktok(a, caption, media);
    default: return Promise.resolve(fail(`No adapter for ${a.platform}.`));
  }
}

/** What each platform will not accept, checked before anything is queued. */
export const LIMITS: Record<SocialAccount["platform"], { caption: number; note: string }> = {
  instagram: { caption: 2200, note: "Needs a professional (Business or Creator) account." },
  linkedin: { caption: 3000, note: "Posts as the person or the company page the token was issued for." },
  x: { caption: 280, note: "Long posts need a paid tier; 280 is what a free app can rely on." },
  tiktok: { caption: 2200, note: "Until the app is audited, TikTok only allows private posts." },
};
