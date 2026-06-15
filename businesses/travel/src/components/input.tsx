import React, { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  sizeClass?: string
  fontClass?: string
  rounded?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      sizeClass = 'h-11 px-4 py-3',
      fontClass = 'sm:text-sm font-normal',
      rounded = 'rounded-full',
      children,
      type = 'text',
      ...args
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`block w-full border border-input bg-card ${rounded} ${fontClass} ${sizeClass} ${className}`}
        {...args}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input
