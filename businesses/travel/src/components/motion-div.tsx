'use client'

import { motion } from 'motion/react'
import { ComponentProps } from 'react'

export function MotionDiv(props: ComponentProps<typeof motion.div>) {
  return <motion.div {...props} />
}
