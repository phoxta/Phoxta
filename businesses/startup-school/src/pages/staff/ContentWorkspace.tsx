import { useCallback, useEffect, useRef, useState } from "react";
import { Upload } from "tus-js-client";
import { useStaff } from "@/state/staff";
import { useTenant } from "@/state/tenant";
import { supabase } from "@/lib/supabase";
import { schoolCommand, type CourseRow, type NamedRow } from "@/lib/staff";
import {
  StaffPanel,
  Notice,
  Empty,
  ActionForm,
  ActionButton,
  inputClass,
} from "@/components/staff/StaffUI";
import { useSchoolRows } from "./StaffPages";
import { ReadingBody } from "@/pages/LessonPage";

type Question = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  sort: number;
};
type Lesson = {
  id: string;
  title: string;
  kind: "article" | "video" | "quiz";
  body: string;
  video_url: string;
  captions_url: string;
  duration_sec: number;
  questions: Question[];
};
type Module = { id: string; title: string; lessons: Lesson[] };
type Document = {
  title: string;
  blurb: string;
  description: string;
  outcomes: string[];
  modules: Module[];
};
type Revision = {
  id: string;
  document: Document;
  state: string;
  version: number;
  review_notes: string;
};
type Media = {
  id: string;
  path: string;
  name: string;
  status: string;
  mime_type: string;
  alt_text: string;
};
const newLesson = (): Lesson => ({
  id: `lesson-${crypto.randomUUID()}`,
  title: "New lesson",
  kind: "article",
  body: "",
  video_url: "",
  captions_url: "",
  duration_sec: 0,
  questions: [],
});

