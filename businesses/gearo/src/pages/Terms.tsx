import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { resolveTenant, fetchCms } from "@/lib/phoxta";

/**
 * Terms of use — real content, not a placeholder.
 *
 * The body comes from this tenant's own `cms_pages` row (slug `terms`), which
 * the owner edits in the operating console. Every business gets one seeded, and
 * the table is publicly readable for published rows, so this needs no auth.
 *
 * A legal page must never render an empty shell: if the fetch fails or the row
 * is missing, the reader is told plainly and pointed at a human.
 */
export default function Terms() {
  const [page, setPage] = useState<{ title: string; body: string } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const tenant = await resolveTenant();
        if (!tenant) { if (active) setState("missing"); return; }
        const p = await fetchCms(tenant.id, "terms");
        if (!active) return;
        if (p) { setPage(p); setState("ready"); } else setState("missing");
      } catch {
        if (active) setState("missing");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Layout>
      <section className="flat-spacing-2">
        <div className="container" style={{ maxWidth: 820 }}>
          {state === "loading" && <p>Loading…</p>}

          {state === "ready" && page && (
            <>
              <h2 className="mb-4">{page.title}</h2>
              {/* Plain text from the CMS: rendered as paragraphs, never as HTML,
                  so nothing in the body can inject markup into the page. */}
              {page.body.split(/\n{2,}/).map((para, i) => (
                <p key={i} style={{ lineHeight: 1.7 }}>{para}</p>
              ))}
            </>
          )}

          {state === "missing" && (
            <>
              <h2 className="mb-3">Terms of Use</h2>
              <p style={{ lineHeight: 1.7 }}>
                Our terms are not published here yet. Please contact us and we will send them to you before you order.
              </p>
              <a className="btn btn-dark" href="/contact">Contact us</a>
            </>
          )}
        </div>
      </section>
    </Layout>
  );
}
