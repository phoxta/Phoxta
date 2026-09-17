import { useId, type ReactElement } from "react";
import { cn } from "@/lib/cn";

/**
 * Ten line drawings of family life, for the places where a screen needs a
 * picture rather than another card: an empty module, an onboarding step, the
 * head of a ritual, a marketing panel.
 *
 * They are drawn to one discipline so that a page carrying three of them looks
 * like one hand made all three:
 *
 *  · One canvas, 480 x 360, with everything held inside x 40-440 / y 55-310 so
 *    nothing crowds an edge and the drawings crop alike.
 *  · Two stroke weights and no more — 1.5 for the world a thing sits in, 2.5
 *    for the thing itself. Weight, not colour, is what carries the subject.
 *  · Colour is almost absent: structure is `currentColor` held back to
 *    .28-.45, the subject is `currentColor` at full, and exactly one element
 *    per drawing takes the brand, over at most one soft brand-tinted ground.
 *    So an illustration takes the ink colour of whatever it is dropped into —
 *    `text-ink`, `text-muted`, white on olive — and still reads.
 *  · No text, no gradients, no shadows, nothing that needs a raster fallback.
 *
 * People are drawn as heads and shoulders: generous, rounded, unhurried, with
 * no faces. Faces would make this one particular family; without them the
 * Adeyemis' drawings can belong to whoever is using the app.
 *
 * Motion lives in `styles/illustration.css`. Every animated element here
 * carries exactly one `wf-ill__*` class, because a second class setting the
 * `animation` shorthand would silently cancel the first — where a shape needs
 * both a static transform and a moving one, the moving one goes on a wrapping
 * <g> (see the coin in `provide` and the top photograph in `remember`).
 * `wf-ill__draw` marks the strokes that draw themselves in when an ancestor
 * says `data-shown="true"`; those paths carry `pathLength="1"` so the entrance
 * is the same length of travel whatever the path's real geometry.
 */

export type IllustrationName =
    | "gather"
    | "plan"
    | "learn"
    | "pray"
    | "home"
    | "grow"
    | "provide"
    | "journey"
    | "remember"
    | "create";

