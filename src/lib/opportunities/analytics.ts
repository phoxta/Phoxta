import { supabase } from '@/lib/supabaseClient';
export type OpportunityEvent = 'onboarding_completed' | 'opportunity_impression' | 'opportunity_saved' | 'opportunity_dismissed' | 'workspace_created' | 'brief_section_viewed' | 'evidence_added' | 'assumption_created' | 'experiment_created' | 'experiment_completed' | 'decision_finalized' | 'stage_changed' | 'lesson_completed' | 'research_job_started' | 'upgrade_started' | 'business_listing_viewed' | 'business_enquiry_started';
/** First-party categorical telemetry only; the RPC rejects unrecognised keys. */
export function recordOpportunityEvent(event: OpportunityEvent, properties: Record<string, string | number | boolean> = {}) {
    void (async () => { try { await supabase.rpc('opportunity_track_event', { p_event: event, p_properties: properties }); } catch { /* Metrics never prevent useful work. */ } })();
}
