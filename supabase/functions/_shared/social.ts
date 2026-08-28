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

/**
 * What a post carries beyond a picture and a caption.
 *
 * NAMESPACED BY PLATFORM, because none of these are our fields. Each exists
 * because one platform accepts a parameter of that name, and the same word
 * means something different elsewhere: an Instagram "collaborator" is a
 * co-author who has to accept an invitation before the post appears on their
 * profile, and neither LinkedIn, X nor TikTok has anything equivalent. So
 * nothing outside the Instagram adapter reads this.
 */
export type PostOptions = {
  instagram?: {
    /** Co-authors, up to 3. Public accounts only — Instagram refuses a private
     *  one — and each has to accept before the post reaches their profile. */
    collaborators?: string[];
    /** People tagged ON the picture. x and y run 0..1 from the top-left, which
     *  is what Instagram wants and what a click on the preview produces. */
    userTags?: { username: string; x: number; y: number }[];
    /** Read out by a screen reader. Images only; Instagram rejects it on a
     *  story or a reel. */
    altText?: string;
    /** Put the same picture on the story as well as in the feed. */
    alsoStory?: boolean;
  };
};

export type PublishResult = {
  ok: boolean;
  /** 'simulated' when the platform app is not configured yet. */
  status: "sent" | "simulated" | "failed";
  externalId?: string;
  permalink?: string;
  error?: string;
};

/** A username as Instagram wants it: no leading @, no surrounding space. People
 *  type the @ because that is how a handle is written everywhere else. */
const handle = (v: unknown) => String(v ?? "").trim().replace(/^@+/, "").slice(0, 30);

/** A tag coordinate. Instagram refuses anything outside 0..1 for the whole
 *  container, so one bad number would lose the post rather than the tag. */
const unit = (v: unknown) => Math.min(1, Math.max(0, Number(v) || 0));

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

/**
 * Create a container, WAIT for Instagram to build it, then publish it.
 *
 * The feed post and the story both come through here. They are the same three
 * steps with a different container, and the middle one is the step that is easy
 * to leave out — writing it twice is how one of the two ends up without it.
 */
async function createAndPublish(
  base: string,
  token: string,
  container: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; why: string }> {
  const create = await fetch(`${base}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(container),
  });
  if (!create.ok) return { ok: false, why: "Instagram refused the image: " + await reason(create) };
  const { id: creationId } = await create.json();
  if (!creationId) return { ok: false, why: "Instagram accepted the image but returned no container id." };

  const ready = await waitForContainer(String(creationId), token);
  if (!ready.ok) {
    return {
      ok: false,
      why: ready.why === "IN_PROGRESS"
        ? "Instagram was still processing the image after 20 seconds. It will be retried."
        : "Instagram could not use the image: " + ready.why,
    };
  }

  const publish = await fetch(`${base}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  if (!publish.ok) return { ok: false, why: "Instagram refused to publish it: " + await reason(publish) };
  const { id } = await publish.json();
  return { ok: true, id: String(id ?? "") };
}

/**
 * The published post's own address.
 *
 * A media id is not a shortcode, so /p/<media-id> is a 404 — the link has to be
 * asked for. Best effort: a post that is up with no link is a great deal better
 * than a post that is up behind a link that goes nowhere.
 */
async function permalinkOf(id: string, token: string): Promise<string> {
  if (!id) return "";
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/${id}?fields=permalink&access_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return "";
    return String((await res.json())?.permalink ?? "");
  } catch {
    return "";
  }
}

async function instagram(
  a: SocialAccount,
  caption: string,
  media: string,
  options?: PostOptions,
): Promise<PublishResult> {
  if (!(env("INSTAGRAM_APP_ID") || env("META_APP_ID")) || !a.access_token) return simulated("No Instagram app configured.");
  const base = `https://graph.instagram.com/v21.0/${a.external_id}`;
  const o = options?.instagram ?? {};
  try {
    const container: Record<string, unknown> = { image_url: media, caption, access_token: a.access_token };

    // Meta reads an array or object parameter from a JSON STRING, in a form
    // body and a JSON one alike. Passing a real array happens to work on some
    // endpoints and is rejected on others; one form that is accepted
    // everywhere beats two that are each accepted somewhere.
    const collaborators = (o.collaborators ?? []).map(handle).filter(Boolean).slice(0, 3);
    if (collaborators.length) container.collaborators = JSON.stringify(collaborators);

    const tags = (o.userTags ?? [])
      .map((t) => ({ username: handle(t?.username), x: unit(t?.x), y: unit(t?.y) }))
      .filter((t) => t.username)
      .slice(0, 20);
    if (tags.length) container.user_tags = JSON.stringify(tags);

    const alt = String(o.altText ?? "").trim();
    if (alt) container.alt_text = alt.slice(0, 1000);

    const feed = await createAndPublish(base, a.access_token, container);
    if (!feed.ok) return fail(feed.why);

    /**
     * The story is a SECOND post, published after the feed one.
     *
     * There is no "share this post to my story" in the API — that button lives
     * in the app and nowhere else. What the API does have is publishing a story
     * of its own, so this puts the same picture there. A story takes no caption,
     * no collaborators and no tags: it is the picture, and nothing else.
     *
     * A FAILED STORY DOES NOT FAIL THE POST. The feed post is already up and
     * cannot be recalled, and reporting the whole thing as failed would put it
     * back in the queue to go out a second time. So it is carried as a note on
     * a successful send, which is what the console shows against the post.
     */
    let note = "";
    if (o.alsoStory) {
      const story = await createAndPublish(base, a.access_token, {
        image_url: media,
        media_type: "STORIES",
        access_token: a.access_token,
      });
      if (!story.ok) note = `The post went out, but the story did not: ${story.why}`;
    }

    return {
      ok: true,
      status: "sent",
      externalId: feed.id,
      permalink: await permalinkOf(feed.id, a.access_token),
      error: note,
    };
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

export function publish(a: SocialAccount, caption: string, media: string, options?: PostOptions): Promise<PublishResult> {
  if (!media) return Promise.resolve(fail("There is no picture to post."));
  switch (a.platform) {
    case "instagram": return instagram(a, caption, media, options);
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
