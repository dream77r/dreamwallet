'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { FlowTab } from '@/components/flow/FlowTab'

export default function DashboardPage() {
  const router = useRouter()
  const { data: settingsData } = trpc.settings.get.useQuery()

  useEffect(() => {
    if (settingsData && !settingsData.onboardingDone && !settingsData.userProfile) {
      router.replace('/onboarding')
    }
  }, [settingsData, router])

  return <FlowTab />
}
