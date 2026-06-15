import { StarIcon } from '@heroicons/react/20/solid'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { ReactNode } from 'react'
import { Button } from './button'
import { Heading } from './heading'
import { MotionDiv } from './motion-div'

interface Props {
  className?: string
  title1?: ReactNode
  title2?: ReactNode
  description?: ReactNode
  videoUrl?: string
}

const HeroSection2 = ({
  className,
  title1 = (
    <>
      Co<span data-slot="italic">llect</span> moments
    </>
  ),
  title2 = (
    <>
      n<span data-slot="italic">ot</span> things.
    </>
  ),
  description = (
    <> Unrivaled expertise for unique travel experiences. We&lsquo;re here to take you there dream travels!</>
  ),
  videoUrl = 'https://www.pexels.com/vi-vn/download/video/36861387/',
}: Props) => {
  return (
    <div className={clsx('section-hero-2 relative flex w-full lg:min-h-dvh', className)}>
      {/* VIDEO BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          width="100%"
          height="100%"
          controls={false}
          preload="auto"
          muted
          autoPlay
          loop
          playsInline
          className="absolute inset-0 size-full object-cover"
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="absolute inset-0 bg-black/40 lg:bg-black/30" />

      {/* THE MAIN CONTENT */}
      <div
        className={clsx(
          'relative container flex flex-1 flex-col py-12 text-white lg:gap-14 lg:pt-36 lg:pb-14 2xl:pt-40 2xl:pb-16',
          className
        )}
      >
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75, duration: 1.25 }}>
          <Heading
            level={1}
            fontSize="text-6xl/none sm:text-7xl/none lg:text-8xl/none xl:text-9xl/[0.85em] 2xl:text-[9rem]/[0.85em]"
            className="max-w-sm font-features-['ss02'] font-normal tracking-tighter"
          >
            {title1}
          </Heading>
        </MotionDiv>

        <div className="mt-auto flex flex-col-reverse items-start justify-between gap-14 lg:flex-row lg:items-end lg:gap-10">
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.25, duration: 1.25 }}>
            <p className="max-w-xs text-base xl:text-lg">{description}</p>
            <Button color="light" className="mt-6">
              Discover more
              <ArrowRightIcon className="size-5 rtl:rotate-180" />
            </Button>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1.25 }}
            className="flex flex-col-reverse gap-2.5 lg:flex-col lg:gap-0 lg:text-right"
          >
            <div className="flex items-center gap-1 lg:justify-end">
              <StarIcon className="mb-px size-4" />
              <span>4.9/5 from 8K+ reviews</span>
            </div>
            <Heading
              level={2}
              fontSize="text-6xl/none sm:text-7xl/none lg:text-8xl/none xl:text-9xl/[0.85em] 2xl:text-[9rem]/[0.85em]"
              className="max-w-sm font-features-['ss02'] font-normal tracking-tighter"
            >
              {title2}
            </Heading>
          </MotionDiv>
        </div>
      </div>
    </div>
  )
}

export default HeroSection2
