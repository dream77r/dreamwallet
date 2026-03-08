'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { QuickAddModal } from './QuickAddModal'

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="
          fixed bottom-6 right-6 z-50
          flex items-center justify-center
          w-14 h-14 md:w-12 md:h-12
          rounded-full bg-primary text-primary-foreground shadow-lg
          hover:bg-primary/90 active:scale-95
          transition-all duration-200 ease-out
          animate-in fade-in zoom-in-75
        "
        aria-label="Быстрое добавление транзакции"
      >
        <Plus className="h-6 w-6 md:h-5 md:w-5" />
      </button>
      <QuickAddModal open={open} onOpenChange={setOpen} />
    </>
  )
}
