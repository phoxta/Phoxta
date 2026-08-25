// Deprecated location — the Marketing surface moved to Engage → Broadcasts
// (campaigns are "Broadcasts", legacy automations are "Rules", AI Outreach and
// Promo codes came along). This re-export keeps any stray import working; the
// /ops/marketing route already redirects to /ops/engage/broadcasts.
export { default } from "@/pages/dashboard/ops/engage/BroadcastsPage";
