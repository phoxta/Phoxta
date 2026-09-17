/**
 * Original line illustrations.
 *
 * Every product draws from one set of drawings, so the pages are illustrated
 * without seventeen bespoke art commissions. They are flat, two-weight line
 * drawings on a transparent ground: strokes take `currentColor`, the single
 * accent takes `var(--brand)`, so each product's set comes out in its own
 * colour without a second file.
 *
 * They are drawn at 480×360 and scale with their container.
 */
import { useId, type CSSProperties, type ReactNode } from 'react'

export type IllustrationName =
  /** Records arriving from several systems and landing in one place. */
  | 'ingest'
  /** One record going in, a decision coming out. */
  | 'score'
  /** A decision with its reasons written beside it. */
  | 'explain'
  /** A pile sorted: most cleared, a few sent to a person. */
  | 'queue'
  /** Something watched over time, and the moment it moves. */
  | 'watch'
  /** A boundary around the customer's own data. */
  | 'privacy'
  /** A record kept and stamped, so a decision can be defended later. */
  | 'audit'
  /** Systems plugged into each other. */
  | 'connect'
  /** People acting on what the product found. */
  | 'team'
  /** A result that arrives before anyone asks for it. */
  | 'alert'

export interface IllustrationProps {
  name: IllustrationName
  className?: string
  style?: CSSProperties
  /** Rendered as the accessible description. Omit on purely decorative use. */
  title?: string
}

/**
 * Only two weights exist in the set, and the fade of the supporting line work is
 * fixed here rather than per drawing — ten hand-drawn scenes drift apart fast if
 * every path picks its own grey.
 */
const thin = { strokeWidth: 1.5, opacity: 0.38 } as const
const faint = { strokeWidth: 1.5, opacity: 0.26 } as const
const bold = { strokeWidth: 2.5 } as const
/** The accent. Exactly one element per drawing wears it. */
const accent = { stroke: 'var(--brand)', strokeWidth: 2.5 } as const
/** The one soft shape a drawing may sit on, so the accent has somewhere to land. */
const ground = { fill: 'var(--brand)', opacity: 0.12, stroke: 'none' } as const

/**
 * The audit seal's serrated rim. Fourteen notches read as *pressed into the
 * page*; a plain ring reads as a badge, which is a different promise.
 */
const SEAL_RIM = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const p = (r: number) => `${(306 + Math.cos(a) * r).toFixed(1)} ${(242 + Math.sin(a) * r).toFixed(1)}`
  return `M${p(34)}L${p(41)}`
}).join('')

/** Drawn twice: once as the cable, once as the current running along it. */
const CABLE = 'M176 153c40 0 34 88 68 88 32 0 30-38 58-38'

