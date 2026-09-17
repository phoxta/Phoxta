import { useCallback, useEffect, useState } from 'react'
import { Button, Dialog } from '@primer/react'
import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react'
import type { Screenshot } from '@/content/types'
import { media } from '@/app/context'

export function Gallery({ slug, shots, limit }: { slug: string; shots: Screenshot[]; limit?: number }) {
  const list = limit ? shots.slice(0, limit) : shots
  const [open, setOpen] = useState<number | null>(null)

  const go = useCallback((d: number) => {
    setOpen((i) => (i == null ? i : (i + d + shots.length) % shots.length))
  }, [shots.length])

  useEffect(() => {
    if (open == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go])

  if (!shots.length) return null
  const cur = open != null ? shots[open] : null

  return (
    <>
      <div className="fa-gallery">
        {list.map((s, i) => (
          <figure className="fa-shot" key={s.file}>
            <button type="button" className="fa-shot__btn" onClick={() => setOpen(i)} aria-label={`Open screenshot ${i + 1}: ${s.caption}`}>
              <img src={media(slug, s.file)} alt={s.caption} width={s.w ?? 1440} height={s.h ?? 900} loading="lazy" decoding="async" />
            </button>
            <figcaption className="fa-shot__cap">
              <span className="fa-shot__num">{String(i + 1).padStart(2, '0')}</span>
              <span>{s.caption}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {cur && open != null && (
        <Dialog title={cur.caption} subtitle={`Screenshot ${open + 1} of ${shots.length}`} onClose={() => setOpen(null)} width="xlarge">
          <div className="fa-lightbox">
            <img src={media(slug, cur.file)} alt={cur.caption} width={cur.w ?? 1440} height={cur.h ?? 900} />
            <div className="fa-lightbox__nav">
              <Button leadingVisual={ChevronLeftIcon} onClick={() => go(-1)} disabled={shots.length < 2}>Previous</Button>
              <Button trailingVisual={ChevronRightIcon} onClick={() => go(1)} disabled={shots.length < 2}>Next</Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  )
}

export function VideoCard({ slug, file, poster, caption }: { slug: string; file: string; poster?: string; caption?: string }) {
  return (
    <figure className="fa-shot" style={{ margin: 0 }}>
      <div className="fa-video">
        <video controls preload="none" playsInline poster={poster ? media(slug, poster) : undefined} src={media(slug, file)}>
          Your browser does not support embedded video. <a href={media(slug, file)}>Download the recording.</a>
        </video>
      </div>
      {caption && <figcaption className="fa-shot__cap"><span>{caption}</span></figcaption>}
    </figure>
  )
}
