'use client'

import { HTMLMotionProps, motion } from 'motion/react'
import { ReactNode } from 'react'

interface FadeInProps extends HTMLMotionProps<'div'> {
  children: ReactNode
}

export const FadeIn = ({ children, ...rest }: FadeInProps) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3 }} {...rest}>
      {children}
    </motion.div>
  )
}
