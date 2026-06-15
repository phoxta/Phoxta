'use client'

import { Menu01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAside } from '../aside'
import { ButtonCircle, ButtonProps } from '../button'

interface Props {
  className?: string
  buttonClassName?: string
  buttonColor?: ButtonProps['color']
}

const HamburgerBtnMenu = ({ buttonClassName, buttonColor = 'accent' }: Props) => {
  const { open: openAside } = useAside()

  return (
    <ButtonCircle onClick={() => openAside('sidebar-navigation')} color={buttonColor} className={buttonClassName}>
      <span className="sr-only">Open main menu</span>
      <HugeiconsIcon icon={Menu01Icon} size={24} />
    </ButtonCircle>
  )
}

export default HamburgerBtnMenu
