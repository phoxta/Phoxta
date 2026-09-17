import { DataTable, Table } from '@primer/react/experimental'
import { useApp, usePageMeta } from '../context'
import { Section } from '@/components/Section'
import { CodeBlock } from '@/components/Blocks'

export function ApiPage() {
  const { app } = useApp()
  usePageMeta(`API · ${app.name}`, `FastAPI endpoints for ${app.name}.`)
  const rows = app.api.endpoints.map((e, i) => ({ id: i, ...e }))
  const base = `http://localhost:${app.api.port}`
  const sample = app.api.sample
  const curl = sample
    ? `curl -X POST ${base}${sample.endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '${sample.request.replace(/\n\s*/g, ' ')}'`
    : `curl ${base}${app.api.endpoints[0]?.path ?? '/health'}`

  return (
    <div className="fa-page">
      <Section id="endpoints" kicker="FastAPI" title="Endpoints" sub={`Served by uvicorn on port ${app.api.port}. Interactive docs at ${base}/docs.`}>
        <Table.Container>
          <Table.Title as="h3" id="ep-title">Routes</Table.Title>
          <Table.Subtitle as="p" id="ep-sub">{app.api.endpoints.length} endpoints · JSON in, JSON out · Pydantic-validated</Table.Subtitle>
          <DataTable
            aria-labelledby="ep-title"
            aria-describedby="ep-sub"
            data={rows}
            columns={[
              { header: 'Method', field: 'method', width: '90px', renderCell: (r) => <span className={`fa-method fa-method--${r.method}`}>{r.method}</span> },
              { header: 'Path', field: 'path', rowHeader: true, renderCell: (r) => <code className="fa-path">{r.path}</code> },
              { header: 'Description', field: 'description' },
            ]}
          />
        </Table.Container>
      </Section>

      {sample && (
        <Section id="sample" kicker="Example" title={`${sample.endpoint}`}>
          <div className="fa-two">
            <div>
              <p className="fa-kicker" style={{ color: 'var(--fgColor-muted)' }}>Request</p>
              <CodeBlock code={sample.request} label="JSON" />
            </div>
            <div>
              <p className="fa-kicker" style={{ color: 'var(--fgColor-muted)' }}>Response</p>
              <CodeBlock code={sample.response} label="200 OK" />
            </div>
          </div>
        </Section>
      )}

      <Section id="run" kicker="Run it" title="Local quick start">
        <div className="fa-two">
          <div>
            <p className="fa-kicker" style={{ color: 'var(--fgColor-muted)' }}>Start the service</p>
            <CodeBlock label="bash" code={`git clone https://github.com/oluwafemiadeyemi/Portfolio\ncd Portfolio\ncd "${decodeURIComponent(app.links.github.split('/tree/main/')[1] ?? '')}"\npip install -r requirements.txt\n\n# API\nuvicorn api.main:app --port ${app.api.port} --reload\n\n# Dashboard (second terminal)\nstreamlit run dashboard/app.py --server.port ${app.ports.dashboard}`} />
          </div>
          <div>
            <p className="fa-kicker" style={{ color: 'var(--fgColor-muted)' }}>Call it</p>
            <CodeBlock label="curl" code={curl} />
          </div>
        </div>
      </Section>
    </div>
  )
}
