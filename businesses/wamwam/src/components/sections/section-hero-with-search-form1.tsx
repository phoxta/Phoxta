import Img from '@/components/media/img'
import clsx from 'clsx'
import type { ReactNode } from 'react'

interface HeroSectionWithSearchForm1Props {
  className?: string
  heading: string | ReactNode
  description: string | ReactNode
  /** Static image imports carry only `src`; explicit dimensions are forwarded when a caller supplies them. */
  image: {
    src: string
    width?: number
    height?: number
  }
  imageAlt: string
  searchForm: ReactNode
}

export default function HeroSectionWithSearchForm1({
  className,
  searchForm,
  description,
  heading,
  imageAlt,
  image,
}: HeroSectionWithSearchForm1Props) {
  return (
    <div className={clsx('relative flex flex-col-reverse pt-10 lg:flex-col lg:pt-12', className)}>
      <div className="flex flex-col lg:flex-row">
        <div className="relative flex w-full flex-col items-start gap-y-8 pb-16 lg:pe-10 lg:pt-12 lg:pb-60 xl:gap-y-10 xl:pe-14">
          <h2
            className="text-5xl/[1.15] font-medium tracking-tight text-pretty xl:text-7xl/[1.1]"
            dangerouslySetInnerHTML={{ __html: typeof heading === 'string' ? heading : '' }}
          />
          {description}
          <div className="absolute start-0 bottom-4 hidden w-screen max-w-4xl lg:block xl:max-w-6xl">{searchForm}</div>
        </div>

        <div className="w-full">
          <Img className="w-full" src={image} width={image.width} height={image.height} alt={imageAlt} priority />
        </div>
      </div>
    </div>
  )
}
