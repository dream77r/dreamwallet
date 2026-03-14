'use client'

import { useMediaQuery } from '@/hooks/use-media-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, DrawerTrigger,
} from '@/components/ui/drawer'
import type { ReactNode } from 'react'

interface ResponsiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  trigger?: ReactNode
}

export function ResponsiveModal({ open, onOpenChange, children, trigger }: ResponsiveModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        {children}
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      {children}
    </Drawer>
  )
}

interface ResponsiveModalContentProps {
  children: ReactNode
  className?: string
}

export function ResponsiveModalContent({ children, className }: ResponsiveModalContentProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return <DialogContent className={className}>{children}</DialogContent>
  }

  return (
    <DrawerContent className={className}>
      <div className="mx-auto w-full max-w-lg px-4 pb-6 pt-2 max-h-[85vh] overflow-y-auto">
        {children}
      </div>
    </DrawerContent>
  )
}

export function ResponsiveModalHeader({ children, className }: { children: ReactNode; className?: string }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  if (isDesktop) return <DialogHeader className={className}>{children}</DialogHeader>
  return <DrawerHeader className={className}>{children}</DrawerHeader>
}

export function ResponsiveModalTitle({ children, className }: { children: ReactNode; className?: string }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  if (isDesktop) return <DialogTitle className={className}>{children}</DialogTitle>
  return <DrawerTitle className={className}>{children}</DrawerTitle>
}

export function ResponsiveModalDescription({ children, className }: { children: ReactNode; className?: string }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  if (isDesktop) return <DialogDescription className={className}>{children}</DialogDescription>
  return <DrawerDescription className={className}>{children}</DrawerDescription>
}

export function ResponsiveModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  if (isDesktop) return <DialogFooter className={className}>{children}</DialogFooter>
  return <DrawerFooter className={className}>{children}</DrawerFooter>
}

export function ResponsiveModalClose({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  if (isDesktop) return <DialogClose asChild>{children}</DialogClose>
  return <DrawerClose asChild>{children}</DrawerClose>
}
