'use client'

import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const XP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]

interface GamificationWidgetProps {
  data?: {
    streak: number
    level: number
    totalPoints: number
    activeChallenges: { id: string; title: string; progress: number; target: number }[]
    recentAchievements: { type: string; title: string; icon: string }[]
  } | null
  isLoading?: boolean
}

function getXpProgress(level: number, totalPoints: number) {
  const currentThreshold = XP_THRESHOLDS[level - 1] ?? 0
  const nextThreshold = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1]!
  const pointsInLevel = totalPoints - currentThreshold
  const pointsNeeded = nextThreshold - currentThreshold
  if (pointsNeeded <= 0) return 100
  return Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100))
}

export function GamificationWidget({ data, isLoading }: GamificationWidgetProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-card p-6 animate-fade-up">
        <Skeleton className="h-3 w-28 mb-5" />
        <div className="flex gap-3 mb-5">
          <Skeleton className="h-14 w-32 rounded-2xl" />
          <Skeleton className="h-14 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-3 w-24 mb-3" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="flex gap-2 mt-5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-3xl shadow-card p-6 animate-fade-up">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] mb-3">
          Достижения
        </p>
        <p className="text-sm text-[#8E8E93] text-center py-6">
          Начните вести расходы чтобы открывать достижения
        </p>
      </div>
    )
  }

  const xpPercent = getXpProgress(data.level, data.totalPoints)
  const nextThreshold = XP_THRESHOLDS[data.level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1]!
  const challengesToShow = data.activeChallenges.slice(0, 2)
  const achievementsToShow = data.recentAchievements.slice(0, 3)

  return (
    <div className="bg-white rounded-3xl shadow-card p-6 animate-fade-up">
      {/* Title */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] mb-4">
        Достижения
      </p>

      {/* Top row: streak + level */}
      <div className="flex gap-3 mb-5">
        {/* Streak badge */}
        <div className="flex items-center gap-2 bg-[#FF95001A] rounded-2xl px-4 py-2.5 shrink-0">
          <span className="text-xl leading-none">🔥</span>
          <div>
            <p className="text-base font-bold text-[#FF9500] leading-tight">{data.streak}</p>
            <p className="text-[10px] text-[#8E8E93] leading-tight">дней подряд</p>
          </div>
        </div>

        {/* Level badge */}
        <div className="flex-1 bg-[#007AFF1A] rounded-2xl px-4 py-2.5 min-w-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <p className="text-sm font-bold text-[#007AFF]">Ур.&nbsp;{data.level}</p>
            <p className="text-[10px] text-[#8E8E93]">
              {data.totalPoints}/{nextThreshold} XP
            </p>
          </div>
          <Progress
            value={xpPercent}
            className="h-1.5 bg-[#007AFF33]"
          />
        </div>
      </div>

      {/* Active challenges */}
      {challengesToShow.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] mb-2.5">
            Челленджи
          </p>
          <div className="space-y-2.5">
            {challengesToShow.map((ch) => {
              const pct = ch.target > 0 ? Math.min(100, Math.round((ch.progress / ch.target) * 100)) : 0
              return (
                <div key={ch.id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-sm text-gray-900 truncate pr-2">{ch.title}</p>
                    <p className="text-xs font-medium text-[#8E8E93] shrink-0">
                      {ch.progress}/{ch.target}
                    </p>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: '#007AFF' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent achievements */}
      {achievementsToShow.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {achievementsToShow.map((ach, i) => (
            <div
              key={`${ach.type}-${i}`}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-base"
              title={ach.title}
            >
              {ach.icon}
            </div>
          ))}
        </div>
      )}

      {/* Footer link */}
      <Link
        href="/dashboard/achievements"
        className="text-sm font-medium text-[#007AFF] hover:text-[#0056D6] transition-colors"
      >
        Все достижения →
      </Link>
    </div>
  )
}
