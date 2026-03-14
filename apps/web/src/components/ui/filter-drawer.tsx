'use client'

import { useMediaQuery } from '@/hooks/use-media-query'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface FilterDrawerProps {
  children: ReactNode
  /** Number of active filters (shows badge) */
  activeCount?: number
  title?: string
  className?: string
  /** Called when "Apply" is pressed on mobile */
  onApply?: () => void
}

export function FilterDrawer({
  children,
  activeCount = 0,
  title = 'Фильтры',
  className,
  onApply,
}: FilterDrawerProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    // Desktop: inline filters
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {children}
      </div>
    )
  }

  // Mobile: drawer
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl relative">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Фильтры</span>
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg px-4 pb-6 pt-2">
          <DrawerHeader className="text-left px-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>
          <div className="flex flex-col gap-4 mt-2">
            {children}
          </div>
          {onApply && (
            <div className="mt-6">
              <DrawerClose asChild>
                <Button className="w-full rounded-xl h-12" onClick={onApply}>
                  Применить
                </Button>
              </DrawerClose>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
