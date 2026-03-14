'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { staggerContainer, fadeUp } from '@/lib/motion'
import { forwardRef, type ReactNode } from 'react'

interface StaggerListProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
}

export const StaggerList = forwardRef<HTMLDivElement, StaggerListProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {children}
    </motion.div>
  ),
)
StaggerList.displayName = 'StaggerList'

interface StaggerItemProps extends HTMLMotionProps<'div'> {
  children: ReactNode
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={fadeUp}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
StaggerItem.displayName = 'StaggerItem'
