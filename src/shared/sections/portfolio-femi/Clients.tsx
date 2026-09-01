import Marquee from "react-fast-marquee";
import { CLIENTS } from "@/shared/portfolio/portfolioData";

const STAR = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M8 0L9.8 6.2L16 8L9.8 9.8L8 16L6.2 9.8L0 8L6.2 6.2L8 0Z" fill="currentColor" />
    </svg>
);

/** Where the work has happened — a quiet ticker of names between the hero and
 *  the story. Duplicated inline so the strip reads as texture, not a claim. */
export default function Clients() {
    return (
        <section className="pf-clients bg-neutral-950 text-white pt-40 pb-40" aria-label="Selected clients and teams">
            <p className="pf-clients__label text-center mb-20">Trusted across SaaS, health, enterprise &amp; energy</p>
            <Marquee speed={40} gradient={false} pauseOnHover autoFill>
                {CLIENTS.map((name) => (
                    <span key={name} className="pf-clients__item">
                        {name}
                        <span className="pf-clients__star">{STAR}</span>
                    </span>
                ))}
            </Marquee>
        </section>
    );
}
