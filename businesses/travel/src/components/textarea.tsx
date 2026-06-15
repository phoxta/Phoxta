import React, { TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className = '', children, ...args }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`block w-full rounded-2xl border border-input bg-card px-4 py-3 ${className}`}
      rows={4}
      {...args}
    >
      {children}
    </textarea>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
