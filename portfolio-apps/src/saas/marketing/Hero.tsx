/**
 * The hero, in six compositions.
 *
 * Which one a product uses is a brand decision recorded in `content/brand.ts`,
 * alongside its typeface, shape language and background pattern. Two products
 * therefore never open the same way, even though they share this component.
 */
import { Badge, Container, LinkButton } from '@/ui'
import { SplitLines } from '@/ui/SplitLines'
import { useCursorParallax } from '@/ui/useCursorParallax'
import { ArrowRightIcon, CheckIcon, LockIcon, PlayIcon, ZapIcon } from '@primer/octicons-react'
import { useSite } from '../context'
import { deriveProduct } from '../fallback'
import { domainOf } from '@/content/domain'
import { brandOf } from '@/content/brand'
import { photo, photoSrc } from '@/content/photos'
import { Mesh } from './BrandArt'
import { ProductPreview } from './ProductPreview'
import { Vignette } from './Vignette'
import { PhotoMosaic } from './Media'
import { headline, lede, withArticle } from './copy'

export function Hero() {
  const site = useSite()
  const { project } = site
  const product = site.product ?? deriveProduct(project)
  const d = domainOf(project.slug)
  const b = brandOf(project.slug)
  const heroRef = useCursorParallax<HTMLElement>()
  const hero = photo(project.slug, b.hero === 'editorial' ? 'people' : 'team')

  const copy = (
    <div className="mk-hero__copy">
      <SplitLines
        as="h1"
        className="u-hero-title"
        text={headline(product.tagline, b.hero === 'editorial' ? 7 : 10)}
        delay={120}
        step={b.hero === 'editorial' ? 100 : 80}
      />
      <p className="u-hero-lede">{lede(product.positioning, b.hero === 'editorial' ? 20 : 26)}</p>
      <div className="u-row">
        <LinkButton to="/signup" variant="primary" size="lg" trailingIcon={ArrowRightIcon}>Start free</LinkButton>
        <LinkButton to="/app" size="lg" leadingIcon={PlayIcon}>Score {withArticle(d.unit)}</LinkButton>
      </div>
      {/* Written from the product's own vocabulary, so no two heroes reassure
          the buyer in the same words. */}
      <div className="mk-hero__proof">
        <span><CheckIcon size={14} /> No card to start</span>
        <span><LockIcon size={14} /> Your {d.units} stay in your tenancy</span>
        <span><ZapIcon size={14} /> Live on {d.sources[0].toLowerCase()} in minutes</span>
      </div>
    </div>
  )

  const framedPhoto = (ratio?: string) => hero && (
    <div className="mk-stage__photo mk-photo-card" style={ratio ? { aspectRatio: ratio } : undefined}>
      <img src={photoSrc(project.slug, b.hero === 'editorial' ? 'people' : 'team')} alt={hero.alt} width={1600} height={1200} fetchPriority="high" decoding="async" />
      <span className="mk-stage__chip"><ZapIcon size={13} /> {d.units[0].toUpperCase() + d.units.slice(1)} scored live</span>
      <span className="mk-credit--stage">
        <a href={hero.url} target="_blank" rel="noreferrer">{hero.photographer}</a> · Pexels
      </span>
    </div>
  )

  let stage: React.ReactNode
  switch (b.hero) {
    case 'panel':
      stage = <div className="mk-stage"><ProductPreview /></div>
      break
    case 'centred':
      stage = (
        <div className="mk-stage">
          {framedPhoto('21 / 9')}
          <div className="mk-stage__card"><Vignette kind="queue" /></div>
        </div>
      )
      break
    case 'stacked':
      stage = <div className="mk-stage"><PhotoMosaic /></div>
      break
    case 'editorial':
      stage = (
        <div className="mk-stage">
          {framedPhoto('3 / 4')}
          <div className="mk-stage__card"><Vignette kind="drift" /></div>
        </div>
      )
      break
    default:
      stage = (
        <div className="mk-stage">
          {framedPhoto()}
          <div className="mk-stage__card"><Vignette kind="reasons" /></div>
        </div>
      )
  }

  return (
    <section ref={heroRef} className={`mk-hero mk-hero--split mk-hero--${b.hero}`}>
      <Mesh intensity={b.heroDark ? 0.6 : 1} />
      {b.pattern !== 'none' && <div className={`ba-pattern ba-pattern--${b.pattern}`} aria-hidden="true" />}
      <div className="ba-grain" aria-hidden="true" />
      <Container>
        <div className="mk-hero__grid">
          {copy}
          {stage}
        </div>
        {b.hero === 'stacked' && (
          <div className="u-row" style={{ justifyContent: 'center', marginTop: 'var(--space-10)' }}>
            <Badge tone="brand" dot>Runs on the cameras and files you already have</Badge>
          </div>
        )}
      </Container>
    </section>
  )
}
