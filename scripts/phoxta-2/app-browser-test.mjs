import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';
const origin = process.env.PHOXTA_TEST_ORIGIN || 'http://127.0.0.1:5175';
const userId = '10000000-0000-4000-8000-000000000001';
const workspaceId = '20000000-0000-4000-8000-000000000001';
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'browser@example.test', user_metadata: { full_name: 'Test Founder' }, app_metadata: {}, created_at: '2026-09-01T00:00:00Z' };
const session = { access_token: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now()/1000) + 3600, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.fixture`, refresh_token: 'fixture', expires_in: 3600, expires_at: Math.floor(Date.now()/1000) + 3600, token_type: 'bearer', user };
const workspace = { id: workspaceId, org_id: 'test-org', owner_user_id: userId, title: 'Customer coordination', thesis: 'Investigate a recurring customer workflow.', lifecycle_state: 'investigating', origin: 'problem', geography: 'Lagos', updated_at: '2026-09-25', created_at: '2026-09-01' };
const profile = { goals: [], skills: [], industries: [], markets: [], models: [], advantages: [], hours_weekly: null, capital_band: '', complexity: '', entry_mode: 'browse' };
const evidence = [{ id: 'evidence-1', workspace_id: workspaceId, evidence_type: 'customer_interview', claim: 'A customer described a coordination delay.', interpretation: '', geography: 'Lagos', observed_at: '2026-09-24', source_id: null, confidence_label: 'emerging' }];
const calls = [];
const browser = await puppeteer.launch({ headless: true });
await mkdir('.rig/phoxta-2/screenshots', { recursive: true });
try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(session => { localStorage.setItem('phoxta-auth-ktgleoqvdikngocygdkn', JSON.stringify(session)); }, session);
    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/functions/v1/')) {
            const resource = url.pathname.split('/').at(-1);
            let body = [];
            if (resource === 'user') body = user;
            if (resource === 'user_profiles') body = [{ user_id: userId, full_name: 'Test Founder', onboarding_completed: true }];
            if (resource === 'discovery_profiles') body = [profile];
            if (resource === 'opportunity_workspaces') body = [workspace];
            if (resource === 'evidence_items') body = evidence;
            if (resource === 'experiments') body = [{ id: 'experiment-1', workspace_id: workspaceId, type: 'interview', hypothesis: 'A second customer faces the same delay.', method: 'Ask about a recent event.', success_criteria: 'A concrete observed example.', status: 'running', ends_at: null, learning: '' }];
            if (resource === 'experiment_observations') body = [{ id: 'observation-1', experiment_id: 'experiment-1', observation: 'The second customer described a different workflow.', created_at: '2026-09-25', evidence_id: 'evidence-1' }];
            if (resource === 'opportunity_search') body = { items: [], total: 0, page: 0, page_size: 24, filters: {} };
            if (resource === 'opportunity_role') body = 'owner';
            if (resource === 'opportunity_team_inbox') body = { invitations: [], transfers: [] };
            if (resource === 'opportunity_team_pending') body = { invitations: [], transfers: [] };
            if (resource === 'opportunity_members') body = [{ user_id: userId, email: user.email, role: 'owner', origin: 'workspace' }];
            if (resource === 'app_is_platform_admin') body = false;
            if (resource === 'opportunity_account_summary') body = { account: { plan_key: 'free', billing_status: 'free', org_id: 'test-org' }, limits: { active: 1 }, usage: [] };
            if (resource === 'opportunity_command' && request.method() === 'POST') {
                const call = JSON.parse(request.postData() || '{}'); calls.push(call); body = { id: 'created' };
                if (call.p_action === 'evidence') evidence.push({ ...call.p_data, id: 'evidence-2', observed_at: '2026-09-26', source_id: null });
            }
            if (request.headers().accept?.includes('application/vnd.pgrst.object+json') && Array.isArray(body)) body = body[0] ?? null;
            void request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS,PATCH,DELETE' }, body: JSON.stringify(body) });
        } else if (url.hostname !== new URL(origin).hostname && !url.hostname.includes('googleapis') && !url.hostname.includes('gstatic')) void request.abort();
        else void request.continue();
    });
    for (const width of [1440, 390]) {
        await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
        for (const route of ['/app', '/app/discover', '/app/opportunities', `/app/opportunities/${workspaceId}`, `/app/opportunities/${workspaceId}/brief`, `/app/opportunities/${workspaceId}/evidence`, `/app/opportunities/${workspaceId}/experiments`, `/app/opportunities/${workspaceId}/market`, `/app/opportunities/${workspaceId}/shape`, '/app/school', '/app/settings', '/app/settings/team']) {
            await page.goto(origin + route, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForSelector('.p2-main h1', { timeout: 15000 });
            const dimensions = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
            assert(dimensions[1] <= dimensions[0] + 2, `${route} overflows at ${width}: ${dimensions}`);
            if (route.endsWith('/experiments')) assert((await page.$eval('main', el => el.innerText)).includes('The second customer described a different workflow.'));
            if (route === '/app' && width === 390) {
                await page.click('[aria-label="Open navigation"]'); await page.waitForSelector('[role="dialog"]');
                await page.keyboard.press('Escape');
                await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Open navigation');
            }
            if (route === '/app') await page.screenshot({ path: `.rig/phoxta-2/screenshots/app-home-${width}.png` });
            console.log(`PASS ${route} at ${width}px`);
        }
    }
    await page.goto(`${origin}/app/opportunities/${workspaceId}/evidence`, { waitUntil: 'networkidle2' });
    await page.select('select[name="evidence_type"]', 'user_note');
    await page.type('textarea[name="claim"]', 'A saved note remains separate from observations.');
    await page.click('form button[type="submit"]');
    await page.waitForFunction(() => [...document.querySelectorAll('article p')].some(el => el.textContent.includes('A saved note remains separate')));
    assert(calls.some(c => c.p_action === 'evidence' && c.p_data.workspace_id === workspaceId && c.p_data.evidence_type === 'user_note'));
    assert.deepEqual(errors, [], 'No runtime exceptions');
    console.log('PASS persisted mutation wiring and refreshed evidence display (isolated API fixtures).');
} finally { await browser.close(); }
