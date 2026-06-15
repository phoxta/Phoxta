import { ApplicationLayout } from '@/app/application-layout'
import Header from '@/components/header/header'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Soar by Phoxta — book stays, flights, car rentals and experiences around the world.',
  keywords: ['Soar', 'Phoxta', 'travel booking', 'stays', 'flights', 'car rental', 'experiences'],
}

export default function Layout({ children, params }: { children: React.ReactNode; params: any }) {
  return <ApplicationLayout header={<Header hasBorderBottom={true} />}>{children}</ApplicationLayout>
}
