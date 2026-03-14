'use client'

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { type ReactNode, useState, useCallback } from 'react'

interface PullToRefreshProps {
  children: ReactNode
  onRefresh: () => Promise<void>
}

export function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const y = useMotionValue(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const spinnerOpacity = useTransform(y, [0, 60], [0, 1])
  const spinnerScale = useTransform(y, [0, 60], [0.5, 1])

  const handleDragEnd = useCallback(async (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
  }, [isRefreshing, onRefresh])

  return (
    <div className="relative overflow-hidden">
      {/* Spinner indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center py-4 z-10"
        style={{ opacity: isRefreshing ? 1 : spinnerOpacity, scale: isRefreshing ? 1 : spinnerScale }}
      >
        <Loader2 className={`h-6 w-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
      </motion.div>

      <motion.div
        drag={isRefreshing ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 100 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        style={{ y: isRefreshing ? 48 : y }}
        animate={isRefreshing ? { y: 48 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
