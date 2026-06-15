import clsx from 'clsx'
import Image from 'next/image'
import ButtonLargeWithIcon from './button-large-with-icon'
import { Link } from './link'
import { Text } from './text'

interface HeroSection1Props {
  className?: string
}

const HeroSection1 = ({ className }: HeroSection1Props) => {
  return (
    <div className={clsx('flex flex-col items-center gap-10 sm:gap-16', className)}>
      <div className="flex w-full flex-col justify-between gap-6 md:flex-row">
        <Link href="/car-categories/nuremberg" className="w-full">
          <Image
            src="https://images.pexels.com/photos/33372737/pexels-photo-33372737.jpeg"
            alt="London"
            width={450}
            height={350}
            className="aspect-450/350 w-full object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <Text className="mt-2.5 text-sm">
            London - United Kingdom <br />
            (5120+ properties)
          </Text>
        </Link>
        <Link href="/car-categories/tokyo" className="relative w-full">
          <Image
            src="https://images.pexels.com/photos/31541968/pexels-photo-31541968.jpeg"
            alt="Tokyo"
            width={450}
            height={450}
            className="aspect-square w-full object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <Text className="absolute end-3 top-3 text-right text-sm text-black">
            Tokyo - Japan <br />
            (5880+ properties)
          </Text>
        </Link>
        <Link href="/car-categories/arizona" className="flex w-full flex-col-reverse justify-end gap-2.5 sm:flex-col">
          <Text className="text-right text-sm">
            Rome - Italy <br />
            (4850+ properties).
          </Text>
          <Image
            src="https://images.pexels.com/photos/27529259/pexels-photo-27529259.jpeg"
            alt="Rome"
            className="aspect-450/290 w-full object-cover"
            width={450}
            height={290}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
      </div>
      <ButtonLargeWithIcon href="/car-search">Explore all properties</ButtonLargeWithIcon>
    </div>
  )
}

export default HeroSection1
