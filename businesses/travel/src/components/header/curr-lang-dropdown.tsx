'use client'

import { Link } from '@/components/link'
import { getCurrencies, getLanguages } from '@/data/navigation'
import {
  CloseButton,
  Popover,
  PopoverButton,
  PopoverPanel,
  PopoverPanelProps,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react'
import { Globe02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import { FC } from 'react'
import { ButtonCircle } from '../button'

const Currencies = ({ currencies }: { currencies: Awaited<ReturnType<typeof getCurrencies>> }) => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {currencies.map((item, index) => (
        <CloseButton
          as={Link}
          key={index}
          href={item.href}
          className={clsx(
            '-m-2.5 flex items-center rounded-lg p-2.5 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700',
            item.active ? 'bg-neutral-100 dark:bg-neutral-700' : 'opacity-80'
          )}
        >
          <div dangerouslySetInnerHTML={{ __html: item.icon }} />
          <p className="ms-2 text-sm font-medium">{item.name}</p>
        </CloseButton>
      ))}
    </div>
  )
}

const Languages = ({ languages }: { languages: Awaited<ReturnType<typeof getLanguages>> }) => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {languages.map((item, index) => (
        <CloseButton
          as={Link}
          href={item.href}
          key={index}
          className={clsx(
            '-m-2.5 flex items-center rounded-lg p-2.5 transition duration-150 ease-in-out hover:bg-neutral-100 focus:outline-hidden dark:hover:bg-neutral-700',
            item.active ? 'bg-neutral-100 dark:bg-neutral-700' : 'opacity-80'
          )}
        >
          <div>
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</p>
          </div>
        </CloseButton>
      ))}
    </div>
  )
}

interface Props {
  panelAnchor?: PopoverPanelProps['anchor']
  panelClassName?: PopoverPanelProps['className']

  className?: string
}

const CurrLangDropdown: FC<Props> = ({
  panelAnchor = {
    to: 'bottom end',
    gap: 12,
  },
  className,
  panelClassName = 'w-sm',
}) => {
  const currencies = getCurrencies()
  const languages = getLanguages()

  return (
    <Popover className={clsx('group', className)}>
      <PopoverButton as={ButtonCircle} color="accent">
        <HugeiconsIcon icon={Globe02Icon} size={22} />
      </PopoverButton>

      <PopoverPanel
        anchor={panelAnchor}
        transition
        className={clsx(
          'z-20 rounded-3xl shadow-lg-for-card bg-card p-6 transition duration-200 ease-in-out data-closed:translate-y-1 data-closed:opacity-0',
          panelClassName
        )}
      >
        <TabGroup>
          <TabList className="flex space-x-1 rounded-full bg-accent p-1">
            {['Language', 'Currency'].map((category) => (
              <Tab
                key={category}
                className={({ selected }) =>
                  clsx(
                    'w-full rounded-full py-2 text-sm leading-5 font-medium text-neutral-700 focus:ring-0 focus:outline-hidden',
                    selected
                      ? 'bg-white shadow-sm'
                      : 'text-neutral-700 hover:bg-white/70 dark:text-neutral-300 dark:hover:bg-neutral-900/40'
                  )
                }
              >
                {category}
              </Tab>
            ))}
          </TabList>
          <TabPanels className="mt-5">
            <TabPanel className="rounded-xl p-3 focus:ring-0 focus:outline-hidden">
              <Languages languages={languages} />
            </TabPanel>
            <TabPanel className="rounded-xl p-3 focus:ring-0 focus:outline-hidden">
              <Currencies currencies={currencies} />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </PopoverPanel>
    </Popover>
  )
}
export default CurrLangDropdown
