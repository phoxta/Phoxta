import { ApplicationLayout } from '@/app/application-layout'

// Title, description and keywords are inherited from the root layout

export default function Layout({ children, params }: { children: React.ReactNode; params: any }) {
  return <ApplicationLayout>{children}</ApplicationLayout>
}
