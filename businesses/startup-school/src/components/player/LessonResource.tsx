import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Private URLs are resolved with the viewer's session and storage RLS, never a
 * service key. A Markdown link cannot inject HTML or an executable URL. */
export function LessonResource({ url, label, image = false }: { url: string; label: string; image?: boolean }) {
    const [resolved, setResolved] = useState<string | null>(null);
    useEffect(() => {
        let active = true; setResolved(null);
        if (url.startsWith("school-media:")) {
            void supabase.storage.from("cs-school-media").createSignedUrl(url.slice("school-media:".length), 3600).then(({ data }) => { if (active) setResolved(data?.signedUrl ?? null); });
        } else if (/^https:\/\//i.test(url)) setResolved(url);
        return () => { active = false; };
    }, [url]);
    if (!resolved) return <span className="text-sm text-muted">{label} (resource unavailable or loading)</span>;
    return image ? <img src={resolved} alt={label} loading="lazy" className="my-5 h-auto max-h-[480px] w-full rounded-xl object-contain" /> : <a href={resolved} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-4">{label}</a>;
}
