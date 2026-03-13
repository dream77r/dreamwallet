'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ProfileValue = 'beginner' | 'experienced' | 'business'

const PROFILES: {
  value: ProfileValue
  icon: string
  title: string
  desc: string
}[] = [
  {
    value: 'beginner',
    icon: '🎯',
    title: 'Хочу начать копить',
    desc: 'Разберусь в тратах и начну откладывать',
  },
  {
    value: 'experienced',
    icon: '📊',
    title: 'Веду учёт, хочу глубже',
    desc: 'Аналитика, прогнозы, автоматизация',
  },
  {
    value: 'business',
    icon: '💼',
    title: 'Управляю бизнесом',
    desc: 'Выручка, налоги, проекты',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<ProfileValue | null>(null)

  const { data: settings, isLoading } = trpc.settings.get.useQuery()

  const setUserProfile = trpc.settings.setUserProfile.useMutation({
    onError: (err) => {
      toast.error('Не удалось сохранить профиль: ' + err.message)
    },
  })

  // Redirect if already onboarded or profile already set
  useEffect(() => {
    if (!settings) return
    if (settings.onboardingDone || settings.userProfile) {
      router.replace('/dashboard')
    }
  }, [settings, router])

  async function handleContinue() {
    if (!selected) return
    await setUserProfile.mutateAsync({ profile: selected })
    router.push('/dashboard')
  }

  function handleSkip() {
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const name = settings?.name ?? ''
  const initials = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Avatar + greeting */}
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold select-none">
            {initials}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Привет{name ? `, ${name}` : ''}!
          </h1>
          <p className="text-base text-muted-foreground">
            Как планируете использовать DreamWallet?
          </p>
        </div>

        {/* Profile cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {PROFILES.map((profile) => {
            const isSelected = selected === profile.value
            return (
              <button
                key={profile.value}
                type="button"
                onClick={() => setSelected(profile.value)}
                className={cn(
                  'rounded-2xl border-2 p-5 cursor-pointer transition-all text-left flex flex-col gap-2',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <span className="text-4xl leading-none">{profile.icon}</span>
                <span className="font-semibold text-sm leading-snug mt-1">
                  {profile.title}
                </span>
                <span className="text-xs text-muted-foreground leading-snug">
                  {profile.desc}
                </span>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <Button
            className="w-full"
            size="lg"
            disabled={!selected || setUserProfile.isPending}
            onClick={handleContinue}
          >
            {setUserProfile.isPending ? 'Сохраняем...' : 'Продолжить'}
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Пропустить
          </button>
        </div>

      </div>
    </div>
  )
}
