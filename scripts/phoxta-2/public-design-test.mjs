import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const origin = process.env.PHOXTA_TEST_ORIGIN || 'http://127.0.0.1:5175';
const browser = await puppeteer.launch({ headless: true });
const directory = '.rig/phoxta-2/screenshots';
await mkdir(directory, { recursive: true });

try {
    const page = await browser.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/functions/v1/')) {
            void request.respond({
                status: 200,
                contentType: 'application/json',
                headers: {
                    'access-control-allow-origin': '*',
                    'access-control-allow-headers': '*',
                    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                },
                body: '[]',
            });
        } else if (url.hostname !== new URL(origin).hostname && !url.hostname.includes('googleapis') && !url.hostname.includes('gstatic')) {
            void request.abort();
        } else {
            void request.continue();
        }
    });

    const routes = [
        { request: '/', expected: '/' },
        { request: '/marketplace', expected: '/marketplace' },
        { request: '/pricing', expected: '/pricing' },
        { request: '/startup-school', expected: '/startup-school' },
        { request: '/school', expected: '/school' },
        { request: '/discover', expected: '/marketplace' },
        { request: '/businesses', expected: '/marketplace' },
        { request: '/how-it-works', expected: '/' },
    ];

    for (const width of [1440, 390]) {
        await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
        for (const route of routes) {
            await page.goto(`${origin}${route.request}`, { waitUntil: 'networkidle2', timeout: 60000 });
            await page.waitForSelector('main');
            assert.equal(new URL(page.url()).pathname, route.expected, `${route.request} resolves into the restored public journey`);
            assert.equal(await page.$('.p2-root'), null, `${route.request} must not render post-auth app chrome`);
            assert.equal(await page.$('.phoxta-discovery'), null, `${route.request} must not render the discarded landing-page redesign`);
            assert(await page.$('header'), `${route.request} has the established public header`);
            const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
            assert(dimensions.document <= dimensions.viewport + 2, `${route.request} overflows at ${width}px: ${JSON.stringify(dimensions)}`);

            if (route.request === '/') {
                assert(await page.$('.sec-1-home-4'), 'Homepage uses the previous hero component');
                assert.equal(await page.$$eval('header', nodes => nodes.length), 1, 'Homepage renders one overlaid header');
                assert.match(await page.$eval('h1', el => el.textContent.replace(/\s+/g, ' ').trim()), /^Discover Business Opportunities\.$/);
                await page.screenshot({ path: `${directory}/public-home-restored-${width}.png`, fullPage: false });
            }
            if (route.request === '/startup-school') {
                assert(await page.$('.phoxta-school-hero'), 'Startup School uses its previous landing composition');
            }
            if (route.request === '/pricing') {
                assert.equal((await page.$$('.home-2-pricing-card')).length, 3, 'Pricing retains the previous three-card composition');
            }
            console.log(`PASS ${route.request} at ${width}px: restored public UI`);
        }
    }
    assert.deepEqual(failures, [], 'No browser runtime exceptions');
} finally {
    await browser.close();
}
