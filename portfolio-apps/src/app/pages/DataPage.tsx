import { Banner, LinkButton } from '@primer/react'
import { DatabaseIcon, LinkExternalIcon } from '@primer/octicons-react'
import { useApp, usePageMeta } from '../context'
import { Prose, Section } from '@/components/Section'
import { ChartGrid } from '@/components/Charts'
import { Facts } from '@/components/Blocks'

export function DataPage() {
  const { app } = useApp()
  usePageMeta(`Data · ${app.name}`, `${app.dataset.name}: the real dataset behind ${app.name}.`)

  return (
    <div className="fa-page">
      <Section id="dataset" kicker="Real data" title={app.dataset.name} sub={app.dataset.size}
        actions={app.dataset.source ? (
          <LinkButton href={app.dataset.source.url} target="_blank" rel="noreferrer" trailingVisual={LinkExternalIcon}>{app.dataset.source.label}</LinkButton>
        ) : undefined}>
        <div className="fa-two">
          <div className="fa-card"><div className="fa-card__body">
            <span className="fa-feature__icon" aria-hidden="true"><DatabaseIcon size={18} /></span>
            <Prose paragraphs={[app.dataset.description]} />
          </div></div>
          <Facts facts={app.dataset.facts} />
        </div>
      </Section>

      <Section id="data-charts" kicker="Profile" title="What the data looks like">
        <ChartGrid charts={app.charts.data} />
      </Section>

      <Banner
        title="Reproduce the dataset"
        variant="info"
        description="Raw data is not tracked in git. The repository's dataset guide lists every download link, expected size and the pre-processing step that produces the parquet files the dashboard reads."
        primaryAction={<LinkButton href="https://github.com/oluwafemiadeyemi/Portfolio/blob/main/DATASET_DOWNLOAD_GUIDE.md" target="_blank" rel="noreferrer">Dataset download guide</LinkButton>}
      />
    </div>
  )
}
