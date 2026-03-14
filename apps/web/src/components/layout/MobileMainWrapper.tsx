'use client'

import dynamic from 'next/dynamic'
import { useIsMobile } from '@/hooks/use-mobile'
import { trpc } from '@/lib/trpc/client'
import { type ReactNode, useCallback } from 'react'

const PullToRefresh = dynamic(
  () => import('@/components/ui/pull-to-refresh').then(m => m.PullToRefresh),
  { ssr: false }
)

export function MobileMainWrapper({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const utils = trpc.useUtils()

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      utils.wallet.get.invalidate(),
      utils.wallet.getStats.invalidate(),
      utils.wallet.dashboardData.invalidate(),
      utils.transaction.list.invalidate(),
    ])
  }, [utils])

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {children}
    </PullToRefresh>
  )
}
