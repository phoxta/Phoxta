import { useState } from 'react';
import { ActionForm, Badge, Notice } from './UI';
import { BRIEF_SECTIONS, safeSourceUrl } from '@/lib/opportunities/domain';
import type { Aggregate } from '@/lib/opportunities/repository';
import { supabase } from '@/lib/supabaseClient';

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
export function ResearchReview({ id, content, data, reload }: { id: string; content: Record<string, unknown>; data: Aggregate; reload: () => void }) {
    const [section, setSection] = useState('thesis'); const [proposal, setProposal] = useState(-1);
    const claims = Array.isArray(content.claims) ? content.claims.filter((x): x is { text: string; kind: string; evidence_ids: string[] } => !!x && typeof x.text === 'string') : [];
    return <div className="p2-stack">
        <Notice>Research draft awaiting your review. Read the cited material and its context before using it in your Brief.</Notice>
        {typeof content.thesis === 'string' && <div><Badge>Proposed thesis · AI synthesis</Badge><p className="p2-readable">{content.thesis}</p></div>}
        {claims.map((claim, index) => <section key={index} className="p2-panel">
            <Badge>{claim.kind === 'sourced' ? 'Source-linked claim · review required' : 'AI hypothesis'}</Badge><p className="p2-readable">{claim.text}</p>
            <details><summary>Inspect evidence ({strings(claim.evidence_ids).length})</summary>{strings(claim.evidence_ids).map(id => {
                const evidence = data.evidence.find(e => e.id === id); const source = data.sources.find(s => s.id === evidence?.source_id);
                return <div className="p2-uncertainty" key={id}><strong>{source?.title ?? 'Evidence reference'}</strong><p>{evidence?.claim ?? 'This evidence record is unavailable.'}</p>{source && <><p className="p2-muted">{source.publisher} · Published {source.published_at ? new Date(source.published_at).toLocaleDateString() : 'unknown'} · Retrieved {new Date(source.retrieved_at).toLocaleDateString()} · {source.geography || 'Geography unspecified'}</p>{source.canonical_url && safeSourceUrl(source.canonical_url) && <a href={safeSourceUrl(source.canonical_url)!} target="_blank" rel="noopener noreferrer">Read original source ↗</a>}</>}</div>;
            })}</details>
        </section>)}
        {(['assumptions', 'unknowns', 'next_questions', 'quality_issues'] as const).map(key => strings(content[key]).length ? <section key={key}><h3>{({ assumptions: 'What must be true', unknowns: 'What remains unknown', next_questions: 'Questions to investigate', quality_issues: 'Review notes' })[key]}</h3><ul>{strings(content[key]).map((text, i) => <li key={i}>{text}</li>)}</ul></section> : null)}
        <details><summary>Review a proposed Brief edit</summary><ActionForm submit="Accept as an inferred Brief section" action={async form => {
            const result = await supabase.rpc('opportunity_accept_research', { p_artifact: id, p_section: section, p_claim: proposal, p_version: data.brief.find(s => s.section_key === section)?.version ?? 0, p_confirmed: form.confirmed === 'on' }); if (result.error) throw result.error;
        }} onSuccess={reload}><div className="p2-form-grid"><label className="p2-field"><span>Brief section</span><select value={section} onChange={event => setSection(event.target.value)}>{BRIEF_SECTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="p2-field"><span>Research proposal</span><select value={proposal} onChange={event => setProposal(Number(event.target.value))}><option value={-1}>Proposed thesis</option>{claims.map((claim, index) => <option key={index} value={index}>{claim.text.slice(0, 100)}</option>)}</select></label></div><div className="p2-grid two"><div className="p2-uncertainty"><strong>Current section</strong><p className="p2-readable">{data.brief.find(s => s.section_key === section)?.content.text || 'No section written yet.'}</p></div><div className="p2-uncertainty"><strong>Proposed version · inferred</strong><p className="p2-readable">{proposal === -1 ? String(content.thesis ?? '') : claims[proposal]?.text}</p></div></div><label className="p2-checkbox"><input type="checkbox" name="confirmed" required />I reviewed this change and its sources. It remains an inference, and the previous version will be preserved.</label></ActionForm></details>
    </div>;
}

/** Readable immutable history; source data remains available in exports. */
export function DecisionSnapshot({ snapshot }: { snapshot: Record<string, unknown> }) {
    const groups = [['brief', 'Brief', 'section_key'], ['evidence', 'Evidence', 'claim'], ['assumptions', 'Assumptions', 'statement'], ['experiments', 'Experiments', 'hypothesis']] as const;
    return <div className="p2-stack">{groups.map(([key, title, field]) => {
        const records = Array.isArray(snapshot[key]) ? snapshot[key] as Record<string, unknown>[] : [];
        return <section key={key}><h3>{title} ({records.length})</h3>{records.map((row, i) => <div key={i} className="p2-uncertainty"><strong>{String(row[field] ?? 'Untitled').replaceAll('_', ' ')}</strong>{typeof row.content === 'object' && row.content !== null && <p className="p2-readable">{String((row.content as Record<string, unknown>).text ?? '')}</p>}{typeof row.status === 'string' && <Badge>{row.status}</Badge>}{typeof row.learning === 'string' && row.learning && <p>{row.learning}</p>}{typeof row.evidence_type === 'string' && <p className="p2-muted">{row.evidence_type.replaceAll('_', ' ')} · {String(row.observed_at ?? '')}</p>}</div>)}</section>;
    })}</div>;
}
