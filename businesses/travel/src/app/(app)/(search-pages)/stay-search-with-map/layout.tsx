import { ApplicationLayout } from '@/app/application-layout'
import Header2 from '@/components/header/header2'
import { ReactNode } from 'react'

const Layout = async ({ children }: { children: ReactNode }) => {
  return (
    <ApplicationLayout isStickyHeader header={<Header2 initSearchFormTab="Stays" />}>
      {children}
    </ApplicationLayout>
  )
}

export default Layout
