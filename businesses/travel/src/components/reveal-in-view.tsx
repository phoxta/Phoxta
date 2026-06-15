'use client'

import { HTMLMotionProps, motion } from 'framer-motion'
import { ReactNode } from 'react'

// Định nghĩa 3 mốc thời điểm trigger
type TriggerPosition = 'start' | 'middle' | 'top'

interface RevealInViewProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  triggerPosition?: TriggerPosition
}

export const RevealInView = ({ children, triggerPosition = 'start', ...rest }: RevealInViewProps) => {
  // Hàm tính toán margin dựa trên vị trí mong muốn
  const getViewportMargin = (position: TriggerPosition) => {
    switch (position) {
      case 'middle':
        // Cần scroll đến giữa màn hình (-50% từ dưới lên) mới trigger
        return '0px 0px -50% 0px'
      case 'top':
        // Cần scroll đến gần trên cùng (-90% từ dưới lên) mới trigger
        return '0px 0px -90% 0px'
      case 'start':
      default:
        // Đợi một chút (15%) sau khi xuất hiện ở đáy màn hình để tránh hiệu ứng giật
        return '0px 0px -15% 0px'
    }
  }

  return (
    <motion.div
      // Trạng thái ban đầu
      initial={{ opacity: 0, y: 25 }}
      // Trạng thái khi đi vào Viewport
      whileInView={{ opacity: 1, y: 0 }}
      // Cấu hình Viewport
      viewport={{
        once: true, // Chỉ chạy hiệu ứng ĐÚNG 1 LẦN
        margin: getViewportMargin(triggerPosition),
      }}
      // Cấu hình độ mượt
      transition={{
        duration: 1.3,
        ease: [0.25, 0.1, 0.25, 1], // Custom easing curve cho cảm giác mượt mà (Apple-like)
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
