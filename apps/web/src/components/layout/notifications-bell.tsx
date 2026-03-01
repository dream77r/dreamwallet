'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'

type NotificationType =
  | 'BUDGET_WARNING'
  | 'BUDGET_EXCEEDED'
  | 'LARGE_TRANSACTION'
  | 'BANK_SYNC_ERROR'
  | 'BANK_SYNC_COMPLETE'
  | 'SYSTEM'

interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  isRead: boolean
  createdAt: string | Date
}

const typeEmoji: Record<NotificationType, string> = {
  BUDGET_WARNING: '⚠️',
  BUDGET_EXCEEDED: '🔴',
  LARGE_TRANSACTION: '💸',
  BANK_SYNC_ERROR: '❌',
  BANK_SYNC_COMPLETE: '✅',
  SYSTEM: 'ℹ️',
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins} мин назад`
  if (hours < 24) return `${hours} ч назад`
  return `${days} д назад`
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const utils = trpc.useUtils()

  const { data: notifications = [] } = trpc.settings.getNotifications.useQuery()

  const markAllRead = trpc.settings.markAllNotificationsRead.useMutation({
    onSuccess: () => utils.settings.getNotifications.invalidate(),
  })

  const markRead = trpc.settings.markNotificationRead.useMutation({
    onSuccess: () => utils.settings.getNotifications.invalidate(),
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    // Отмечаем все прочитанными при открытии
    if (isOpen && unreadCount > 0) {
      markAllRead.mutate()
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h4 className="text-sm font-semibold">Уведомления</h4>
          {notifications.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} новых` : 'Всё прочитано'}
            </span>
          )}
        </div>

        <Separator />

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">Уведомлений пока нет</p>
          </div>
        ) : (
          <ScrollArea className="h-[340px]">
            <div className="divide-y">
              {notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors hover:bg-muted/50',
                    !n.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
                  )}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ id: n.id })
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-base leading-none">
                      {typeEmoji[n.type as NotificationType] ?? 'ℹ️'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('truncate text-sm', !n.isRead && 'font-medium')}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
