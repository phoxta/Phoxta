import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';
const bundled = await build({ entryPoints: ['src/lib/opportunities/export.ts'], bundle: true, packages: 'external', platform: 'node', format: 'esm', write: false });
await mkdir('.rig/phoxta-2', { recursive: true });
await writeFile('.rig/phoxta-2/export-under-test.mjs', bundled.outputFiles[0].text);
const { createBriefPdf, createBriefDocx } = await import('../../.rig/phoxta-2/export-under-test.mjs');
const data = { title: 'Café operations — investigation', thesis: 'A customer problem remains unproven.', stage: 'investigating', geography: 'Lagos', exported_at: '2026-09-26', format: 'full',
    sections: [{ section: 'problem', content: { text: 'Observed coordination work. '.repeat(400), kind: 'known', evidence_ids: ['evidence-1'] } }],
    evidence: [{ id: 'evidence-1', type: 'external', claim: 'An observation with a source.', source_id: 'source-1', observed_at: '2026-09-20', geography: 'Lagos' }],
    sources: [{ id: 'source-1', title: 'Original source', publisher: 'Example', url: 'https://example.org/research', published_at: '2026-09-10', retrieved_at: '2026-09-20', geography: 'Lagos' }],
};
const font = await readFile('public/assets/fonts/dm-sans/DMSans.ttf');
const pdf = await createBriefPdf(data, font); const docx = await createBriefDocx(data);
assert((await PDFDocument.load(pdf)).getPageCount() >= 3, 'Long content paginates');
const text = await mammoth.extractRawText({ buffer: Buffer.from(await docx.arrayBuffer()) });
for (const required of ['Café operations', 'evidence-1', 'source-1', 'https://example.org/research', '2026-09-10', 'Lagos', 'Claim label: known']) assert(text.value.includes(required), `DOCX preserves ${required}`);
await assert.rejects(createBriefDocx({ ...data, format: 'summary' }), /paid plans/);
await writeFile('.rig/phoxta-2/export-full.pdf', pdf); await writeFile('.rig/phoxta-2/export-full.docx', Buffer.from(await docx.arrayBuffer()));
await writeFile('.rig/phoxta-2/export-summary.pdf', await createBriefPdf({ ...data, format: 'summary' }, font));
console.log('PASS: paginated PDF, readable DOCX, Unicode, citations, provenance and summary entitlement.');
