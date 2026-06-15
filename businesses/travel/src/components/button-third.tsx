import React from 'react'
import { Button, ButtonProps } from './button'

const ButtonThird: React.FC<ButtonProps> = ({ color, outline, plain, children, ...props }) => {
  return (
    <Button plain {...props}>
      {children}
    </Button>
  )
}
export default ButtonThird
