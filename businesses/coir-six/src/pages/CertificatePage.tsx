import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { longDate } from "@/lib/format";
import { courseMinutes } from "@/lib/derive";
import { useData } from "@/state/data";
import { Button, EmptyState, Sparkle } from "@/components/ui/primitives";

/** A certificate that prints cleanly — the paper version of finishing. */
export default function CertificatePage() {
    const { id } = useParams();
    const { catalogue, user } = useData();
    const cert = user.certificates.find((c) => c.id === id);
    const course = cert && catalogue.courses.find((c) => c.id === cert.courseId);
    if (!cert || !course) return <EmptyState title="Certificate not found" action={<Link to="/progress" className="font-semibold text-brand underline">Your progress</Link>} />;
    const mentor = catalogue.mentors.find((m) => m.id === course.mentorId);
    return (
        <>
            <div className="mb-4 flex items-center gap-3 print:hidden">
                <Link to="/progress" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
                    <ArrowLeft size={14} /> Progress
                </Link>
                <Button size="md" variant="outline" className="ml-auto" onClick={() => window.print()}>
                    <Printer size={14} /> Print or save as PDF
                </Button>
            </div>
            <article className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-line bg-card p-10 max-md:p-6 print:border-0 print:shadow-none" aria-label="Certificate of completion">
                <Sparkle className="absolute -right-10 -top-14 w-56 opacity-10" fill="#6C5DD3" />
                <div className="flex items-center gap-2.5 text-[18px] font-semibold">
                    <span className="grid size-7 place-items-center rounded-full bg-brand"><Sparkle className="w-3.5" /></span> Coir Six
                </div>
                <p className="mt-10 text-[12px] font-semibold tracking-[0.14em] text-brand">CERTIFICATE OF COMPLETION</p>
                <p className="mt-6 text-[15px] text-muted">This certifies that</p>
                <h1 className="mt-1 text-[34px] font-semibold leading-tight">{user.profile.name}</h1>
                <p className="mt-6 text-[15px] text-muted">has completed every lesson of</p>
                <h2 className="mt-1 max-w-xl text-[22px] font-semibold leading-8">{course.title}</h2>
                <p className="mt-2 text-[14px] text-muted">
                    {course.level} · {Math.round(courseMinutes(catalogue, course.id) / 60 * 10) / 10} hours · taught by {mentor?.name}
                </p>
                <div className="mt-10 flex flex-wrap items-end gap-8 border-t border-line pt-6 text-[13px] text-muted">
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] text-caption">Issued</div>
                        <div className="mt-0.5 text-ink">{longDate(cert.issuedAt)}</div>
                    </div>
                    <div>
                        <div className="text-[11px] uppercase tracking-[0.08em] text-caption">Certificate ID</div>
                        <div className="mt-0.5 font-mono text-ink">{cert.code}</div>
                    </div>
                    <div className="ml-auto text-right">
                        <div className="text-[16px] font-semibold text-ink">{mentor?.name}</div>
                        <div>{mentor?.role}</div>
                    </div>
                </div>
            </article>
        </>
    );
}
