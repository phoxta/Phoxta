import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
const result = await build({ entryPoints: ['packages/core/src/curriculum.ts'], bundle: true, format: 'esm', write: false, platform: 'neutral' });
const catalogue = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const q = v => v == null ? 'null' : `'${String(v).replaceAll("'", "''")}'`;
const json = v => `${q(JSON.stringify(v))}::jsonb`;
const output = ['-- Generated from the shared Phoxta 2.0 curriculum. Do not edit lesson text here.',
    '-- Defines an explicit activation function. Does not silently replace production courses.',
    'begin;',
    'create table public.ss_curriculum_archives(organization_id uuid not null references organizations(id),version text not null,catalogue jsonb not null,archived_at timestamptz not null default now(),primary key(organization_id,version));',
    'alter table public.ss_curriculum_archives enable row level security;',
    'revoke all on public.ss_curriculum_archives from anon,authenticated;',
    'create function public.ss_activate_opportunity_curriculum(p_org uuid,p_confirmed boolean default false) returns jsonb language plpgsql security definer set search_path=public as $school$',
    'declare v_preview jsonb;begin',
    "if not app_is_platform_admin() then raise exception 'Platform administrator required.'; end if;",
    'v_preview:=ss_opportunity_migration_preview(p_org);',
    'if not p_confirmed then return v_preview; end if;',
    "if not exists(select 1 from organizations where id=p_org and (slug='startup-school' or vertical='startup-school' or app_path='businesses/startup-school')) then raise exception 'Select a Startup School tenant.'; end if;",
    "insert into ss_curriculum_archives(organization_id,version,catalogue) select p_org,'pre-phoxta-2.0',jsonb_build_object('courses',(select jsonb_agg(to_jsonb(c)) from cs_courses c where organization_id=p_org),'modules',(select jsonb_agg(to_jsonb(m)) from cs_modules m where organization_id=p_org),'lessons',(select jsonb_agg(to_jsonb(l)) from cs_lessons l where organization_id=p_org)) on conflict do nothing;",
    "update cs_courses set published=false where organization_id=p_org and id not like 'v2-%';",
    "insert into cs_mentors(organization_id,id,name,role,bio,hue,handle,followers,expertise) values(p_org,'m-phoxta-curriculum','Phoxta Startup School','Curriculum','Opportunity discovery and venture creation.','mint','phoxta',0,array['start','fund','grow']) on conflict(organization_id,id) do nothing;",
];
for (const [i,c] of catalogue.FINAL_CATEGORIES.entries()) output.push(`insert into cs_categories(organization_id,id,name,blurb,sort) values(p_org,${q(c.id)},${q(c.name)},${q(c.blurb)},${i}) on conflict(organization_id,id) do update set name=excluded.name,blurb=excluded.blurb;`);
for (const c of catalogue.FINAL_COURSES) output.push(`insert into cs_courses(organization_id,id,slug,title,blurb,description,category_id,mentor_id,level,theme,rating,learners,outcomes,final_project_title,final_project_description,published_at,published) values(p_org,${[c.id,c.slug,c.title,c.blurb,c.description,c.categoryId,'m-phoxta-curriculum',c.level,c.theme].map(q)},0,0,${json(c.outcomes)},${q(c.finalProjectTitle)},${q(c.finalProjectDescription)},${q(c.publishedAt)},true) on conflict(organization_id,id) do update set title=excluded.title,description=excluded.description,outcomes=excluded.outcomes,published=true;`);
for (const m of catalogue.FINAL_MODULES) output.push(`insert into cs_modules(organization_id,id,course_id,title,sort) values(p_org,${q(m.id)},${q(m.courseId)},${q(m.title)},${m.sort}) on conflict(organization_id,id) do update set title=excluded.title;`);
for (const l of catalogue.FINAL_LESSONS) output.push(`insert into cs_lessons(organization_id,id,course_id,module_id,title,kind,duration_sec,body,sort) values(p_org,${[l.id,l.courseId,l.moduleId,l.title,l.kind].map(q)},${l.durationSec},${q(l.body)},${l.sort}) on conflict(organization_id,id) do update set title=excluded.title,body=excluded.body;`);
for (const b of catalogue.FINAL_LESSON_BLOCKS) output.push(`insert into cs_lesson_blocks(organization_id,id,lesson_id,type,title,content,sort,action_href,action_label) values(p_org,${[b.id,b.lessonId,b.type,b.title,b.content].map(q)},${b.sort},${q(b.actionHref ?? '')},${q(b.actionLabel ?? '')}) on conflict(organization_id,id) do update set title=excluded.title,content=excluded.content,action_href=excluded.action_href,action_label=excluded.action_label;`);
output.push("insert into opportunity_audit_logs(actor_user_id,org_id,action,metadata) values(auth.uid(),p_org,'school_curriculum_activated',jsonb_build_object('version','phoxta-2.0-school-v1'));", "return v_preview || '{\"activated\":true}'::jsonb;end $school$;", 'revoke all on function public.ss_activate_opportunity_curriculum(uuid,boolean) from public,anon;', 'grant execute on function public.ss_activate_opportunity_curriculum(uuid,boolean) to authenticated;', 'commit;');
const sql = output.join('\n')+'\n';
if (process.argv.includes('--write')) {
    // A fixed target prevents this generator from overwriting the historical
    // 0155 seed via shell redirection (and preserves UTF-8 without a BOM).
    await writeFile(new URL('../../../supabase/migrations/0187_phoxta_school_curriculum.sql', import.meta.url), sql, 'utf8');
    console.log('Updated 0187_phoxta_school_curriculum.sql');
} else process.stdout.write(sql);
