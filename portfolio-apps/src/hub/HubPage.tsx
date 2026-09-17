import { useEffect, useMemo, useState } from 'react'
import { ActionList, ActionMenu, Avatar, Header, IconButton, Label, LinkButton, TextInput, Token } from '@primer/react'
import { ArrowRightIcon, MarkGithubIcon, MoonIcon, SearchIcon, SunIcon } from '@primer/octicons-react'
import { CATEGORIES, ORDERED, SLUGS, type ProjectBase } from '@/content/registry'
import { useColorMode } from '@/app/theme'
import { appUrl, type Resolution } from '@/app/resolve'

const STATS = [
  // Counted from the list rather than typed in, so merging two products cannot
  // leave the headline claiming a number that is no longer true.
  { value: String(SLUGS.length), label: 'Production systems', caption: 'Each its own app' },
  { value: '24 GB+', label: 'Real data', caption: 'Public benchmark datasets' },
  { value: '60+', label: 'Models trained', caption: 'Tabular · deep · GenAI · vision' },
  { value: '7', label: 'Domains', caption: 'NLP to computer vision' },
  { value: 'Llama 3.2', label: 'Local LLM', caption: 'Zero API cost' },
]

function AppCard({ p, resolution }: { p: ProjectBase; resolution: Resolution }) {
  const Icon = p.icon
  return (
    <a className="fa-card fa-app-card" href={appUrl(p.slug, resolution)} aria-label={`Open ${p.name}`}>
      <div className="fa-app-card__cover">
        <img src={`/media/${p.slug}/hero-800.jpg`} alt="" width={800} height={320} loading="lazy" decoding="async" />
        <div className="fa-app-card__cover-scrim" aria-hidden="true" />
        <span className="fa-app-card__num"><Label variant="secondary" size="small">P{String(p.num).padStart(2, '0')}</Label></span>
        <span className="fa-app-card__icon" aria-hidden="true"><Icon size={20} /></span>
      </div>
      <div className="fa-app-card__body">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="fa-app-card__title">{p.name}</h3>
        </div>
        <p className="fa-app-card__tag">{p.tagline}</p>
        <div className="fa-app-card__metrics">
          {p.metrics.slice(0, 2).map((m) => (
            <div className="fa-app-card__metric" key={m.label}><b>{m.value}</b><span>{m.label}</span></div>
          ))}
        </div>
        <div className="fa-tokens">
          {p.stackLine.slice(0, 3).map((s) => <Token key={s} text={s} size="small" />)}
        </div>
        <div className="fa-app-card__foot">
          <span style={{ color: 'var(--fgColor-muted)', fontWeight: 400 }}>{p.category}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Open app <ArrowRightIcon size={14} /></span>
        </div>
      </div>
    </a>
  )
}

