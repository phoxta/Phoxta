import Header2 from '@/components/header/header2'
import React, { FC } from 'react'
import { ApplicationLayout } from '../application-layout'
import { PageNavigation } from './page-navigation'

interface Props {
  children?: React.ReactNode
}

const Layout: FC<Props> = ({ children }) => {
  return (
    <ApplicationLayout header={<Header2 initSearchFormTab="Stays" />}>
      <div className="bg-neutral-50 dark:bg-neutral-900">
        <div className="border-b border-border bg-background pt-12">
          <PageNavigation />
        </div>
        <div className="container pt-14 pb-24 sm:pt-16 lg:pb-32">{children}</div>
      </div>
    </ApplicationLayout>
  )
}

export default Layout
