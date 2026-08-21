import { ApplicationLayout } from '@/app/application-layout'
import Header from '@/components/header/header'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Book unique, guide-led experiences around the world.',
  keywords: ['experiences', 'things to do', 'tours', 'guided experiences', 'travel booking'],
}

export default function Layout({ children, params }: { children: React.ReactNode; params: any }) {
  return <ApplicationLayout header={<Header hasBorderBottom={true} />}>{children}</ApplicationLayout>
}
