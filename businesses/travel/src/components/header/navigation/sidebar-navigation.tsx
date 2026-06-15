'use client'

import ButtonPrimary from '@/components/button-primary'
import { Divider } from '@/components/divider'
import { Link } from '@/components/link'
import SocialsList from '@/components/socials-list'
import { Text } from '@/components/text'
import { getMegaMenuItems } from '@/data/navigation'
import { Disclosure, DisclosureButton, DisclosurePanel, useClose } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import clsx from 'clsx'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'
import CurrLangDropdown from '../curr-lang-dropdown'

interface Props {}

// DEMO DATA
const megaMenuItems = getMegaMenuItems()

type TMenuItem = (typeof megaMenuItems)[0]

const SidebarNavigation: React.FC<Props> = () => {
  const handleClose = useClose()
  const router = useRouter()

  // Prefetch the next step to improve performance
  useEffect(() => {
    router.prefetch('/stay-search-with-map')
  }, [router])

  // Handle form submission
  const handleSubmitForm = async (formData: FormData) => {
    const formObject = Object.fromEntries(formData.entries())
    // Handle form submission logic here
    console.log('Form submitted:', formObject)
    const searchQuery = formObject.search as string
    // Close the popover
    handleClose()
    // Redirect to the search page
    router.push('/stay-categories/all' + (searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''))
  }

  const _renderMenuChild = (item: TMenuItem) => {
    return (
      <ul className="nav-mobile-sub-menu border-l border-border ps-4 pb-1">
        {item.children?.map((childMenu, index) => (
          <Disclosure key={index} as="li">
            <Link
              href={childMenu.href || '#'}
              onClick={handleClose}
              className={clsx('mt-0.5 flex rounded-lg px-3 text-sm font-[450] text-foreground hover:bg-accent')}
            >
              <p className={clsx('py-2.5', !childMenu.children && 'block w-full')}>{childMenu.title}</p>
              {childMenu.children && (
                <span className="flex grow items-center" onClick={(e) => e.preventDefault()}>
                  <DisclosureButton as="span" className="flex grow justify-end">
                    <ChevronDownIcon className="ms-2 size-4 text-muted-foreground" aria-hidden="true" />
                  </DisclosureButton>
                </span>
              )}
            </Link>
            {childMenu.children && <DisclosurePanel>{_renderMenuChild(childMenu)}</DisclosurePanel>}
          </Disclosure>
        ))}
      </ul>
    )
  }

  const _renderItem = (menu: TMenuItem) => {
    return (
      <Disclosure key={menu.title} as="li" className="text-foreground">
        <DisclosureButton className="flex w-full cursor-pointer rounded-lg px-3 text-start hover:bg-accent">
          <p className={clsx(!menu.children?.length && 'flex-1', 'block py-2.5 text-sm font-[450] uppercase')}>
            {menu.title}
          </p>
          {menu.children?.length && (
            <div className="flex flex-1 justify-end">
              <ChevronDownIcon className="me-2 size-4 self-center text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </DisclosureButton>
        {menu.children && <DisclosurePanel>{_renderMenuChild(menu)}</DisclosurePanel>}
      </Disclosure>
    )
  }

  const renderSearchForm = () => {
    return (
      <Form className="flex-1 text-foreground" action={handleSubmitForm}>
        <div className="flex h-full items-center gap-x-2.5 rounded-xl bg-accent px-3 py-3">
          <HugeiconsIcon icon={Search01Icon} size={24} />
          <input
            type="search"
            name="search"
            autoFocus
            autoComplete="off"
            aria-label="Search for articles"
            data-autofocus
            placeholder="Type and press enter"
            className="w-full border-none bg-transparent focus:ring-0 focus:outline-hidden sm:text-sm"
          />
        </div>
        <input type="submit" hidden value="" />
      </Form>
    )
  }

  return (
    <div>
      <Text className="text-muted-foreground">
        Discover the most outstanding articles on all topics of life. Write your stories and share them
      </Text>

      <SocialsList className="mt-5 gap-x-5 sm:gap-x-6" />
      <div className="mt-7">{renderSearchForm()}</div>
      <ul className="flex flex-col gap-y-1 px-2 py-6">{megaMenuItems?.map(_renderItem)}</ul>
      <Divider className="mb-6" />

      {/* FOR OUR DEMO */}
      <div className="flex items-center justify-between gap-x-2.5 py-6">
        <ButtonPrimary href="#" target="_blank" rel="noopener noreferrer">
          Buy this template
        </ButtonPrimary>

        <CurrLangDropdown
          panelAnchor={{
            to: 'top end',
            gap: 12,
          }}
          panelClassName="z-10 w-72 p-4!"
        />
      </div>
    </div>
  )
}

export default SidebarNavigation
