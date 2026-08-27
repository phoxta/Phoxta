/**
 * Connecting a social account: where to send someone, and what to do with what
 * comes back.
 *
 * FOUR PLATFORMS, ONE SHAPE. Each differs only in its URLs, its scopes and how
 * it names the account once you have a token, so those are data and the flow
 * is written once. Every one of them is plain OAuth 2 authorization-code; none
 * of the four needs the OAuth 1 signing dance any more.
 *
 * THE STATE IS SIGNED, not stored. It carries the business, the platform and
 * who pressed the button, HMAC'd with that platform's own client secret and
 * given ten minutes. Without a signature the callback would accept any
 * organization id a stranger cared to put in the query string, which is a
 * one-line way to attach your account to somebody else's business.
 *
 * NOTHING HERE WORKS UNTIL THE DEVELOPER APPS EXIST. Each platform needs an
 * approved app with this callback whitelisted as its redirect URI. `configured`
 * says whether that has happened, so the console can show "set this up" rather
 * than bouncing someone to a broken consent screen.
 */

const env = (k: string) => Deno.env.get(k) ?? "";

export type Platform = "instagram" | "linkedin" | "tiktok" | "x";

type Spec = {
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  clientId: () => string;
  clientSecret: () => string;
  /** Some send the client id under a different name. */
  idParam?: string;
  secretParam?: string;
  /** Extra parameters the platform insists on. */
  extraAuth?: Record<string, string>;
};

export const SPECS: Record<Platform, Spec> = {
  // Instagram posting runs through the Facebook Login/Graph pair: the token is
  // a Facebook user token, and the thing posted to is the Instagram
  // professional account linked to a Page.
  instagram: {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    // Meta lists exactly these for publishing through Facebook Login:
    // instagram_basic, instagram_content_publish and pages_read_engagement.
    // pages_show_list is what /me/accounts needs to find the Page the account
    // hangs off. business_management was in here and is NOT required — it is a
    // heavyweight permission that App Review will ask you to justify, and
    // pages_read_engagement, which IS required, was missing: without it the
    // publish fails after a connection that looked fine.
    scopes: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
    clientId: () => env("META_APP_ID"),
    clientSecret: () => env("META_APP_SECRET"),
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    // w_member_social is the one that allows posting; the other two are what
    // lets us show whose account it is.
    scopes: "openid profile w_member_social",
    clientId: () => env("LINKEDIN_CLIENT_ID"),
    clientSecret: () => env("LINKEDIN_CLIENT_SECRET"),
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    // video.upload is for putting content into the user's DRAFTS, which this
    // never does — it direct-posts. Asking for a scope the app has not been
    // granted makes TikTok refuse the whole authorize call, and a scope you
    // cannot justify is also something app review bounces you for.
    scopes: "user.info.basic,video.publish",
    clientId: () => env("TIKTOK_CLIENT_KEY"),
    clientSecret: () => env("TIKTOK_CLIENT_SECRET"),
    // TikTok is the odd one: it calls the id client_key, not client_id.
    idParam: "client_key",
    secretParam: "client_secret",
  },
  x: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    scopes: "tweet.read tweet.write users.read offline.access",
    clientId: () => env("X_CLIENT_ID"),
    clientSecret: () => env("X_CLIENT_SECRET"),
    // X requires PKCE even for confidential clients. The challenge is fixed to
    // 'plain' with a per-request verifier carried in the signed state, so the
    // callback can present it without anywhere to store it in between.
    extraAuth: { code_challenge_method: "plain" },
  },
};

export const configured = (p: Platform) => Boolean(SPECS[p].clientId() && SPECS[p].clientSecret());

/** Where to land the person afterwards. */
export const appBase = () => env("APP_BASE_URL") || "https://www.phoxta.com";

/**
 * The one URL every platform must have whitelisted.
 *
 * On our own domain, not the Supabase one. A callback on a subdomain we do not
 * own cannot be declared as ours — Meta rejected the redirect outright with
 * "the domain of this URL isn't included in the app's domains" — and it reads
 * as somebody else's infrastructure to a reviewer. Vercel proxies this path
 * straight through to the same function, so only the address changes.
 */