export function HubPage({ resolution }: { resolution: Resolution }) {
  const { resolved, toggle } = useColorMode()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('All')

  useEffect(() => {
    document.title = 'Oluwafemi Adeyemi — AI/ML Portfolio Apps'
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return ORDERED.filter((p) => (cat === 'All' || p.category === cat))
      .filter((p) => !needle || [p.name, p.tagline, p.category, p.datasetLine, ...p.stackLine].join(' ').toLowerCase().includes(needle))
  }, [q, cat])
  const grouped = cat === 'All' && !q.trim()

  return (
    <>
      <a href="#main" className="fa-skip">Skip to content</a>
      <Header className="fa-topbar" aria-label="Portfolio">
        <Header.Item full>
          <Header.Link href="/" className="fa-topbar__brand">
            <img src="/femi.webp" alt="" width={24} height={24} style={{ borderRadius: 999, width: 24, height: 24 }} />
            <span>Femi Adeyemi</span>
            <span className="fa-topbar__sep" aria-hidden="true">/</span>
            <span style={{ fontWeight: 400, opacity: 0.85 }}>AI/ML apps</span>
          </Header.Link>
        </Header.Item>
        <Header.Item>
          <div className="fa-topbar__actions">
            <IconButton as="a" href="https://github.com/oluwafemiadeyemi/Portfolio" target="_blank" rel="noreferrer" icon={MarkGithubIcon} aria-label="Portfolio on GitHub" variant="invisible" size="small" />
            <IconButton icon={resolved === 'dark' ? SunIcon : MoonIcon} aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle} variant="invisible" size="small" />
          </div>
        </Header.Item>
      </Header>

      <section className="fa-hub-hero" aria-label="Introduction">
        <div className="fa-hub-hero__glow" aria-hidden="true" />
        <div className="fa-container">
          <div className="fa-hub-hero__body">
            <div className="fa-hub-hero__person">
              <Avatar src="/femi.webp" size={48} alt="Oluwafemi Adeyemi" />
              <div>
                <div style={{ fontWeight: 600 }}>Oluwafemi Adeyemi</div>
                <div style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>Applied AI Engineer &amp; Data Scientist · MIT Applied AI &amp; Data Science</div>
              </div>
            </div>
            <h1 className="fa-hub-hero__title">{SLUGS.length} production-grade AI systems, each as its own app.</h1>
            <p className="fa-hub-hero__lede">
              End-to-end machine-learning systems across NLP, generative AI, finance, computer vision and customer analytics.
              Every one is trained on a real dataset, served by a FastAPI endpoint and explored through a live dashboard.
              Open any app to walk its data, model, API and executive report.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <LinkButton href="https://github.com/oluwafemiadeyemi/Portfolio" target="_blank" rel="noreferrer" leadingVisual={MarkGithubIcon} variant="primary">Portfolio on GitHub</LinkButton>
              <LinkButton href="https://www.linkedin.com/in/oluwafemiadeyemi" target="_blank" rel="noreferrer">LinkedIn</LinkButton>
              <LinkButton href="mailto:femi@phoxta.com">femi@phoxta.com</LinkButton>
            </div>
            <div className="fa-hub-hero__stats">
              {STATS.map((s) => (
                <div className="fa-stat" key={s.label}>
                  <div className="fa-stat__value" style={{ fontSize: 26 }}>{s.value}</div>
                  <div className="fa-stat__label">{s.label}</div>
                  <div className="fa-stat__caption">{s.caption}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="fa-hub-filters">
        <div className="fa-container fa-hub-filters__row">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <ActionMenu>
              <ActionMenu.Button>{cat === 'All' ? 'All domains' : cat}</ActionMenu.Button>
              <ActionMenu.Overlay width="medium">
                <ActionList selectionVariant="single">
                  <ActionList.Item selected={cat === 'All'} onSelect={() => setCat('All')}>All domains</ActionList.Item>
                  {CATEGORIES.map((c) => (
                    <ActionList.Item key={c} selected={cat === c} onSelect={() => setCat(c)}>
                      {c}
                      <ActionList.TrailingVisual>{ORDERED.filter((p) => p.category === c).length}</ActionList.TrailingVisual>
                    </ActionList.Item>
                  ))}
                </ActionList>
              </ActionMenu.Overlay>
            </ActionMenu>
            <span style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>{filtered.length} of {ORDERED.length} apps</span>
          </div>
          <TextInput leadingVisual={SearchIcon} placeholder="Search apps, models, datasets" aria-label="Search apps" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} />
        </div>
      </div>

      <main id="main" className="fa-main">
        <div className="fa-container fa-page" style={{ gap: 40 }}>
          {grouped ? (
            CATEGORIES.map((c) => {
              const items = ORDERED.filter((p) => p.category === c)
              if (!items.length) return null
              return (
                <section className="fa-hub-section" key={c} aria-labelledby={`cat-${c}`}>
                  <div className="fa-hub-section__head">
                    <h2 className="fa-hub-section__title" id={`cat-${c}`}>{c}</h2>
                    <span style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>{items.length} {items.length === 1 ? 'app' : 'apps'}</span>
                  </div>
                  <div className="fa-hub-grid">
                    {items.map((p) => <AppCard key={p.slug} p={p} resolution={resolution} />)}
                  </div>
                </section>
              )
            })
          ) : (
            <section className="fa-hub-section" aria-label="Results">
              {filtered.length ? (
                <div className="fa-hub-grid">
                  {filtered.map((p) => <AppCard key={p.slug} p={p} resolution={resolution} />)}
                </div>
              ) : (
                <div className="fa-loading">No app matches “{q}”.</div>
              )}
            </section>
          )}

          <section className="fa-hub-section" aria-labelledby="stack-title">
            <div className="fa-hub-section__head"><h2 className="fa-hub-section__title" id="stack-title">Across the portfolio</h2></div>
            <div className="fa-grid">
              {[
                ['ML / tabular', ['XGBoost', 'LightGBM', 'CatBoost', 'scikit-learn', 'Optuna', 'SMOTE']],
                ['NLP / GenAI', ['Claude Sonnet', 'Llama 3.2', 'ChromaDB', 'BERTopic', 'RoBERTa', 'VADER']],
                ['Fairness / XAI', ['SHAP', 'Fairlearn', 'MetricFrame', 'Grad-CAM', 'Conformal']],
                ['Computer vision', ['YOLOv8', 'ONNX Runtime', 'OpenCV', 'ByteTrack', 'EfficientNet', 'ViT']],
                ['Customer analytics', ['BG/NBD', 'scikit-uplift', 'HDBSCAN', 'UMAP', 'NetworkX', 'FAISS']],
                ['Serving / MLOps', ['FastAPI', 'Pydantic', 'Streamlit', 'Docker', 'Evidently', 'ONNX export']],
              ].map(([title, items]) => (
                <div className="fa-card fa-card--muted fa-span-4" key={title as string}>
                  <div className="fa-card__body">
                    <h3 className="fa-card__title" style={{ marginBottom: 10 }}>{title as string}</h3>
                    <div className="fa-tokens">{(items as string[]).map((t) => <Token key={t} text={t} />)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="fa-footer">
        <div className="fa-container fa-footer__row">
          <span><strong>Oluwafemi Adeyemi</strong> · MIT Applied AI &amp; Data Science · <a href="mailto:femi@phoxta.com">femi@phoxta.com</a></span>
          <nav className="fa-footer__links" aria-label="Footer">
            <a href="https://github.com/oluwafemiadeyemi/Portfolio" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://www.linkedin.com/in/oluwafemiadeyemi" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://femi.phoxta.com" target="_blank" rel="noreferrer">Design portfolio</a>
            <a href="https://primer.style" target="_blank" rel="noreferrer">Built with Primer</a>
          </nav>
        </div>
      </footer>
    </>
  )
}
