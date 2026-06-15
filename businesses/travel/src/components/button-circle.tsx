import React from 'react'
import { ButtonCircle as ButtonCircleUI, ButtonProps } from './button'

const ButtonCircle: React.FC<ButtonProps> = ({ children, ...props }) => {
  return <ButtonCircleUI {...props}>{children}</ButtonCircleUI>
}

export default ButtonCircle
