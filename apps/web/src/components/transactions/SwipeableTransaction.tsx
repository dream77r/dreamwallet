'use client'

import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'

interface SwipeableTransactionProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
}

export function SwipeableTransaction({ children, onEdit, onDelete }: SwipeableTransactionProps) {
  const x = useMotionValue(0)
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null)

  const editOpacity = useTransform(x, [0, 80], [0, 1])
  const deleteOpacity = useTransform(x, [-80, 0], [1, 0])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > 80 && onEdit) {
      setSwiped('right')
      onEdit()
    } else if (info.offset.x < -80 && onDelete) {
      setSwiped('left')
      onDelete()
    }
    setSwiped(null)
  }

  return (
    <div className="relative overflow-hidden">
      {/* Edit action (right swipe) */}
      <div className="absolute inset-y-0 left-0 flex items-center px-4 bg-primary/10">
        <Pencil className="h-5 w-5 text-primary" style={{ opacity: editOpacity as unknown as number }} />
      </div>
      {/* Delete action (left swipe) */}
      <div className="absolute inset-y-0 right-0 flex items-center px-4 bg-destructive/10">
        <Trash2 className="h-5 w-5 text-destructive" style={{ opacity: deleteOpacity as unknown as number }} />
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card z-10"
      >
        {children}
      </motion.div>
    </div>
  )
}
