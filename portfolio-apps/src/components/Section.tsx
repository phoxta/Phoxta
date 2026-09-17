import type { ReactNode } from 'react'

export function Section({
  id, kicker, title, sub, actions, children,
}: {
  id?: string
  kicker?: string
  title?: string
  sub?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const titleId = id ? `${id}-title` : undefined
  return (
    <section id={id} className="fa-section" aria-labelledby={title ? titleId : undefined}>
      {(title || actions) && (
        <div className="fa-section__head">
          <div>
            {kicker && <p className="fa-kicker">{kicker}</p>}
            {title && <h2 id={titleId} className="fa-section__title">{title}</h2>}
            {sub && <p className="fa-section__sub">{sub}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="fa-prose">
      {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  )
}
