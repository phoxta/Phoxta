import appRightImg from '@/assets/images/appRightImg.webp'
import appRightImgTree from '@/assets/images/appRightImgTree.png'
import btnIosPng from '@/assets/images/appstore.png'
import appSvg1 from '@/assets/images/appSvg1.svg'
import appSvg2 from '@/assets/images/appSvg2.svg'
import dowloadAppBGPng from '@/assets/images/dowloadAppBG.png'
import btnAndroidPng from '@/assets/images/googleplay.png'
import BackgroundSection from '@/components/cards/background-section'
import { Link } from '@/components/chrome/link'
import Img from '@/components/media/img'

export default function SectionDowloadApp() {
  return (
    <div className="relative pt-24 pb-0 lg:py-32 xl:py-40 2xl:py-48">
      <BackgroundSection className="bg-neutral-100/80 dark:bg-neutral-100">
        <Img
          className="absolute inset-0 h-full w-full rounded-3xl object-cover object-right rtl:object-left"
          src={dowloadAppBGPng}
          alt="dowloadAppPng"
        />

        <div className="absolute end-0 bottom-0 hidden max-w-xl overflow-hidden rounded-3xl lg:block xl:max-w-2xl">
          <Img src={appRightImg} alt="" />
        </div>
        <div className="absolute end-0 top-0 max-w-2xl">
          <Img src={appRightImgTree} alt="" />
        </div>
        <div className="absolute start-0 bottom-10 max-w-2xl">
          <Img src={appSvg1} alt="" />
        </div>
      </BackgroundSection>

      <div className="relative inline-block">
        <h2 className="text-5xl font-bold text-neutral-800 md:text-6xl xl:text-7xl">Mobile Apps</h2>
        <span className="mt-7 block max-w-md text-neutral-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dapibus porttitor nisl, sit amet finibus libero.
        </span>
        <div className="mt-10 flex gap-x-2 sm:mt-14 sm:gap-x-4">
          <Link href="#" target="_blank" rel="noopener noreferrer" className="flex max-w-40">
            <Img src={btnIosPng} alt="ios" className="max-w-full" sizes="160px" />
          </Link>
          <Link href="#" target="_blank" rel="noopener noreferrer" className="flex max-w-40">
            <Img src={btnAndroidPng} alt="androi" className="max-w-full" sizes="160px" />
          </Link>
        </div>

        <Img
          className="absolute z-10 hidden lg:start-full lg:top-0 lg:block lg:max-w-sm xl:top-1/2 2xl:max-w-none"
          src={appSvg2}
          alt=""
        />

        <div className="mt-10 block max-w-2xl overflow-hidden rounded-3xl lg:hidden">
          <Img src={appRightImg} alt="" />
        </div>
      </div>
    </div>
  )
}
