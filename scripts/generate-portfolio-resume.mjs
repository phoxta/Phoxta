import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Use the portfolio's existing career record as the resume source.
const source = readFileSync('src/shared/portfolio/portfolioData.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { PROFILE, EXPERIENCE, SKILL_GROUPS, EDUCATION, CERTIFICATIONS } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const doc = await PDFDocument.create();
doc.setTitle('Femi Adeyemi - Product Design Resume');
doc.setAuthor(PROFILE.name);
const regular = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const ink = rgb(.12, .13, .16);
const muted = rgb(.36, .37, .41);
let page;
let y;
function nextPage() {
  page = doc.addPage([595.28, 841.89]);
  y = 790;
}
const safe = (s) => s.replace(/[—–]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/≈/g, 'about ').replace(/·/g, ' | ');
function text(value, size = 10.5, heavy = false, color = ink, gap = 7) {
  const font = heavy ? bold : regular;
  const words = safe(value).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > 490 && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  if (y - lines.length * size * 1.5 < 50) nextPage();
  for (const row of lines) {
    page.drawText(row, { x: 52, y, size, font, color });
    y -= size * 1.5;
  }
  y -= gap;
}
function heading(value) { y -= 12; text(value, 12, true, ink, 10); }
nextPage();
text(PROFILE.name, 24, true);
text('Senior Product Designer | Strategy, UX, Design Systems & Delivery', 12, false, muted, 10);
text(`${PROFILE.location} | ${PROFILE.phone} | ${PROFILE.email}`, 9.5, false, muted, 2);
text('femi.phoxta.com | linkedin.com/in/femi-adeyemi-564430142', 9.5, false, muted, 12);
text('Product designer with 7+ years taking digital products from problem framing and research to shipped interfaces. Experience across AI SaaS, enterprise operations and consumer health. Combines interaction design and scalable design systems with hands-on React and TypeScript delivery.', 11);
heading('EXPERIENCE');
for (const role of EXPERIENCE.slice(0, 3)) {
  text(role.company, 12, true, ink, 2);
  text(`${role.title} | ${role.period} | ${role.location}`, 9.5, false, muted, 6);
  text(role.blurb, 10.5, false, ink, 12);
}
heading('CORE CAPABILITIES');
for (const group of SKILL_GROUPS) {
  text(group.label, 10.5, true, ink, 2);
  text(group.skills.join(' | '), 10, false, muted, 7);
}
nextPage();
text('Femi Adeyemi', 18, true);
text('Experience, education and training', 11, false, muted, 15);
for (const role of EXPERIENCE.slice(3)) {
  text(role.company, 12, true, ink, 2);
  text(`${role.title} | ${role.period} | ${role.location}`, 9.5, false, muted, 6);
  text(role.blurb, 10.5, false, ink, 12);
}
heading('EDUCATION');
for (const item of EDUCATION) {
  text(item.title, 11, true, ink, 2);
  text(`${item.org} | ${item.year}`, 10, false, muted, 8);
}
heading('SELECTED TRAINING');
for (const item of CERTIFICATIONS) text(`${item.title} | ${item.org} | ${item.year}`, 10, false, muted, 3);
heading('SELECTED WORK');
text('Phoxta: AI business operations platform. Coir Six: learner dashboard and responsive design system. Northern Light: role-based internal HR workflows. Detailed work and contact: femi.phoxta.com.', 10.5);
mkdirSync('public/assets/docs', { recursive: true });
writeFileSync('public/assets/docs/femi-adeyemi-resume.pdf', await doc.save());
console.log(`Resume generated: ${doc.getPageCount()} pages`);
