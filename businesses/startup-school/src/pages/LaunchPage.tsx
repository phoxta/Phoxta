import { ArrowUpRight, Building2, Network } from "lucide-react";
import { Button, Card } from "@/components/ui/primitives";
import { PageTitle } from "@/components/shell/AppShell";
import { Link } from "react-router-dom";

/** A deliberate handoff, not a fake marketplace duplicated inside the school. */
export default function LaunchPage() {
    return (
        <>
            <Link to="/programme" className="mb-5 inline-flex min-h-12 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white">Manage your business selection & investor introductions →</Link>
            <PageTitle title="Launch network" sub="Your Launch access connects the coursework to the people and operating business behind the next step." />
            <div className="grid gap-5 lg:grid-cols-2">
                <Card className="border border-brand/20 bg-brand-soft/35"><span className="grid size-11 place-items-center rounded-full bg-card text-brand"><Network size={21} /></span><h2 className="mt-4 text-[19px] font-semibold">Investor network</h2><p className="mt-2 text-[14px] leading-6 text-muted">Prepare the evidence, narrative and data room in Startup School. The Phoxta team then coordinates appropriate investor-network access when your venture is ready for a conversation.</p><a href="https://www.phoxta.com/contact" className="mt-5 inline-flex"><Button>Request a launch conversation <ArrowUpRight size={15} /></Button></a></Card>
                <Card><span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand"><Building2 size={21} /></span><h2 className="mt-4 text-[19px] font-semibold">Choose a provisioned business</h2><p className="mt-2 text-[14px] leading-6 text-muted">Explore the businesses Phoxta has prepared to own and launch. Your Launch admission includes a guided selection and handover; availability is confirmed with the team before a business is assigned.</p><a href="https://www.phoxta.com/businesses" className="mt-5 inline-flex"><Button variant="outline">Browse provisioned businesses <ArrowUpRight size={15} /></Button></a></Card>
            </div>
        </>
    );
}
