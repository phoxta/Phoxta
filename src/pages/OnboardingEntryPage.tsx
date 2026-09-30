import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

const DiscoveryOnboarding = lazy(() => import('./opportunities/OnboardingPage'));
const BusinessOnboarding = lazy(() => import('./OnboardingPage'));

/** Existing package links retain their original business-activation flow. */
export default function OnboardingEntryPage() {
    const [params] = useSearchParams();
    return <Suspense fallback={<p role="status" className="p-4">Loading setup…</p>}>{params.has('business') ? <BusinessOnboarding /> : <DiscoveryOnboarding />}</Suspense>;
}
