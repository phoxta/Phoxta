import ButtonPrimary from '@/components/button-primary'
import I404Png from '@/images/404.png'
import Image from 'next/image'

const NotFound = () => (
  <div>
    <div className="relative container pt-5 pb-16 lg:pt-5 lg:pb-20">
      {/* HEADER */}
      <header className="mx-auto max-w-2xl space-y-2 text-center">
        <Image src={I404Png} alt="not-found" />
        <span className="block text-sm font-medium tracking-wider text-foreground sm:text-base">
          THE PAGE YOU WERE LOOKING FOR DOESN&apos;T EXIST.
        </span>
        <div className="pt-8">
          <ButtonPrimary href="/">Return Home Page</ButtonPrimary>
        </div>
      </header>
    </div>
  </div>
)

export default NotFound