/** The drawings themselves. Geometry is hand-placed; nothing here is generated. */
const DRAWINGS: Record<IllustrationName, ReactElement> = {
    /**
     * Four round a table with one dish between them: two parents, two children,
     * shoulders ending on the table's far rim so nobody floats.
     * Moves: the shared dish keeps a slow warmth.
     */
    gather: (
        <>
            <ellipse className="wf-ill__ground" cx={240} cy={232} rx={150} ry={42} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <ellipse cx={240} cy={232} rx={150} ry={42} />
                <path d="M90 240c0 23 67 42 150 42s150-19 150-42" />
                <ellipse cx={150} cy={230} rx={18} ry={6} strokeOpacity={0.3} />
                <ellipse cx={206} cy={224} rx={15} ry={5} strokeOpacity={0.3} />
                <ellipse cx={276} cy={224} rx={15} ry={5} strokeOpacity={0.3} />
                <ellipse cx={330} cy={230} rx={18} ry={6} strokeOpacity={0.3} />
                <ellipse cx={240} cy={246} rx={25} ry={8} strokeOpacity={0.3} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <circle className="wf-ill__draw" pathLength={1} cx={140} cy={146} r={22} />
                <path className="wf-ill__draw" pathLength={1} d="M104 214c0-26 16-46 36-46s36 14 36 26" />
                <circle className="wf-ill__draw" pathLength={1} cx={210} cy={152} r={16} />
                <path className="wf-ill__draw" pathLength={1} d="M184 193c0-14 12-25 26-25s26 9 26 22" />
                <circle className="wf-ill__draw" pathLength={1} cx={272} cy={153} r={14} />
                <path className="wf-ill__draw" pathLength={1} d="M248 190c0-13 11-23 24-23s24 9 24 26" />
                <circle className="wf-ill__draw" pathLength={1} cx={340} cy={146} r={22} />
                <path className="wf-ill__draw" pathLength={1} d="M376 214c0-26-16-46-36-46s-36 14-36 26" />
            </g>
            <ellipse className="wf-ill__dish" cx={240} cy={246} rx={38} ry={13} stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * A week stood up as seven day cards on one baseline, a few things placed on
     * them, and Wednesday — the brief's demo day — carrying three and the mark.
     * Moves: the today ring breathes.
     */
    plan: (
        <>
            <rect className="wf-ill__ground" x={218} y={112} width={44} height={158} rx={8} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M46 270h388" />
                <rect x={56} y={130} width={44} height={140} rx={8} />
                <rect x={110} y={130} width={44} height={140} rx={8} />
                <rect x={164} y={130} width={44} height={140} rx={8} />
                <rect x={218} y={112} width={44} height={158} rx={8} />
                <rect x={272} y={130} width={44} height={140} rx={8} />
                <rect x={326} y={130} width={44} height={140} rx={8} />
                <rect x={380} y={130} width={44} height={140} rx={8} />
                <path d="M64 148h28M118 148h28M172 148h28M280 148h28M334 148h28M388 148h28" strokeOpacity={0.28} />
                <rect x={172} y={192} width={28} height={12} rx={6} strokeOpacity={0.28} />
                <rect x={334} y={172} width={28} height={12} rx={6} strokeOpacity={0.28} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <rect className="wf-ill__draw" pathLength={1} x={64} y={172} width={28} height={12} rx={6} />
                <rect className="wf-ill__draw" pathLength={1} x={118} y={172} width={28} height={12} rx={6} />
                <rect className="wf-ill__draw" pathLength={1} x={118} y={192} width={28} height={12} rx={6} />
                <rect className="wf-ill__draw" pathLength={1} x={226} y={154} width={28} height={12} rx={6} />
                <rect className="wf-ill__draw" pathLength={1} x={226} y={174} width={28} height={12} rx={6} />
                <rect className="wf-ill__draw" pathLength={1} x={226} y={194} width={28} height={12} rx={6} />
                <rect className="wf-ill__draw" pathLength={1} x={280} y={172} width={28} height={12} rx={6} />
                <rect className="wf-ill__draw" pathLength={1} x={388} y={192} width={28} height={12} rx={6} />
            </g>
            <circle className="wf-ill__today" cx={240} cy={132} r={8} stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * A child and an adult behind an open book, the adult's arm reaching to the
     * page. Moves: a line of reading travels under the words.
     */
    learn: (
        <>
            <ellipse className="wf-ill__ground" cx={240} cy={266} rx={122} ry={18} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M70 266h340" />
                <path d="M170 224h50M168 232h54M170 240h48M172 248h44" strokeOpacity={0.3} />
                <path d="M260 224h50M262 232h46M266 248h40" strokeOpacity={0.3} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <path className="wf-ill__draw" pathLength={1} d="M240 228c-24-14-56-18-92-12v30c36-6 68-2 92 12z" />
                <path className="wf-ill__draw" pathLength={1} d="M240 228c24-14 56-18 92-12v30c-36-6-68-2-92 12z" />
                <circle className="wf-ill__draw" pathLength={1} cx={168} cy={152} r={18} />
                <path className="wf-ill__draw" pathLength={1} d="M136 206c0-18 14-32 32-32s32 14 32 32" />
                <circle className="wf-ill__draw" pathLength={1} cx={326} cy={124} r={21} />
                <path className="wf-ill__draw" pathLength={1} d="M288 186c0-21 17-38 38-38s38 17 38 38" />
                <path className="wf-ill__draw" pathLength={1} d="M296 182c-13 11-24 23-30 36" />
            </g>
            <path className="wf-ill__read" pathLength={1} d="M260 240h50" stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * Two hands together, an open book set down beside them, a candle throwing a
     * ring of light. Moves: the flame breathes from its base.
     */
    pray: (
        <>
            <circle className="wf-ill__ground" cx={347} cy={176} r={56} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M56 278h368" />
                <path d="M108 252c-20-10-42-14-58-11l-4 22c22-4 44 0 62 11z" />
                <path d="M108 252c20-10 42-14 58-11l4 22c-22-4-44 0-62 11z" />
                <path d="M108 252v22" strokeOpacity={0.28} />
                <path d="M62 250h34M60 258h38M120 250h34M120 258h38" strokeOpacity={0.28} />
                <path d="M222 172c3 14 4 30 4 44M232 176c2 12 3 22 3 34" strokeOpacity={0.4} />
                <path d="M186 246c16 7 38 7 54 0" strokeOpacity={0.45} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <path className="wf-ill__draw" pathLength={1} d="M188 274c-7-28-9-58-5-82 2-15 9-26 17-32a10 10 0 0 1 15 7c0 13-1 28-2 44" />
                <path className="wf-ill__draw" pathLength={1} d="M214 274c-7-28-9-58-5-82 2-15 9-26 17-32a10 10 0 0 1 16 8c0 28-4 74-2 106z" />
                <path className="wf-ill__draw" pathLength={1} d="M332 278v-78c0-6 6-10 15-10s15 4 15 10v78" />
            </g>
            <path className="wf-ill__flame" d="M347 150c10 10 14 18 14 26 0 8-6 14-14 14s-14-6-14-14c0-8 4-16 14-26z" stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * The house at dusk with one window lit, a tree, and a path to the door.
     * Moves: smoke lifts off the chimney.
     */
    home: (
        <>
            <ellipse className="wf-ill__ground" cx={240} cy={290} rx={72} ry={14} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M48 272h384" />
                <path d="M108 180h264" />
                <rect x={146} y={200} width={42} height={40} rx={4} />
                <path d="M167 200v40M146 220h42" strokeOpacity={0.28} />
                <circle cx={240} cy={146} r={14} />
                <circle cx={256} cy={240} r={3} strokeOpacity={0.45} />
                <path d="M212 272l-22 32M268 272l22 32" strokeOpacity={0.3} />
                <path d="M198 290h84" strokeOpacity={0.28} />
                <path d="M86 214c14 0 24 10 24 22 0 8-4 15-11 19-3 6-9 9-15 9-9 0-17-5-20-13-6-4-10-10-10-17 0-12 9-20 20-20z" strokeOpacity={0.3} />
                <path d="M84 262v10" strokeOpacity={0.3} />
                <path d="M392 272c4-8 6-12 6-18M404 272c3-6 4-10 4-14" strokeOpacity={0.28} />
                <path className="wf-ill__smoke" d="M314 102c-9-8 5-16-3-25s6-10-1-14" strokeOpacity={0.45} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <path className="wf-ill__draw" pathLength={1} d="M120 272V174l120-70 120 70v98" />
                <path className="wf-ill__draw" pathLength={1} d="M212 272v-58c0-15 12.5-28 28-28s28 13 28 28v58" />
                <path className="wf-ill__draw" pathLength={1} d="M302 138v-30h24v48" />
                <rect className="wf-ill__draw" pathLength={1} x={292} y={200} width={42} height={40} rx={4} stroke="var(--color-brand)" />
            </g>
        </>
    ),
    /**
     * A seedling with a younger one behind it, measured against a rule that marks
     * where it has got to. Moves: the rule's gradations climb.
     */
    grow: (
        <>
            <rect className="wf-ill__ground" x={102} y={268} width={276} height={32} rx={12} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M84 268h312" />
                <path d="M284 240h18M284 208h18M284 144h18" />
                <path d="M292 224h10M292 192h10M292 160h10" strokeOpacity={0.28} />
                <path d="M136 268c0-16 1-27 3-35" strokeOpacity={0.3} />
                <path d="M139 244c8-3 18-2 22-8-7-6-18-2-22 8z" strokeOpacity={0.3} />
                <path d="M137 254c-8-3-18-2-22-8 7-6 18-2 22 8z" strokeOpacity={0.3} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <path className="wf-ill__draw" pathLength={1} d="M228 268c0-40 2-72 6-100" />
                <path className="wf-ill__draw" pathLength={1} d="M232 208c14-6 34-4 42-16-14-10-34-4-42 16z" />
                <path className="wf-ill__draw" pathLength={1} d="M230 236c-14-6-34-4-42-16 14-10 34-4 42 16z" />
                <path className="wf-ill__draw" pathLength={1} d="M240 168h62" />
                <path className="wf-ill__rule" pathLength={1} d="M302 272V134" />
            </g>
            <path className="wf-ill__draw" pathLength={1} d="M234 168c0-18 7-31 18-38 4 13 0 29-18 38z" stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * The household jar with a coin held over it, an envelope, and a line going
     * the right way. Moves: the coin hangs, not yet let go.
     */
    provide: (
        <>
            <ellipse className="wf-ill__ground" cx={150} cy={294} rx={86} ry={14} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M56 294h368" />
                <path d="M244 104v98h168" strokeOpacity={0.28} />
                <ellipse cx={134} cy={268} rx={16} ry={5.5} />
                <ellipse cx={158} cy={252} rx={16} ry={5.5} />
                <ellipse cx={142} cy={236} rx={16} ry={5.5} />
                <rect x={226} y={230} width={92} height={64} rx={6} />
                <path d="M226 236l46 32 46-32" />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <path className="wf-ill__draw" pathLength={1} d="M114 196v-6h72v6" />
                <path className="wf-ill__draw" pathLength={1} d="M118 196c-8 6-12 14-12 24v56c0 10 8 18 18 18h52c10 0 18-8 18-18v-56c0-10-4-18-12-24" />
                <g className="wf-ill__coin">
                    <ellipse cx={150} cy={158} rx={18} ry={6.5} transform="rotate(-16 150 158)" />
                </g>
            </g>
            <path className="wf-ill__draw" pathLength={1} d="M252 194C282 186 298 164 324 160S368 138 398 116M384 118L398 116L392 129" stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * A packed case, a route, and somewhere to arrive.
     * Moves: the route runs towards the marker.
     */
    journey: (
        <>
            <ellipse className="wf-ill__ground" cx={128} cy={294} rx={84} ry={14} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M48 288h384" />
                <path d="M72 240h112" strokeOpacity={0.4} />
                <circle cx={104} cy={262} r={10} strokeOpacity={0.3} />
                <rect x={132} y={256} width={30} height={14} rx={5} strokeOpacity={0.3} />
                <circle cx={392} cy={100} r={8} />
                <circle cx={196} cy={250} r={6} strokeOpacity={0.4} />
                <path d="M92 130c-10 0-18-7-18-16s8-16 18-16c2-11 12-19 24-19s22 8 24 19c9 1 16 8 16 16s-8 16-18 16z" strokeOpacity={0.28} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <path className="wf-ill__draw" pathLength={1} d="M72 214a10 10 0 0 1 10-10h92a10 10 0 0 1 10 10v64a10 10 0 0 1-10 10H82a10 10 0 0 1-10-10z" />
                <path className="wf-ill__draw" pathLength={1} d="M112 204v-12c0-7 5-12 12-12h20c7 0 12 5 12 12v12" />
                <path className="wf-ill__draw" pathLength={1} d="M392 140c14-18 22-28 22-40a22 22 0 1 0-44 0c0 12 8 22 22 40z" />
            </g>
            <path className="wf-ill__route" pathLength={1} d="M196 250c54 0 62-56 104-72s66-20 92-38" stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * Photographs laid out on a table with a pressed leaf kept among them.
     * Moves: the top photograph sits a little proud, as though just picked up.
     */
    remember: (
        <>
            <ellipse className="wf-ill__ground" cx={248} cy={288} rx={150} ry={18} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <path d="M64 288h368" strokeOpacity={0.28} />
                <g transform="rotate(-7 167 171)">
                    <path d="M112 206h110" strokeOpacity={0.3} />
                    <path d="M124 196c14-20 26-20 38-6s26 4 46-16" strokeOpacity={0.3} />
                </g>
                <g transform="rotate(4 262 164)">
                    <path d="M204 206h116" strokeOpacity={0.3} />
                    <circle cx={240} cy={160} r={10} strokeOpacity={0.3} />
                    <circle cx={272} cy={154} r={12} strokeOpacity={0.3} />
                    <path d="M224 192c0-9 7-16 16-16s16 7 16 16" strokeOpacity={0.3} />
                    <path d="M254 192c0-10 8-18 18-18s18 8 18 18" strokeOpacity={0.3} />
                </g>
                <g transform="rotate(9 351 189)">
                    <path d="M300 222h102" strokeOpacity={0.3} />
                    <path d="M310 210c18-16 32-14 42-4s24 6 32-6" strokeOpacity={0.3} />
                </g>
                <path d="M126 292c6-20 16-38 26-52" strokeOpacity={0.4} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <g transform="rotate(-7 167 171)">
                    <rect className="wf-ill__draw" pathLength={1} x={112} y={112} width={110} height={118} rx={6} />
                </g>
                <g transform="rotate(9 351 189)">
                    <rect className="wf-ill__draw" pathLength={1} x={300} y={132} width={102} height={114} rx={6} />
                </g>
                <g className="wf-ill__photo">
                    <g transform="rotate(4 262 164)">
                        <rect className="wf-ill__draw" pathLength={1} x={204} y={100} width={116} height={128} rx={6} />
                    </g>
                </g>
            </g>
            <path className="wf-ill__draw" pathLength={1} d="M126 292c-8-22 4-44 26-52 8 22-4 44-26 52z" stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
    /**
     * Two sheets of paper, a brush, and the mark it is making.
     * Moves: the stroke lays itself down again and again.
     */
    create: (
        <>
            <ellipse className="wf-ill__ground" cx={236} cy={292} rx={150} ry={13} fill="var(--color-brand)" opacity={0.12} />
            <g className="wf-ill__frame" stroke="currentColor" strokeWidth={1.5} strokeOpacity={0.35}>
                <g transform="rotate(3 234 192)">
                    <rect x={144} y={98} width={196} height={176} rx={4} strokeOpacity={0.28} />
                </g>
                <g transform="rotate(-4 234 192)">
                    <rect x={136} y={104} width={196} height={176} rx={4} strokeOpacity={0.4} />
                    <path d="M136 148h196M136 236h196" strokeOpacity={0.28} />
                </g>
                <path d="M313 167l14 12M321 158l14 12" strokeOpacity={0.4} />
            </g>
            <g stroke="currentColor" strokeWidth={2.5}>
                <path className="wf-ill__draw" pathLength={1} d="M306 180c-14 8-22 20-22 32 16-4 26-14 30-26z" />
                <path className="wf-ill__draw" pathLength={1} d="M310 184l58-66" />
            </g>
            <path className="wf-ill__stroke" pathLength={1} d="M234 202a10 10 0 0 1 10 10 20 20 0 0 1-20 20 30 30 0 0 1-30-30 40 40 0 0 1 40-40 50 50 0 0 1 50 50" stroke="var(--color-brand)" strokeWidth={2.5} />
        </>
    ),
};

export interface IllustrationProps {
    /** Which of the ten drawings to render. */
    name: IllustrationName;
    /**
     * The accessible name. Give one when the drawing carries meaning the
     * surrounding copy does not; leave it off when the drawing is decoration
     * beside a heading that already says the same thing, and it is hidden
     * from assistive technology instead of read out twice.
     */
    title?: string;
    className?: string;
}

export function Illustration({ name, title, className }: IllustrationProps) {
    // React 19's useId() returns something like «r3», and the guillemets are
    // not valid in an id — or in the IDREF that aria-labelledby has to match.
    const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
    const titleId = `wf-ill-${uid}`;

    return (
        <svg
            viewBox="0 0 480 360"
            width="100%"
            fill="none"
            preserveAspectRatio="xMidYMid meet"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("wf-ill", className)}
            {...(title ? { role: "img", "aria-labelledby": titleId } : { role: "presentation", "aria-hidden": true })}
        >
            {title ? <title id={titleId}>{title}</title> : null}
            {DRAWINGS[name]}
        </svg>
    );
}
