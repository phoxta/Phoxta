import { ICONS_MAP } from '@/data/data'
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'

export function LightChip({ ...props }) {
  return (
    <span
      {...props}
      className={clsx(
        'inline-flex items-center gap-x-1.5 rounded-full px-2 py-0.5 text-xs/5 font-[420] forced-colors:outline',
        'bg-neutral-600/8 text-neutral-700 group-data-hover:bg-neutral-600/20 dark:bg-white/5 dark:text-neutral-400 dark:group-data-hover:bg-white/10'
      )}
    />
  )
}

const DEMO_DATA = [
  { icon: 'BedSingle02Icon', text: '5 beds' },
  { icon: 'Wifi01Icon', text: 'Free wifi' },
  { icon: 'CarParking01Icon', text: 'Free parking' },
  { icon: 'KitchenUtensilsIcon', text: 'Kitchen' },
  { icon: 'Beach02FreeIcons', text: 'Beachfront' },
  { icon: 'PinLocation03Icon', text: 'City center' },
]

export default function AmenitiesChips({
  className,
  data = DEMO_DATA,
}: {
  className?: string
  data?: { icon: string; text: string }[]
}) {
  return (
    <div className={clsx('flex flex-wrap items-center gap-1.5', className)}>
      {data.map((item, index) => (
        <LightChip key={index}>
          <HugeiconsIcon
            icon={ICONS_MAP[item.icon] || CheckmarkCircle02Icon}
            size={16}
            color="currentColor"
            strokeWidth={1.5}
          />
          {item.text}
        </LightChip>
      ))}
    </div>
  )
}