export default function ContentWorkspace() {
  const { tenant } = useTenant();
  const { can } = useStaff();
  const courses = useSchoolRows<CourseRow>(
    "cs_courses",
    "id,title,slug,published,category_id,mentor_id",
  );
  const categories = useSchoolRows<NamedRow>("cs_categories", "id,name");
  const mentors = useSchoolRows<NamedRow>("cs_mentors", "id,name");
  const [selected, setSelected] = useState<CourseRow | null>(null);
  if (selected)
    return (
      <CourseEditor
        key={selected.id}
        course={selected}
        back={() => {
          setSelected(null);
          void courses.refresh();
        }}
      />
    );
  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-brand">
          Content studio
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          Make every lesson useful.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Draft, preview and review. Learners keep the last published version
          until a revision is approved.
        </p>
      </header>
      {courses.error && <Notice error>{courses.error}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        {courses.rows.map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-line bg-card p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              {c.published ? "Published" : "Unpublished"}
            </p>
            <h2 className="mt-3 text-lg font-semibold leading-snug">
              {c.title}
            </h2>
            <p className="mt-2 break-all text-xs text-muted">{c.id}</p>
            <button
              className="mt-5 min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white"
              onClick={() => setSelected(c)}
            >
              Open course editor
            </button>
          </article>
        ))}
      </div>
      {!courses.rows.length && (
        <Empty>
          No courses assigned. Ask an administrator for a course assignment.
        </Empty>
      )}
      {can("content", "school", "") && (
        <StaffPanel title="Create a course">
          <ActionForm
            submitLabel="Create unpublished course"
            fields={[
              { name: "title", label: "Course title" },
              {
                name: "category_id",
                label: "Category",
                options: categories.rows.map((r) => ({
                  value: r.id,
                  label: r.name,
                })),
              },
              {
                name: "mentor_id",
                label: "Course lecturer",
                options: mentors.rows.map((r) => ({
                  value: r.id,
                  label: r.name,
                })),
              },
            ]}
            onSubmit={async (v) => {
              await schoolCommand(tenant!.id, "new_course", v);
              await courses.refresh();
            }}
          />
        </StaffPanel>
      )}
    </>
  );
}
function CourseEditor({
  course,
  back,
}: {
  course: CourseRow;
  back: () => void;
}) {
  const { tenant } = useTenant();
  const { can } = useStaff();
  const org = tenant!.id;
  const [revision, setRevision] = useState<Revision | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [selection, setSelection] = useState<[number, number]>([0, 0]);
  const [reviewNotes, setReviewNotes] = useState("");
  const latestDoc = useRef(doc);
  latestDoc.current = doc;
  const latestRev = useRef(revision);
  latestRev.current = revision;
  const inFlight = useRef<Promise<void> | null>(null);
  const load = useCallback(async () => {
    try {
      const result = await schoolCommand<Revision>(org, "open_revision", {
        course_id: course.id,
      });
      setRevision(result);
      setDoc(result.document);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open draft.");
    }
  }, [org, course.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = useCallback(async () => {
    if (inFlight.current) await inFlight.current;
    const current = latestRev.current,
      document = latestDoc.current;
    if (
      !current ||
      !document ||
      current.state !== "draft" ||
      JSON.stringify(document) === JSON.stringify(current.document)
    )
      return;
    setSaving(true);
    setError("");
    const task = (async () => {
      const saved = await schoolCommand<Revision>(org, "save_revision", {
        id: current.id,
        version: current.version,
        document,
      });
      latestRev.current = saved;
      setRevision(saved);
    })();
    inFlight.current = task;
    try {
      await task;
    } finally {
      inFlight.current = null;
      setSaving(false);
    }
  }, [org]);
  useEffect(() => {
    if (!doc || !revision || revision.state !== "draft") return;
    const timer = setTimeout(
      () =>
        void save().catch((e) =>
          setError(e instanceof Error ? e.message : "Draft was not saved."),
        ),
      1400,
    );
    return () => clearTimeout(timer);
  }, [doc, revision, save]);
  const dirty = Boolean(
    doc &&
    revision &&
    JSON.stringify(doc) !== JSON.stringify(revision.document),
  );
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (!doc || !revision)
    return (
      <>
        {error ? (
          <Notice error>{error}</Notice>
        ) : (
          <Notice>Opening course draft…</Notice>
        )}
        <ActionButton action={load}>Retry</ActionButton>
        <button onClick={back}>Back to courses</button>
      </>
    );
  const lesson = doc.modules[selection[0]]?.lessons[selection[1]];
  const locked = revision.state !== "draft";
  const changeLesson = (patch: Partial<Lesson>) =>
    setDoc(
      (d) =>
        d && {
          ...d,
          modules: d.modules.map((m, mi) =>
            mi !== selection[0]
              ? m
              : {
                  ...m,
                  lessons: m.lessons.map((l, li) =>
                    li !== selection[1] ? l : { ...l, ...patch },
                  ),
                },
          ),
        },
    );
  const act = async (action: string) => {
    await save();
    await schoolCommand(org, action, {
      id: latestRev.current!.id,
      notes: reviewNotes,
    });
    await load();
  };
  return (
    <>
      <header className="space-y-3">
        <button
          onClick={() => {
            if (!dirty || window.confirm("Leave with unsaved changes?")) back();
          }}
          className="min-h-11 text-sm font-semibold text-brand"
        >
          ← All courses
        </button>
        <h1 className="text-2xl font-semibold">{doc.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full bg-brand-soft px-3 py-2 font-semibold text-brand-ink">
            {revision.state.replaceAll("_", " ")} · Version {revision.version}
          </span>
          <span role="status">
            {saving ? "Saving…" : dirty ? "Unsaved changes" : "Draft saved"}
          </span>
          <button
            className="min-h-10 underline"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Back to editor" : "Preview lesson"}
          </button>
          <ActionButton action={save}>Save now</ActionButton>
        </div>
      </header>
      {error && <Notice error>{error}</Notice>}
      {revision.review_notes && (
        <Notice>Reviewer feedback: {revision.review_notes}</Notice>
      )}
      {preview ? (
        <StaffPanel
          title="Learner preview"
          description="This is a private draft preview. No progress or certificate is awarded."
        >
          <button
            onClick={() => setMobilePreview(!mobilePreview)}
            className="min-h-11 text-sm underline"
          >
            {mobilePreview ? "Desktop preview" : "Mobile preview"}
          </button>
          <div
            className={`${mobilePreview ? "max-w-[375px]" : "max-w-3xl"} mx-auto rounded-xl border border-line p-5`}
          >
            <h2 className="mb-5 text-xl font-semibold">
              {lesson?.title ?? doc.title}
            </h2>
            <ReadingBody body={lesson?.body ?? doc.description} />
            {lesson?.kind === "quiz" &&
              lesson.questions.map((q) => (
                <div
                  key={q.id}
                  className="mt-5 rounded-xl border border-line p-4"
                >
                  <p className="font-semibold">{q.prompt}</p>
                  {q.options.map((o, i) => (
                    <p
                      key={i}
                      className="mt-2 rounded-lg bg-subtle p-3 text-sm"
                    >
                      {o}
                    </p>
                  ))}
                </div>
              ))}
          </div>
        </StaffPanel>
      ) : (
        <>
          <StaffPanel title="Course details">
            <label className="block text-sm">
              Title
              <input
                disabled={locked}
                className={`${inputClass} mt-2`}
                value={doc.title}
                onChange={(e) => setDoc({ ...doc, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Short description
              <textarea
                disabled={locked}
                className={`${inputClass} mt-2`}
                value={doc.blurb}
                onChange={(e) => setDoc({ ...doc, blurb: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Course introduction
              <textarea
                disabled={locked}
                className={`${inputClass} mt-2`}
                rows={4}
                value={doc.description}
                onChange={(e) =>
                  setDoc({ ...doc, description: e.target.value })
                }
              />
            </label>
            <label className="block text-sm">
              Learning outcomes (one per line)
              <textarea
                disabled={locked}
                className={`${inputClass} mt-2`}
                value={doc.outcomes.join("\n")}
                onChange={(e) =>
                  setDoc({ ...doc, outcomes: e.target.value.split("\n") })
                }
              />
            </label>
          </StaffPanel>
          <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
            <StaffPanel title="Modules & lessons">
              {doc.modules.map((m, mi) => (
                <div key={m.id} className="space-y-2">
                  <input
                    aria-label={`Module ${mi + 1} title`}
                    disabled={locked}
                    className={inputClass}
                    value={m.title}
                    onChange={(e) =>
                      setDoc({
                        ...doc,
                        modules: doc.modules.map((v, i) =>
                          i === mi ? { ...v, title: e.target.value } : v,
                        ),
                      })
                    }
                  />
                  {m.lessons.map((l, li) => (
                    <button
                      key={l.id}
                      className={`w-full rounded-lg px-3 py-3 text-left text-xs leading-5 ${mi === selection[0] && li === selection[1] ? "bg-brand-soft text-brand-ink" : "bg-subtle"}`}
                      onClick={() => setSelection([mi, li])}
                    >
                      {li + 1}. {l.title}
                    </button>
                  ))}
                  {!locked && (
                    <button
                      className="min-h-10 text-xs font-semibold text-brand"
                      onClick={() => {
                        setDoc({
                          ...doc,
                          modules: doc.modules.map((v, i) =>
                            i === mi
                              ? { ...v, lessons: [...v.lessons, newLesson()] }
                              : v,
                          ),
                        });
                        setSelection([mi, m.lessons.length]);
                      }}
                    >
                      + Add lesson
                    </button>
                  )}
                </div>
              ))}
              {!locked && (
                <button
                  className="min-h-11 text-sm font-semibold text-brand"
                  onClick={() => {
                    setDoc({
                      ...doc,
                      modules: [
                        ...doc.modules,
                        {
                          id: `module-${crypto.randomUUID()}`,
                          title: "New module",
                          lessons: [newLesson()],
                        },
                      ],
                    });
                    setSelection([doc.modules.length, 0]);
                  }}
                >
                  + Add module
                </button>
              )}
            </StaffPanel>
            {lesson ? (
              <StaffPanel
                title="Lesson editor"
                description="Use clear business terms, worked examples and a practical task. Blank lines separate paragraphs; **bold**, *italic* and numbered lists are supported."
              >
                <label className="block text-sm">
                  Lesson title
                  <input
                    disabled={locked}
                    className={`${inputClass} mt-2`}
                    value={lesson.title}
                    onChange={(e) => changeLesson({ title: e.target.value })}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    Format
                    <select
                      disabled={locked}
                      className={`${inputClass} mt-2`}
                      value={lesson.kind}
                      onChange={(e) =>
                        changeLesson({ kind: e.target.value as Lesson["kind"] })
                      }
                    >
                      <option value="article">Reading</option>
                      <option value="video">Video</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    Duration (minutes)
                    <input
                      disabled={locked}
                      type="number"
                      min={0}
                      className={`${inputClass} mt-2`}
                      value={lesson.duration_sec / 60}
                      onChange={(e) =>
                        changeLesson({
                          duration_sec: Math.max(
                            0,
                            Math.round(Number(e.target.value) * 60),
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  Lesson content
                  <textarea
                    disabled={locked}
                    className={`${inputClass} mt-2 leading-7`}
                    rows={14}
                    value={lesson.body}
                    onChange={(e) => changeLesson({ body: e.target.value })}
                  />
                </label>
                {lesson.kind === "video" && (
                  <>
                    <label className="block text-sm">
                      Video URL or uploaded media reference
                      <input
                        disabled={locked}
                        className={`${inputClass} mt-2`}
                        value={lesson.video_url ?? ""}
                        onChange={(e) =>
                          changeLesson({ video_url: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Captions URL or uploaded VTT reference
                      <input
                        disabled={locked}
                        className={`${inputClass} mt-2`}
                        value={lesson.captions_url ?? ""}
                        onChange={(e) =>
                          changeLesson({ captions_url: e.target.value })
                        }
                      />
                    </label>
                  </>
                )}
                {lesson.kind === "quiz" && (
                  <div className="space-y-4">
                    {lesson.questions.map((q, qi) => {
                      const update = (patch: Partial<Question>) =>
                        changeLesson({
                          questions: lesson.questions.map((v, i) =>
                            i === qi ? { ...v, ...patch } : v,
                          ),
                        });
                      return (
                        <fieldset
                          key={q.id}
                          disabled={locked}
                          className="space-y-3 rounded-xl border border-line p-4"
                        >
                          <legend className="px-2 text-sm font-semibold">
                            Question {qi + 1}
                          </legend>
                          <input
                            aria-label="Question"
                            className={inputClass}
                            value={q.prompt}
                            onChange={(e) => update({ prompt: e.target.value })}
                          />
                          <textarea
                            aria-label="Answer options, one per line"
                            rows={4}
                            className={inputClass}
                            value={q.options.join("\n")}
                            onChange={(e) =>
                              update({ options: e.target.value.split("\n") })
                            }
                          />
                          <label className="block text-sm">
                            Correct answer
                            <select
                              className={`${inputClass} mt-2`}
                              value={q.answer}
                              onChange={(e) =>
                                update({ answer: Number(e.target.value) })
                              }
                            >
                              {q.options.map((o, i) => (
                                <option key={i} value={i}>
                                  {i + 1}. {o}
                                </option>
                              ))}
                            </select>
                          </label>
                          <textarea
                            aria-label="Answer explanation"
                            className={inputClass}
                            value={q.explanation}
                            onChange={(e) =>
                              update({ explanation: e.target.value })
                            }
                          />
                        </fieldset>
                      );
                    })}
                    {!locked && (
                      <button
                        className="min-h-11 text-sm font-semibold text-brand"
                        onClick={() =>
                          changeLesson({
                            questions: [
                              ...lesson.questions,
                              {
                                id: `question-${crypto.randomUUID()}`,
                                prompt: "",
                                options: ["", "", "", ""],
                                answer: 0,
                                explanation: "",
                                sort: lesson.questions.length,
                              },
                            ],
                          })
                        }
                      >
                        + Add question
                      </button>
                    )}
                  </div>
                )}
                {!locked && (
                  <ActionForm
                    submitLabel="Ask AI for a lesson draft"
                    fields={[
                      {
                        name: "brief",
                        label: "What should this lesson teach?",
                        type: "textarea",
                      },
                    ]}
                    onSubmit={async (v) => {
                      const { data, error: aiError } =
                        await supabase.functions.invoke(
                          "startup-school-staff",
                          {
                            body: {
                              op: "draft",
                              organizationId: org,
                              courseId: course.id,
                              brief: v.brief,
                            },
                          },
                        );
                      if (aiError || data?.error)
                        throw new Error(
                          data?.error ?? "AI drafting is unavailable.",
                        );
                      if (
                        !window.confirm(
                          "Replace the current lesson body with this AI draft? You must review it before publication.",
                        )
                      )
                        return;
                      changeLesson({ body: String(data.body) });
                    }}
                  />
                )}
              </StaffPanel>
            ) : (
              <Empty>Add a module to begin.</Empty>
            )}
          </div>
          <MediaLibrary
            courseId={course.id}
            onUse={(asset, kind) => {
              if (kind === "video")
                changeLesson({ video_url: `school-media:${asset.path}` });
              else if (kind === "captions")
                changeLesson({ captions_url: `school-media:${asset.path}` });
              else
                changeLesson({
                  body: `${lesson?.body ?? ""}\n\n${asset.mime_type.startsWith("image/") ? "!" : ""}[${asset.alt_text || asset.name}](school-media:${asset.path})`,
                });
            }}
            locked={locked || !lesson}
          />
        </>
      )}
      <StaffPanel
        title="Review & publication"
        description="Draft edits never replace live content until an authorised reviewer publishes them. Archiving hides the course without deleting learner records."
      >
        <div className="flex flex-wrap gap-3">
          {revision.state === "draft" && (
            <ActionButton action={() => act("submit_revision")}>
              Submit for review
            </ActionButton>
          )}
          {can("publish") && revision.state === "in_review" && (
            <ActionButton action={() => act("publish_revision")}>
              Approve & publish
            </ActionButton>
          )}
          {can("publish") && (
            <ActionButton
              destructive
              action={async () => {
                await schoolCommand(org, "archive_course", {
                  course_id: course.id,
                });
                back();
              }}
            >
              Archive course
            </ActionButton>
          )}
        </div>
        {can("publish") && revision.state === "in_review" && (
          <>
            <label className="block text-sm">
              Review notes
              <textarea
                className={`${inputClass} mt-2`}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </label>
            <ActionButton action={() => act("review_revision")}>
              Return for changes
            </ActionButton>
          </>
        )}
      </StaffPanel>
      <RevisionHistory
        revisionId={revision.id}
        locked={locked}
        restore={(document) => {
          setDoc(document);
          setSelection([0, 0]);
        }}
      />
    </>
  );
}
function RevisionHistory({
  revisionId,
  locked,
  restore,
}: {
  revisionId: string;
  locked: boolean;
  restore: (doc: Document) => void;
}) {
  const { tenant } = useTenant();
  const [rows, setRows] = useState<
    { version: number; document: Document; created_at: string }[]
  >([]);
  const [loaded, setLoaded] = useState(false);
  return (
    <StaffPanel
      title="Version history"
      description="Saved revisions can be restored into this draft. Restoring does not change the published course until it passes review."
    >
      <ActionButton
        action={async () => {
          const { data, error } = await supabase
            .from("cs_revision_history")
            .select("version,document,created_at")
            .eq("organization_id", tenant!.id)
            .eq("revision_id", revisionId)
            .order("version", { ascending: false })
            .limit(30);
          if (error) throw error;
          setRows(data ?? []);
          setLoaded(true);
        }}
      >
        Load saved versions
      </ActionButton>
      {rows.map((r) => (
        <div
          key={r.version}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4"
        >
          <p className="text-sm">
            Version {r.version} · {new Date(r.created_at).toLocaleString()}
            <span className="block text-xs text-muted">{r.document.title}</span>
          </p>
          {!locked && (
            <button
              className="min-h-11 text-sm font-semibold text-brand"
              onClick={() => {
                if (
                  window.confirm("Restore this saved version into your draft?")
                )
                  restore(r.document);
              }}
            >
              Restore into draft
            </button>
          )}
        </div>
      ))}
      {loaded && !rows.length && (
        <Empty>No earlier saved versions for this draft.</Empty>
      )}
    </StaffPanel>
  );
}
function MediaLibrary({
  courseId,
  onUse,
  locked,
}: {
  courseId: string;
  onUse: (asset: Media, kind: string) => void;
  locked: boolean;
}) {
  const { tenant } = useTenant();
  const all = useSchoolRows<Media & { course_id: string }>("cs_media_assets");
  const assets = all.rows.filter((a) => a.course_id === courseId);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [alt, setAlt] = useState("");
  const uploadRef = useRef<Upload | null>(null);
  const [paused, setPaused] = useState(false);
  useEffect(
    () => () => {
      void uploadRef.current?.abort();
    },
    [],
  );
  const uploadFile = async (file: File) => {
    setError("");
    setProgress(0);
    setPaused(false);
    try {
      const mime = file.name.toLowerCase().endsWith(".vtt")
        ? "text/vtt"
        : file.type;
      const { data: asset, error: registerError } = await supabase.rpc(
        "cs_media_register",
        {
          p_org: tenant!.id,
          p_course: courseId,
          p_name: file.name,
          p_mime: mime,
          p_bytes: file.size,
          p_alt: alt,
        },
      );
      if (registerError) throw registerError;
      const { data: session } = await supabase.auth.getSession();
      const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const endpoint =
        projectUrl.replace(".supabase.co", ".storage.supabase.co") +
        "/storage/v1/upload/resumable";
      const upload = new Upload(file, {
        endpoint,
        headers: {
          authorization: `Bearer ${session.session?.access_token}`,
          "x-upsert": "false",
        },
        metadata: {
          bucketName: "cs-school-media",
          objectName: asset.path,
          contentType: mime,
          cacheControl: "3600",
        },
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        onBeforeRequest: async (req) => {
          const { data } = await supabase.auth.getSession();
          req.setHeader(
            "authorization",
            `Bearer ${data.session?.access_token}`,
          );
        },
        onProgress: (sent, total) =>
          setProgress(Math.round((sent / total) * 100)),
        onError: (e) => {
          setError(e.message);
          setPaused(true);
        },
        onSuccess: () => {
          void (async () => {
            const { error: completeError } = await supabase.rpc(
              "cs_media_complete",
              { p_org: tenant!.id, p_id: asset.id },
            );
            if (completeError) throw completeError;
            setProgress(null);
            uploadRef.current = null;
            await all.refresh();
          })().catch((e) => setError(e.message));
        },
      });
      uploadRef.current = upload;
      upload.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload could not start.");
      setProgress(null);
    }
  };
  return (
    <StaffPanel
      title="Private media library"
      description="Upload MP4/WebM video, VTT captions, images, PDFs and Office templates. Large uploads support pause and resume in this tab. Files remain private and are only available to learners when referenced in published content."
    >
      {error && <Notice error>{error}</Notice>}
      {all.error && <Notice error>{all.error}</Notice>}
      <label className="block text-sm">
        Accessible image description (required for images)
        <input
          className={`${inputClass} mt-2`}
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        Upload file
        <input
          type="file"
          disabled={locked || progress !== null}
          accept=".mp4,.webm,.mp3,.vtt,.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx"
          className={`${inputClass} mt-2`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
      </label>
      {progress !== null && (
        <div className="space-y-2">
          <progress
            className="w-full accent-brand"
            value={progress}
            max={100}
            aria-label="Upload progress"
          />
          <p className="text-sm">
            {progress}% uploaded{" "}
            <button
              className="ml-3 min-h-10 underline"
              onClick={() => {
                if (paused) {
                  uploadRef.current?.start();
                  setPaused(false);
                } else {
                  void uploadRef.current?.abort();
                  setPaused(true);
                }
              }}
            >
              {paused ? "Resume upload" : "Pause upload"}
            </button>
          </p>
        </div>
      )}
      {assets.map((a) => (
        <div
          key={a.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"
        >
          <p className="break-all text-sm">
            {a.name}
            <span className="block text-xs text-muted">
              {a.status} · {a.mime_type}
            </span>
          </p>
          {a.status === "ready" && !locked && (
            <button
              className="min-h-11 rounded-full bg-subtle px-4 text-xs font-semibold"
              onClick={() =>
                onUse(
                  a,
                  a.mime_type.startsWith("video/")
                    ? "video"
                    : a.mime_type === "text/vtt"
                      ? "captions"
                      : "resource",
                )
              }
            >
              Attach to lesson
            </button>
          )}
        </div>
      ))}
    </StaffPanel>
  );
}
