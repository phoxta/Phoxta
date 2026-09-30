/** Render only the server-authorised export payload, never the UI aggregate.
 * Free accounts receive a summary; full Briefs include claim-level evidence
 * references and the original source metadata. No external service sees data.
 */
export type BriefExport = {
    title: string; thesis: string; stage: string; geography: string; exported_at: string; format: 'summary' | 'full';
    sections?: { section: string; content: { text: string; kind: string; evidence_ids: string[] } }[];
    evidence?: { id: string; type: string; claim: string; source_id: string | null; observed_at: string; geography: string }[];
    sources?: { id: string; title: string; publisher: string; url: string | null; published_at: string | null; retrieved_at: string; geography: string }[];
};
type Block = { kind: 'title' | 'heading' | 'body' | 'meta'; text: string };
const label = (value: string) => value.replaceAll('_', ' ');
export function exportBlocks(data: BriefExport): Block[] {
    const blocks: Block[] = [
        { kind: 'meta', text: 'PHOXTA / OPPORTUNITY BRIEF' }, { kind: 'title', text: data.title },
        { kind: 'meta', text: `${label(data.stage)} · ${data.geography || 'Geography unspecified'} · Exported ${data.exported_at}` },
        { kind: 'heading', text: 'Opportunity thesis' }, { kind: 'body', text: data.thesis || 'Unknown — needs investigation.' },
        { kind: 'meta', text: 'An opportunity thesis is a working proposition. Inspect the evidence and unresolved assumptions before deciding.' },
    ];
    if (data.format !== 'full') { blocks.push({ kind: 'meta', text: 'PHOXTA FREE SUMMARY — Full Brief and source exports are available on paid plans.' }); return blocks; }
    for (const section of data.sections ?? []) blocks.push(
        { kind: 'heading', text: label(section.section) },
        { kind: 'meta', text: `Claim label: ${section.content.kind}` },
        { kind: 'body', text: section.content.text },
        ...(section.content.evidence_ids?.length ? [{ kind: 'meta' as const, text: `Evidence: ${section.content.evidence_ids.join(', ')}` }] : []),
    );
    blocks.push({ kind: 'heading', text: 'Evidence register' });
    for (const item of data.evidence ?? []) blocks.push(
        { kind: 'meta', text: `${item.id} / ${label(item.type)}` }, { kind: 'body', text: item.claim },
        { kind: 'meta', text: `Observed: ${item.observed_at} · Geography: ${item.geography || 'Unspecified'} · Source: ${item.source_id || 'No external source'}` },
    );
    blocks.push({ kind: 'heading', text: 'Sources and provenance' });
    for (const source of data.sources ?? []) blocks.push(
        { kind: 'heading', text: source.title },
        { kind: 'meta', text: `Source ID: ${source.id} · Publisher: ${source.publisher || 'Unknown'}` },
        { kind: 'body', text: source.url || 'Private reference; no public URL.' },
        { kind: 'meta', text: `Published: ${source.published_at || 'Unknown'} · Retrieved: ${source.retrieved_at} · Geography: ${source.geography || 'Unspecified'}` },
    );
    return blocks;
}

export async function createBriefPdf(data: BriefExport, fontBytes: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
    const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit')]);
    const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
    pdf.setTitle(data.title); pdf.setAuthor('Phoxta'); pdf.setSubject('Opportunity Brief with evidence provenance');
    const font = await pdf.embedFont(fontBytes, { subset: true });
    const characterSet = new Set(font.getCharacterSet());
    // Preserve unsupported code points explicitly instead of silently losing
    // characters in a PDF glyph. DOCX retains the original Unicode text.
    const printable = (text: string) => [...text].map(c => c === '\n' || characterSet.has(c.codePointAt(0)!) ? c : `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`).join('');
    let page = pdf.addPage([595.28, 841.89]); let y = 784;
    const newPage = () => { page = pdf.addPage([595.28, 841.89]); y = 784; };
    for (const block of exportBlocks(data)) {
        const size = block.kind === 'title' ? 27 : block.kind === 'heading' ? 15 : block.kind === 'meta' ? 9 : 11;
        const leading = size * 1.5;
        if (y < 90 + leading * 2) newPage();
        if (block.kind === 'heading') y -= 10;
        for (const paragraph of printable(block.text).split('\n')) {
            let line = '';
            // Wrap long URLs and unbroken IDs as well as normal paragraphs.
            for (const part of paragraph.split(/(\s+)/)) {
                if (font.widthOfTextAtSize(line + part, size) <= 485) { line += part; continue; }
                if (line.trim()) { if (y < 65) newPage(); page.drawText(line.trim(), { x: 55, y, size, font, color: rgb(.12, .14, .13) }); y -= leading; line = ''; }
                for (const char of part.trimStart()) {
                    if (font.widthOfTextAtSize(line + char, size) > 485) { if (y < 65) newPage(); page.drawText(line, { x: 55, y, size, font }); y -= leading; line = ''; }
                    line += char;
                }
            }
            if (y < 65) newPage();
            page.drawText(line.trim(), { x: 55, y, size, font, color: block.kind === 'meta' ? rgb(.38, .40, .39) : rgb(.12, .14, .13) }); y -= leading;
        }
        y -= 9;
    }
    pdf.getPages().forEach((p, index) => {
        p.drawLine({ start: { x: 55, y: 45 }, end: { x: 540, y: 45 }, thickness: .5, color: rgb(.8, .82, .8) });
        p.drawText(data.format === 'full' ? 'PHOXTA / Opportunity Brief' : 'PHOXTA / FREE SUMMARY', { x: 55, y: 29, size: 8, font });
        p.drawText(String(index + 1), { x: 527, y: 29, size: 8, font });
    });
    return pdf.save();
}

export async function createBriefDocx(data: BriefExport): Promise<Blob> {
    if (data.format !== 'full') throw new Error('DOCX export is available on paid plans. You can export a PDF summary.');
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Footer, PageNumber } = await import('docx');
    const document = new Document({ creator: 'Phoxta', title: data.title, styles: { default: { document: { run: { font: 'DM Sans', size: 22 }, paragraph: { spacing: { after: 180 } } } } }, sections: [{
        footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun('PHOXTA / Opportunity Brief · '), new TextRun({ children: [PageNumber.CURRENT] })] })] }) },
        children: exportBlocks(data).flatMap(block => block.text.split('\n').map(text => new Paragraph({
            heading: block.kind === 'title' ? HeadingLevel.TITLE : block.kind === 'heading' ? HeadingLevel.HEADING_1 : undefined,
            children: [new TextRun({ text, ...(block.kind === 'meta' ? { size: 18, color: '626A65' } : {}) })],
        }))),
    }] });
    return Packer.toBlob(document);
}

export async function downloadBrief(payload: Record<string, unknown>, format: 'pdf' | 'docx') {
    const data = payload as BriefExport;
    if (!data.title || !['full', 'summary'].includes(data.format)) throw new Error('The export could not be prepared. Try again.');
    let blob: Blob;
    if (format === 'docx') blob = await createBriefDocx(data);
    else {
        const response = await fetch('/assets/fonts/dm-sans/DMSans.ttf');
        if (!response.ok) throw new Error('The export font could not be loaded. Please retry.');
        blob = new Blob([new Uint8Array(await createBriefPdf(data, await response.arrayBuffer()))], { type: 'application/pdf' });
    }
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url;
    link.download = `${data.title.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80) || 'phoxta-opportunity'}.${format}`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
