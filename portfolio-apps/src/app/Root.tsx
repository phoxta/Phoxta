import { useMemo } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@primer/react'
import { ColorModeProvider, useColorMode } from './theme'
import { resolve } from './resolve'
import { ProductSite } from '@/saas/ProductSite'
import { HubPage } from '@/hub/HubPage'

function Themed() {
  const { resolved } = useColorMode()
  const res = useMemo(() => resolve(), [])

  // A retired product's address is rewritten to the one that replaced it before
  // anything renders, so an old link never 404s and the router is handed a
  // basename that matches the URL it is about to read.
  if (res.redirectTo) {
    if (res.redirectTo.startsWith('http')) {
      window.location.replace(res.redirectTo)
      return null
    }
    window.history.replaceState(null, '', res.redirectTo)
  }

  return (
    <ThemeProvider colorMode={resolved}>
      <BrowserRouter basename={res.basename}>
        {res.slug ? <ProductSite slug={res.slug} resolution={res} /> : <HubPage resolution={res} />}
      </BrowserRouter>
    </ThemeProvider>
  )
}

export function Root() {
  return (
    <ColorModeProvider>
      <Themed />
    </ColorModeProvider>
  )
}
