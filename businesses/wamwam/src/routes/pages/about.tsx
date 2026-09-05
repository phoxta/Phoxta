import { Divider } from '@/components/primitives/divider'
import { Heading } from '@/components/primitives/heading'
import Img from '@/components/media/img'
import FeatureSection2 from '@/components/sections/feature-section-2'
import InspirationFutureGetawaysSection from '@/components/sections/inspiration-future-getaways-section'
import NewsletterSection from '@/components/sections/newsletter-section-1'
import SectionClientSay from '@/components/sections/section-client-say'
import SectionInterestingInfor from '@/components/sections/section-interesting-infor'
import SectionWhyUs from '@/components/sections/section-why-us'

interface Founder {
  id: string
  name: string
  job: string
  avatar: string
}

const founders: Founder[] = [
  {
    id: '1',
    name: `Niamh O'Shea`,
    job: 'Co-founder and Chief Executive',
    avatar: '/images/catalog/2379005-1200.webp',
  },
  {
    id: '4',
    name: `Danien Jame`,
    job: 'Co-founder and Chief Executive',
    avatar: '/images/catalog/769772-1200.webp',
  },
  {
    id: '3',
    name: `Orla Dwyer`,
    job: 'Co-founder, Chairman',
    avatar: '/images/catalog/732425-1200.webp',
  },
  {
    id: '2',
    name: `Dara Frazier`,
    job: 'Co-Founder, Chief Strategy Officer',
    avatar: '/images/catalog/2804282-1200.webp',
  },
]

function SectionFounder() {
  return (
    <div className="relative">
      <Heading className="mb-12">⛱ Founder</Heading>
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {founders.map((item) => (
          <div key={item.id} className="max-w-sm">
            <div className="aspect-w-1 relative h-0 overflow-hidden rounded-xl aspect-h-1">
              <Img
                fill
                className="object-cover"
                src={item.avatar}
                alt=""
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 30vw"
              />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-neutral-900 md:text-xl dark:text-neutral-200">
              {item.name}
            </h3>
            <span className="block text-sm text-neutral-500 sm:text-base dark:text-neutral-400">{item.job}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PageAbout() {
  return (
    <div className="container flex flex-col gap-y-16 py-16 lg:gap-y-32 lg:pb-28">
      <SectionWhyUs />

      <SectionInterestingInfor />
      <InspirationFutureGetawaysSection className="text-center" />

      <SectionFounder />
      <FeatureSection2 variant="up" />

      <Divider />
      <SectionClientSay />

      <NewsletterSection />
    </div>
  )
}