export const callbackUrl = () => `${appBase()}/oauth/social/callback`;

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret || "phoxta"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  // base64url: a '+' or '/' in a query parameter does not survive the round trip.
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// deno-lint-ignore no-explicit-any
export async function signState(p: Platform, payload: any): Promise<string> {
  const data = btoa(JSON.stringify({ ...payload, p, exp: Date.now() + 10 * 60 * 1000 }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${data}.${await hmac(data, SPECS[p].clientSecret())}`;
}

// deno-lint-ignore no-explicit-any
export async function verifyState(state: string): Promise<any | null> {
  const i = state.lastIndexOf(".");
  if (i < 0) return null;
  const data = state.slice(0, i);
  const sig = state.slice(i + 1);
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
  const p = payload?.p as Platform;
  if (!p || !SPECS[p]) return null;
  // Compared against the signature for the platform the payload CLAIMS to be,
  // so a state signed with TikTok's secret cannot be replayed as LinkedIn's.
  if ((await hmac(data, SPECS[p].clientSecret())) !== sig) return null;
  if (typeof payload.exp === "number" && Date.now() > payload.exp) return null;
  return payload;
}

export function authorizeUrl(p: Platform, state: string, verifier: string): string {
  const s = SPECS[p];
  const q = new URLSearchParams({
    [s.idParam ?? "client_id"]: s.clientId(),
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: s.scopes,
    state,
    ...(s.extraAuth ?? {}),
  });
  if (p === "x") q.set("code_challenge", verifier);
  return `${s.authUrl}?${q.toString()}`;
}

export type Exchanged = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  raw: Record<string, unknown>;
};

export async function exchange(p: Platform, code: string, verifier: string): Promise<Exchanged> {
  const s = SPECS[p];
  const form = new URLSearchParams({
    [s.idParam ?? "client_id"]: s.clientId(),
    [s.secretParam ?? "client_secret"]: s.clientSecret(),
    code,
    grant_type: "authorization_code",
    redirect_uri: callbackUrl(),
  });
  if (p === "x") form.set("code_verifier", verifier);

  const res = await fetch(s.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${p} refused the code: HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return {
    accessToken: body.access_token ?? "",
    refreshToken: body.refresh_token ?? "",
    expiresIn: Number(body.expires_in ?? 0),
    raw: body,
  };
}

export type Identity = { externalId: string; handle: string; displayName: string; avatarUrl: string };

/**
 * Who the token belongs to.
 *
 * Worth its own step: without it the console lists "Instagram" four times with
 * no way to tell which account is which, and the publisher has no id to post
 * to — Instagram in particular needs the IG business account's id, which is
 * two hops from the token.
 */
export async function identify(p: Platform, t: Exchanged): Promise<Identity> {
  const H = { Authorization: `Bearer ${t.accessToken}` };
  const none: Identity = { externalId: "", handle: "", displayName: "", avatarUrl: "" };
  try {
    if (p === "linkedin") {
      const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: H });
      const d = await r.json();
      return {
        externalId: d.sub ? `urn:li:person:${d.sub}` : "",
        handle: d.email ?? "", displayName: d.name ?? "", avatarUrl: d.picture ?? "",
      };
    }
    if (p === "x") {
      const r = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url,username", { headers: H });
      const { data } = await r.json();
      return {
        externalId: data?.id ?? "", handle: data?.username ? `@${data.username}` : "",
        displayName: data?.name ?? "", avatarUrl: data?.profile_image_url ?? "",
      };
    }
    if (p === "tiktok") {
      const r = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", { headers: H });
      const d = await r.json();
      const u = d?.data?.user ?? {};
      return {
        externalId: u.open_id ?? "", handle: u.display_name ?? "",
        displayName: u.display_name ?? "", avatarUrl: u.avatar_url ?? "",
      };
    }
    // Instagram: token → the Pages this person manages → the IG account on one.
    const pages = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account{id,username,profile_picture_url},name&access_token=${t.accessToken}`);
    const d = await pages.json();
    const withIg = (d?.data ?? []).find((x: Record<string, unknown>) => x.instagram_business_account);
    const ig = withIg?.instagram_business_account;
    if (!ig) throw new Error("That Facebook account has no Instagram professional account linked to a Page.");
    return {
      externalId: ig.id, handle: ig.username ? `@${ig.username}` : "",
      displayName: withIg.name ?? "", avatarUrl: ig.profile_picture_url ?? "",
    };
  } catch (e) {
    // A named failure beats an account row with an empty id that silently
    // never posts.
    throw new Error(`Connected, but ${p} would not say whose account it is: ${String((e as Error)?.message ?? e)}`);
  }
  return none;
}
