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
