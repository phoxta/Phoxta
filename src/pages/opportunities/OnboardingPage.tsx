import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { ActionForm, Field, Loading, Notice, PageHeading, useLoad } from '@/components/opportunities/UI';
import { command, discoveryProfile } from '@/lib/opportunities/repository';
import { EMPTY_DISCOVERY_PROFILE } from '@/lib/opportunities/domain';
import { PhoxtaLogo } from '@/layouts/OpportunityLayout';
import '@/styles/opportunity.css';

const STEPS = ['intent', 'fit', 'constraints', 'start'];
export default function DiscoveryOnboardingPage() {
    const { step = 'intent' } = useParams(); const current = STEPS.includes(step) ? step : 'intent'; const navigate = useNavigate(); const { user, markOnboarded } = useAuth();
    const state = useLoad(async () => (await discoveryProfile()) ?? EMPTY_DISCOVERY_PROFILE, user?.id ?? '');
    const [error, setError] = useState('');
    const [params] = useSearchParams();
    async function save(data: Record<string, string>, finish = false) {
        const patch: Record<string, unknown> = { ...state.data, ...data, onboarding_step: current, complete: finish };
        for (const key of ['goals', 'skills', 'industries', 'markets', 'models', 'advantages']) if (key in data) patch[key] = data[key].split(',').map(x => x.trim()).filter(Boolean);
        if ('hours_weekly' in data) patch.hours_weekly = data.hours_weekly ? Number(data.hours_weekly) : null;
        await command('profile', patch);
        if (finish) {
            markOnboarded();
            const intended = params.get('redirect');
            const safe = intended?.startsWith('/') && !/^\/[/\\]/.test(intended) && ![...intended].some(c => c === '\\' || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) && !intended.startsWith('/onboarding');
            const routes: Record<string, string> = { industry: '/industries', problem: '/problems', idea: '/my-idea', browse: '/browse' };
            navigate(safe && intended ? intended : `/app/discover${routes[data.entry_mode || state.data?.entry_mode || ''] ?? ''}`);
        } else { state.reload(); navigate(`/onboarding/${STEPS[STEPS.indexOf(current) + 1]}${params.size ? `?${params}` : ''}`); }
    }
    return <div className="p2-root"><main className="p2-public-main" style={{ maxWidth: 800 }}><PhoxtaLogo /><div style={{ marginTop: 45 }}><PageHeading eyebrow={`A starting point · ${STEPS.indexOf(current) + 1} of 4`} title={{ intent: 'What brings you here?', fit: 'Start with what you know.', constraints: 'Make this fit your life.', start: 'Where would you like to begin?' }[current]!}>Every answer is optional. You can change your preferences later.</PageHeading>{state.loading ? <Loading /> : state.error ? <Notice danger>{state.error}</Notice> : <section className="p2-panel"><ActionForm key={current} submit={current === 'start' ? 'Start discovering' : 'Continue'} action={data => save(data, current === 'start')}>{current === 'intent' && <Field label="Your goal" name="goals" value={state.data?.goals[0] ?? ''} options={['', 'start a business', 'side business', 'explore industries', 'investigate my idea', 'grow existing business', 'buy ready-to-launch']} />}{current === 'fit' && <><Field label="Skills and experience (comma separated)" name="skills" value={state.data?.skills.join(', ')} /><Field label="Industries you know or want to explore" name="industries" value={state.data?.industries.join(', ')} /><Field label="Audience, relationships or other advantages (optional)" name="advantages" value={state.data?.advantages.join(', ')} /></>}{current === 'constraints' && <><div className="p2-form-grid"><Field label="Hours available per week" name="hours_weekly" type="number" min={0} max={168} value={state.data?.hours_weekly ?? ''} /><Field label="Capital available — describe your range and currency" name="capital_band" value={state.data?.capital_band} /></div><Field label="Countries or markets (comma separated)" name="markets" value={state.data?.markets.join(', ')} /><Field label="Business model preferences" name="models" value={state.data?.models.join(', ')} placeholder="Services, software, ecommerce…" /><Field label="Complexity you are comfortable with" name="complexity" value={state.data?.complexity} options={['', 'low', 'moderate', 'high']} /></>}{current === 'start' && <Field label="Discovery path" name="entry_mode" value={state.data?.entry_mode} options={[{ value: 'for_me', label: 'Explore for me' }, { value: 'industry', label: 'Explore an industry' }, { value: 'problem', label: 'Start from a problem' }, { value: 'idea', label: 'Investigate my idea' }, { value: 'browse', label: 'Browse opportunities' }]} />}</ActionForm></section>}{error && <Notice danger>{error}</Notice>}<div className="p2-actions" style={{ marginTop: 22 }}><button className="p2-button secondary" onClick={() => { void save({}, true).catch(e => setError(e.message)); }}>Skip setup and explore</button><Link to="/">Back to Phoxta</Link></div></div></main></div>;
}
