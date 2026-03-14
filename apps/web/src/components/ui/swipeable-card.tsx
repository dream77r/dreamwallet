'use client'

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

interface SwipeableCardProps {
  children: ReactNode
  className?: string
  /** Called when swiped left (delete action) */
  onDelete?: () => void
  /** Called when swiped right (edit action) */
  onEdit?: () => void
  /** Disable swipe gestures */
  disabled?: boolean
}

const SWIPE_THRESHOLD = 80

export function SwipeableCard({
  children,
  className,
  onDelete,
  onEdit,
  disabled,
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null)

  // Action backgrounds opacity based on drag distance
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])
  const editOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (disabled) return

    if (info.offset.x < -SWIPE_THRESHOLD && onDelete) {
      setSwiped('left')
      onDelete()
    } else if (info.offset.x > SWIPE_THRESHOLD && onEdit) {
      setSwiped('right')
      onEdit()
    }
  }

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('relative overflow-hidden rounded-2xl', className)}>
      {/* Delete action (swipe left) */}
      {onDelete && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-end px-6 bg-expense rounded-2xl"
          style={{ opacity: deleteOpacity }}
        >
          <Trash2 className="h-5 w-5 text-white" />
        </motion.div>
      )}

      {/* Edit action (swipe right) */}
      {onEdit && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center justify-start px-6 bg-primary rounded-2xl"
          style={{ opacity: editOpacity }}
        >
          <Pencil className="h-5 w-5 text-white" />
        </motion.div>
      )}

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: onDelete ? -120 : 0, right: onEdit ? 120 : 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-card touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  )
}
