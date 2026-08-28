/* The network, stubbed. Two connected accounts so the Instagram panel has a
   reason to appear and LinkedIn has a reason not to trigger it. */
export const PLATFORM_NAMES = {
  instagram: "Instagram", linkedin: "LinkedIn", tiktok: "TikTok", x: "X",
};

export const EMPTY_IG_OPTIONS = {
  collaborators: [], userTags: [], altText: "", alsoStory: false,
};

export async function listSocialAccounts() {
  return {
    data: {
      accounts: [
        { id: "a1", platform: "instagram", handle: "@phoxta", display_name: "Phoxta", avatar_url: "", status: "connected", last_error: "", updated_at: "" },
        { id: "a2", platform: "linkedin", handle: "Phoxta", display_name: "Phoxta", avatar_url: "", status: "connected", last_error: "", updated_at: "" },
      ],
      limits: {
        instagram: { caption: 2200, note: "Needs a professional account." },
        linkedin: { caption: 3000, note: "Links in the body are demoted." },
        tiktok: { caption: 2200, note: "" },
        x: { caption: 280, note: "" },
      },
    },
    error: null,
  };
}

export async function scheduleSocialPost() { return { data: null, error: null }; }
export async function writeSocialCaption() { return { data: null, error: null }; }

/* A queue with the case that was reported broken: a post that is published,
   with counts read, a real permalink, and the Instagram options it went out
   with — plus one still queued so both states are on screen at once. */
export async function listSocialPosts() {
  return { data: { posts: [
    {
      id: "p1", design_id: "d1", media_url: "/assets/imgs/pages/product/product-1.webp",
      caption: "Three left in the oat linen.\n\nWe cut fifteen and they went in a week.",
      scheduled_at: new Date(2026, 7, 18, 10, 0).toISOString(), status: "published",
      created_at: "", options: { instagram: {
        collaborators: ["studioline"], userTags: [{ username: "amaka", x: 0.4, y: 0.3 }],
        altText: "A folded oat-coloured linen shirt on a pale bench.", alsoStory: true,
      } },
      social_targets: [
        { id: "t1", account_id: "a1", platform: "instagram", status: "sent",
          permalink: "https://www.instagram.com/p/DAbcdef/", error: "",
          likes: 128, comments: 14, metrics_at: new Date(2026, 7, 28, 9, 0).toISOString() },
        { id: "t2", account_id: "a2", platform: "linkedin", status: "sent",
          permalink: "", error: "", likes: 9, comments: 2, metrics_at: new Date(2026, 7, 28, 9, 0).toISOString() },
      ],
    },
    {
      id: "p2", design_id: "d1", media_url: "/assets/imgs/pages/product/product-4.webp",
      caption: "Bank holiday hours", scheduled_at: new Date(2026, 8, 2, 9, 0).toISOString(),
      status: "queued", created_at: "", options: null,
      social_targets: [
        { id: "t3", account_id: "a1", platform: "instagram", status: "pending",
          permalink: "", error: "", likes: null, comments: null, metrics_at: null },
      ],
    },
  ] }, error: null };
}
export async function refreshSocialInsights() { return { data: { refreshed: 0, unknown: 0 }, error: null }; }
export async function cancelSocialPost() { return { data: null, error: null }; }
export async function retrySocialPost() { return { data: null, error: null }; }
export async function sendSocialPostNow() { return { data: { claimed: 0 }, error: null }; }
export async function updateSocialPost() { return { data: null, error: null }; }