const drawings: Record<IllustrationName, ReactNode> = {
  /* Three different systems on the left, one pile on the right. The curves are
     the drawing: they converge, which is the whole claim. */
  ingest: (
    <>
      <ellipse cx="352" cy="296" rx="86" ry="14" {...ground} />

      <path d="M44 80a34 12 0 1 0 68 0a34 12 0 1 0-68 0" {...thin} />
      <path d="M44 80v40c0 6.6 15.2 12 34 12s34-5.4 34-12V80" {...thin} />
      <path d="M44 100c0 6.6 15.2 12 34 12s34-5.4 34-12" {...faint} />

      <path d="M50 152h44l16 16v50a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8v-58a8 8 0 0 1 8-8Z" {...thin} />
      <path d="M94 152v16h16" {...faint} />
      <path d="M56 186h40M56 200h40M56 214h24" {...faint} />

      <rect x="44" y="256" width="76" height="56" rx="7" {...thin} />
      <path d="M44 274h76M82 274v38" {...faint} />

      <path className="il-flow il-d1" pathLength={1} d="M112 96C186 96 214 130 292 172" {...thin} opacity={0.45} />
      <path className="il-flow il-d2" pathLength={1} d="M112 183C182 183 226 178 292 180" {...thin} opacity={0.45} />
      <path className="il-flow il-d3" pathLength={1} d="M120 284C186 284 214 232 292 188" {...thin} opacity={0.45} />

      <rect x="292" y="258" width="120" height="26" rx="6" {...faint} />
      <rect x="298" y="230" width="112" height="26" rx="6" {...thin} />
      <path
        className="il-draw"
        pathLength={1}
        d="M293 202h114a7 7 0 0 1 7 7v12a7 7 0 0 1-7 7H293a7 7 0 0 1-7-7v-12a7 7 0 0 1 7-7Z"
        {...bold}
      />
      <g className="il-float">
        <rect className="il-pulse" x="296" y="164" width="112" height="26" rx="6" {...accent} />
      </g>
    </>
  ),

  /* Left to right on one line: the record, the model, the reading. The gauge is
     doing the work, so it is the only thing in the frame that moves by itself. */
  score: (
    <>
      <path d="M334 252a48 48 0 0 1 96 0Z" {...ground} />

      <g className="il-float">
        <path d="M46 140h72a8 8 0 0 1 8 8v80a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8v-80a8 8 0 0 1 8-8Z" {...thin} />
        <path d="M54 166h56M54 184h56M54 202h38" {...faint} />
      </g>

      <path className="il-flow il-d1" pathLength={1} d="M136 188h44" {...thin} opacity={0.45} />
      <path d="M176 182l7 6-7 6" {...thin} />

      <path
        className="il-draw"
        pathLength={1}
        d="M272.5 205.6 247.6 230.5 212.4 230.5 187.5 205.6 187.5 170.4 212.4 145.5 247.6 145.5 272.5 170.4Z"
        {...bold}
      />
      <circle cx="230" cy="188" r="14" {...thin} />
      <path d="M230 158v-9M230 218v9M202 188h-9M258 188h9" {...faint} />

      <path d="M320 252A62 62 0 0 1 444 252" {...thin} />
      <path d="M328 221l-8-5M351 198l-5-8M382 190v-9M413 198l5-8M436 221l8-5" {...faint} />
      <path className="il-sweep" d="M382 252L406 208" {...accent} />
      <circle cx="382" cy="252" r="4.5" fill="currentColor" stroke="none" />
    </>
  ),

  /* The verdict on the left, the drivers plotted beside it against a zero line —
     the arrangement an analyst would already recognise, not a decoration. */
  explain: (
    <>
      <circle cx="104" cy="178" r="56" {...ground} />
      <g className="il-float">
        <path className="il-draw" pathLength={1} d="M56 178a48 48 0 1 0 96 0a48 48 0 1 0-96 0" {...bold} />
        <path d="M83 178l15 16 28-33" {...bold} />
      </g>

      <path className="il-flow il-d2" pathLength={1} d="M140 146C184 98 230 86 288 102" {...thin} opacity={0.45} />

      <path d="M168 110h44M168 144h34M168 178h48M168 212h30M168 246h40" {...faint} />
      <path d="M292 84v188" {...thin} />

      <rect className="il-pulse" x="292" y="98" width="112" height="24" rx="6" fill="var(--brand)" stroke="none" />
      <rect x="220" y="132" width="72" height="24" rx="6" {...thin} />
      <rect x="292" y="166" width="58" height="24" rx="6" {...thin} />
      <rect x="252" y="200" width="40" height="24" rx="6" {...thin} />
      <rect x="292" y="234" width="24" height="24" rx="6" {...thin} />
    </>
  ),

  /* One pile, two destinations. The two streams are deliberately unequal, so the
     ratio is legible without a number on it. */
  queue: (
    <>
      <ellipse cx="352" cy="300" rx="54" ry="10" {...ground} />

      <rect x="44" y="200" width="106" height="30" rx="7" {...faint} />
      <rect x="50" y="176" width="106" height="30" rx="7" {...thin} />
      <path
        className="il-draw"
        pathLength={1}
        d="M63 148h100a7 7 0 0 1 7 7v16a7 7 0 0 1-7 7H63a7 7 0 0 1-7-7v-16a7 7 0 0 1 7-7Z"
        {...bold}
      />

      <path
        className="il-flow il-flow--fine il-d1"
        pathLength={1}
        d="M176 158C214 158 222 112 276 102"
        {...thin}
        opacity={0.42}
      />
      <path className="il-flow il-d3" pathLength={1} d="M176 174C218 174 226 232 286 244" {...thin} opacity={0.45} />

      <circle cx="330" cy="88" r="16" {...bold} />
      <path d="M302 142a28 30 0 0 1 56 0" {...bold} />
      <g className="il-float">
        <rect className="il-pulse" x="358" y="108" width="62" height="40" rx="7" {...accent} />
      </g>

      <circle cx="352" cy="248" r="42" {...thin} />
      <path d="M330 248l14 15 30-34" {...bold} />
    </>
  ),

  /* A horizon drawing: the normal band, a trace that lives inside it, and the one
     moment it leaves. Everything else in the frame is scaffolding. */
  watch: (
    <>
      <rect x="56" y="176" width="372" height="40" {...ground} />
      <path d="M56 76v210M56 286h372" {...thin} />
      <path d="M100 286v7M160 286v7M220 286v7M280 286v7M340 286v7M400 286v7" {...faint} />
      <path d="M56 176h372M56 216h372" strokeDasharray="6 8" {...faint} />
      <path d="M357 102v184" strokeDasharray="4 7" {...faint} />

      <path
        className="il-draw"
        pathLength={1}
        d="M60 204C76 196 84 210 100 204S124 194 140 202S168 212 184 202S212 194 228 204S256 210 272 200S296 190 312 178C324 168 332 128 348 106C356 96 366 92 376 104C386 116 392 140 400 156"
        {...bold}
      />

      <circle className="il-ping" cx="357" cy="95" r="11" {...thin} />
      <circle className="il-pulse" cx="357" cy="95" r="7" fill="var(--brand)" stroke="none" />
    </>
  ),

  /* A walled enclosure with exactly one gate, the data safe inside it, and a
     request outside that gets no further than the wall. */
  privacy: (
    <>
      {/* Inset from the wall, so the wall and the gate still read as line work. */}
      <path
        d="M338 156V132a36 36 0 0 0-36-36H130a36 36 0 0 0-36 36v96a36 36 0 0 0 36 36h172a36 36 0 0 0 36-36Z"
        {...ground}
      />
      <path
        className="il-flow il-flow--fine il-s3"
        pathLength={1}
        d="M348 146V128a44 44 0 0 0-44-44H128a44 44 0 0 0-44 44v104a44 44 0 0 0 44 44h176a44 44 0 0 0 44-44v-18"
        {...thin}
        opacity={0.5}
      />

      <path className="il-draw" pathLength={1} d="M124 150a42 14 0 1 0 84 0a42 14 0 1 0-84 0" {...bold} />
      <path d="M124 150v56c0 7.7 18.8 14 42 14s42-6.3 42-14v-56" {...bold} />
      <path d="M124 178c0 7.7 18.8 14 42 14s42-6.3 42-14" {...faint} />

      <rect x="238" y="128" width="70" height="15" rx="4" {...faint} />
      <rect x="238" y="155" width="50" height="15" rx="4" {...faint} />
      <rect x="238" y="211" width="62" height="15" rx="4" {...faint} />
      <rect x="238" y="238" width="42" height="15" rx="4" {...faint} />

      <path d="M338 146h20M338 214h20" {...bold} />
      <path className="il-pulse" d="M348 146v68" {...accent} />

      <path className="il-flow il-d2" pathLength={1} d="M446 180H392" {...thin} opacity={0.45} />
      <path d="M400 172l-8 8 8 8" {...thin} />
      <path className="il-flow il-flow--fine il-d3" pathLength={1} d="M390 172c14-12 26-26 40-42" {...faint} />
    </>
  ),

  /* The page is the record; the seal is the defence. The chain along the top is
     the same decision written somewhere it cannot be edited afterwards. */
  audit: (
    <>
      <circle cx="306" cy="242" r="43" {...ground} />

      <path
        className="il-draw"
        pathLength={1}
        d="M108 62h146l34 34v188a14 14 0 0 1-14 14H108a14 14 0 0 1-14-14V76a14 14 0 0 1 14-14Z"
        {...bold}
      />
      <path d="M254 62v34h34" {...thin} />
      <path d="M118 132h140M118 156h140M118 180h140M118 204h108M118 228h124" {...faint} />

      <rect x="312" y="94" width="32" height="32" rx="8" {...thin} />
      <rect x="364" y="94" width="32" height="32" rx="8" {...thin} />
      <rect x="416" y="94" width="32" height="32" rx="8" {...thin} />
      <path className="il-flow il-flow--fine il-d1" pathLength={1} d="M344 110h20" {...thin} opacity={0.45} />
      <path className="il-flow il-flow--fine il-d3" pathLength={1} d="M396 110h20" {...thin} opacity={0.45} />

      <g className="il-float">
        <path d={SEAL_RIM} {...faint} />
        <circle className="il-pulse" cx="306" cy="242" r="34" {...accent} />
        <circle cx="306" cy="242" r="25" {...thin} />
        <path d="M295 242l8 9 18-20" {...bold} />
      </g>
    </>
  ),

  /* Two machines and one cable with real slack in it. The current running along
     the cable is what says "plugged in" rather than "placed near each other". */
  connect: (
    <>
      <rect x="326" y="158" width="98" height="104" rx="10" {...ground} />

      <rect x="44" y="88" width="120" height="128" rx="14" {...thin} />
      <path d="M64 116h56M64 136h72M64 156h44" {...faint} />
      <circle className="il-pulse il-d1" cx="140" cy="188" r="4" fill="currentColor" stroke="none" />

      <rect x="314" y="146" width="122" height="128" rx="14" {...thin} />
      <path d="M344 186h72M344 210h72M344 234h48" {...faint} />
      <circle className="il-pulse il-d3" cx="412" cy="256" r="4" fill="currentColor" stroke="none" />

      <path className="il-draw" pathLength={1} d={CABLE} {...accent} />
      <path className="il-flow" pathLength={1} d={CABLE} {...thin} opacity={0.5} />

      <rect x="152" y="140" width="24" height="26" rx="6" {...bold} />
      <rect x="302" y="190" width="24" height="26" rx="6" {...bold} />
    </>
  ),

  /* Three people round one table with a single finding on it. The people are the
     subject; the table exists only to put them in the same room. */
  team: (
    <>
      <ellipse cx="240" cy="252" rx="118" ry="40" {...ground} />
      <path className="il-draw" pathLength={1} d="M122 246a118 40 0 1 0 236 0a118 40 0 1 0-236 0" {...thin} />
      <path d="M122 250a118 40 0 0 0 236 0" {...faint} />
      <path
        className="il-flow il-s3"
        pathLength={1}
        d="M112 246a128 44 0 1 0 256 0a128 44 0 1 0-256 0"
        {...thin}
        opacity={0.3}
      />

      <circle cx="104" cy="150" r="16" {...bold} />
      <path d="M76 212a28 30 0 0 1 56 0" {...bold} />
      <circle cx="240" cy="120" r="17" {...bold} />
      <path d="M208 188a32 34 0 0 1 64 0" {...bold} />
      <circle cx="376" cy="150" r="16" {...bold} />
      <path d="M348 212a28 30 0 0 1 56 0" {...bold} />

      <g className="il-float">
        <rect className="il-pulse" x="196" y="220" width="88" height="48" rx="7" {...accent} />
        <path d="M210 256h60" {...faint} />
        <path d="M218 256v-14M234 256v-22M250 256v-9M266 256v-19" {...thin} />
      </g>
    </>
  ),

  /* Diagonal: something happens at the top left, and the answer is already on the
     screen at the bottom right. Nobody in the drawing asked for it. */
  alert: (
    <>
      <rect x="300" y="188" width="108" height="112" rx="12" {...ground} />

      <circle cx="110" cy="110" r="5" fill="currentColor" stroke="none" />
      <path className="il-ping il-d1" d="M131.2 88.8A30 30 0 0 1 88.8 131.2" {...thin} />
      <path className="il-ping il-d2" d="M141.1 78.9A44 44 0 0 1 78.9 141.1" {...thin} />
      <path className="il-ping il-d3" d="M151 69A58 58 0 0 1 69 151" {...thin} />

      <path className="il-flow" pathLength={1} d="M126 130C182 158 214 148 250 168" {...thin} opacity={0.45} />

      <rect x="288" y="176" width="132" height="136" rx="18" {...thin} />
      <path d="M308 268h92M308 288h60" {...faint} />

      <g className="il-float">
        <path
          className="il-draw"
          pathLength={1}
          d="M262 152h134a12 12 0 0 1 12 12v40a12 12 0 0 1-12 12H262a12 12 0 0 1-12-12v-40a12 12 0 0 1 12-12Z"
          {...bold}
        />
        <path d="M270 174h86M270 192h58" {...faint} />
        <circle className="il-pulse" cx="404" cy="152" r="10" fill="var(--brand)" stroke="none" />
      </g>
    </>
  ),
}

export function Illustration({ name, className, style, title }: IllustrationProps) {
  // useId is not id-safe on its own in React 19 (it returns «r0»); strip it back.
  const id = `il-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  // A decorative drawing is hidden outright rather than given a vague label: it
  // restates the prose it sits beside, and there is nothing in it to read.
  const label = title
    ? ({ role: 'img' as const, 'aria-labelledby': id })
    : ({ role: 'presentation' as const, 'aria-hidden': true })

  return (
    <svg
      className={className ? `il il--${name} ${className}` : `il il--${name}`}
      style={style}
      viewBox="0 0 480 360"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...label}
    >
      {title ? <title id={id}>{title}</title> : null}
      {drawings[name]}
    </svg>
  )
}
