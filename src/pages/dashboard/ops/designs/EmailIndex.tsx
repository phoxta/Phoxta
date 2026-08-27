import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, Chip, Empty } from "@/components/dash/Ui";
import { toast, toastError, confirmDanger } from "@/lib/ops/feedback";
import {
  type EmailSummary, type EmailTemplate, deleteEmail, emailFromPost, getEmail, listEmails,
} from "@/lib/db/emailStudio";
import { listPlatformPosts, type PlatformPost } from "@/lib/db/platformPosts";
import { EmailComposer } from "./EmailComposer";

/**
 * Everything the studio can send, and the three ways to start one.
 *
 * From scratch, from a blog post, or from an empty campaign. The post route is
 * the one worth having: it pulls the published article in as EDITABLE blocks
 * rather than rendering it straight out, so a note can go at the top and a
 * section can come out before it goes. That difference is the whole distance
 * between a newsletter somebody wrote and an RSS relay.
 */

type Draft = Omit<EmailTemplate, "id" | "status" | "updated_at"> & { id?: string };

const BLANK: Draft = {
  name: "Untitled email",
  kind: "campaign",
  subject: "",
  preheader: "",
  strap: "Phoxta",
  footnote: "",
  blocks: [],
  source_slug: null,
};

export function EmailIndex({ orgId }: { orgId: string }) {
  const [rows, setRows] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Draft | null>(null);
  const [pickingPost, setPickingPost] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    const { data, error } = await listEmails();
    if (error) toastError(error);
    setRows(data?.templates ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Arriving from the blog console's "Send as email": open the post straight
  // into the composer, and drop the parameters so a refresh does not reopen a
  // second copy over unsaved work.
  useEffect(() => {
    if (params.get("email") !== "post") return;
    const slug = params.get("slug");
    setParams(new URLSearchParams(), { replace: true });
    if (!slug) return;
    void (async () => {
      const { data, error } = await emailFromPost(slug);
      if (error || !data) return toastError(error ?? "Could not read that post.");
      setOpen({ ...data.template } as Draft);
    })();
  }, [params, setParams]);

  if (open) {
    return (
      <EmailComposer
        orgId={orgId}
        initial={open}
        onSaved={() => void load()}
        onClose={() => { setOpen(null); void load(); }}
      />
    );
  }

  return (
    <>
      <Card title="Start one" right={
        <div className="d-flex gap-2">
          <button type="button" className="hrx-seeall" onClick={() => setPickingPost(true)}>
            From a blog post
          </button>
          <button type="button" className="hrx-seeall opx-solid" onClick={() => setOpen({ ...BLANK })}>
            New email
          </button>
        </div>
      }>
        <p className="opx-note">
          Emails are stored as blocks, not as HTML, and rendered by the same template the platform sends
          through — so what is on screen here is what lands, and a saved email picks up every later fix to
          the layout without being reopened.
        </p>
      </Card>

      <Card title="Your emails">
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty title="Nothing here yet">
            Start a new email, or pull in a blog post and send the post itself rather than a link to it.
          </Empty>
        ) : (
          <div className="emx-tabs">
            {rows.map((r) => (
              <div key={r.id} className="emc__card">
                <button
                  type="button"
                  className="emc__cardMain"
                  onClick={async () => {
                    const { data, error } = await getEmail(r.id);
                    if (error || !data) return toastError(error ?? "Could not open it.");
                    setOpen(data.template);
                  }}
                >
                  <span className="emc__cardName">{r.name}</span>
                  <span className="emc__cardSub">{r.subject || "No subject yet"}</span>
                  <span className="emc__cardMeta">
                    <Chip tone="line">{r.kind}</Chip>
                    {r.status === "sent" && <Chip tone="line">sent</Chip>}
                    {new Date(r.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </button>
                <button
                  type="button"
                  className="hrx-seeall"
                  onClick={async () => {
                    if (!confirmDanger(`Delete “${r.name}”? It goes for good — anything already sent stays sent.`)) return;
                    const { error } = await deleteEmail(r.id);
                    if (error) return toastError(error);
                    toast("Deleted.");
                    void load();
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {pickingPost && (
        <PostPicker
          onClose={() => setPickingPost(false)}
          onPicked={async (slug) => {
            const { data, error } = await emailFromPost(slug);
            setPickingPost(false);
            if (error || !data) return toastError(error ?? "Could not read that post.");
            setOpen({ ...data.template } as Draft);
          }}
        />
      )}
      <style>{CSS}</style>
    </>
  );
}

function PostPicker({ onClose, onPicked }: { onClose: () => void; onPicked: (slug: string) => void }) {
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { posts, error } = await listPlatformPosts();
      if (error) toastError(error);
      setPosts(posts.filter((p) => p.status === "published"));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="emc__scrim" onClick={onClose}>
      <div className="emc__menu" onClick={(e) => e.stopPropagation()}>
        <h3>Send a post</h3>
        <p className="dsn-note">
          The whole post comes in as blocks you can edit — hero, standfirst, subheads, lists, tables and
          all. Only published posts are listed.
        </p>
        {loading ? (
          <p className="dsn-note">Loading…</p>
        ) : posts.length === 0 ? (
          <p className="dsn-note">
            No posts written in the console yet. The blog&apos;s built-in articles live in the code, so they
            are not here — write one under Platform → Blog and it will be.
          </p>
        ) : (
          <div className="emc__postList">
            {posts.map((p) => (
              <button key={p.id} type="button" className="emc__menuItem" onClick={() => onPicked(p.slug)}>
                <strong>{p.title}</strong>
                <span>{p.excerpt}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.emc__card{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--hrx-border);border-radius:12px;background:var(--hrx-card)}
.emc__cardMain{flex:1;text-align:left;background:none;border:0;padding:0;cursor:pointer;min-width:0}
.emc__cardName{display:block;font-size:14px;font-weight:600;color:var(--hrx-ink)}
.emc__cardSub{display:block;font-size:12.5px;color:var(--hrx-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.emc__cardMeta{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11.5px;color:var(--hrx-muted)}
.emc__postList{display:flex;flex-direction:column;gap:6px;margin-top:12px}
.emc__postList .emc__menuItem strong{display:block;font-size:13.5px}
.emc__postList .emc__menuItem span{display:block;font-size:12px;color:var(--hrx-muted);margin-top:2px}
`;
