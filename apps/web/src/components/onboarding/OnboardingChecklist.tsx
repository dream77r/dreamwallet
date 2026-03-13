'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskId = 'account' | 'transaction' | 'telegram' | 'import' | 'budget' | 'goal'

interface OnboardingTask {
  id: string
  label: string
  icon: string
  done: boolean
  required: boolean
}

// ── Circular progress ring ────────────────────────────────────────────────────

function ProgressRing({
  completed,
  total,
  allDone,
}: {
  completed: number
  total: number
  allDone: boolean
}) {
  const size = 56
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? completed / total : 0
  const dashOffset = circumference * (1 - progress)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-blue-100 dark:text-blue-900/40"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn(
            'transition-all duration-700 ease-out',
            allDone ? 'text-green-500' : 'text-blue-500'
          )}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        {allDone ? (
          <span className="text-base leading-none" role="img" aria-label="готово">
            🎉
          </span>
        ) : (
          <span
            className={cn(
              'text-xs font-semibold tabular-nums leading-none',
              'text-blue-700 dark:text-blue-300'
            )}
          >
            {completed}/{total}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Task chip ─────────────────────────────────────────────────────────────────

function TaskChip({
  task,
  onClick,
}: {
  task: OnboardingTask
  onClick: () => void
}) {
  if (task.done) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium',
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          'line-through opacity-60 select-none'
        )}
      >
        <span className="not-italic no-underline" aria-hidden="true">
          ✓
        </span>
        <span>{task.icon}</span>
        <span>{task.label}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium',
        'border border-border bg-white dark:bg-card text-foreground',
        'transition-colors hover:border-primary hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !task.required && 'opacity-70'
      )}
    >
      <span>{task.icon}</span>
      <span>{task.label}</span>
      {!task.required && (
        <span className="ml-0.5 rounded bg-muted px-1 py-px text-[10px] font-normal text-muted-foreground">
          опц.
        </span>
      )}
    </button>
  )
}

// ── Confetti burst (CSS-only) ─────────────────────────────────────────────────

function ConfettiBurst() {
  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-12px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(24px)  rotate(360deg); opacity: 0; }
        }
        .confetti-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 2px;
          animation: confetti-fall 1.2s ease-in forwards;
        }
      `}</style>
      {[
        { color: '#3B82F6', left: '15%', delay: '0ms',   rotate: '20deg'  },
        { color: '#F59E0B', left: '28%', delay: '80ms',  rotate: '-15deg' },
        { color: '#10B981', left: '42%', delay: '40ms',  rotate: '35deg'  },
        { color: '#8B5CF6', left: '56%', delay: '120ms', rotate: '-25deg' },
        { color: '#EF4444', left: '70%', delay: '20ms',  rotate: '10deg'  },
        { color: '#F97316', left: '82%', delay: '90ms',  rotate: '-40deg' },
      ].map((p, i) => (
        <span
          key={i}
          className="confetti-particle pointer-events-none"
          style={{
            backgroundColor: p.color,
            left: p.left,
            top: 0,
            animationDelay: p.delay,
            transform: `rotate(${p.rotate})`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function OnboardingChecklist() {
  const router = useRouter()
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery()
  const { data: progress, isLoading: progressLoading } = trpc.settings.getOnboardingProgress.useQuery()
  const utils = trpc.useUtils()

  const completeOnboarding = trpc.settings.completeOnboarding.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate()
    },
    onError: (err) => {
      toast.error('Не удалось закрыть баннер: ' + err.message)
    },
  })

  const tasks: OnboardingTask[] = progress?.tasks ?? []
  const completed = progress?.completed ?? 0
  const total = progress?.total ?? 0
  const allDone = total > 0 && completed === total

  // Auto-dismiss when all tasks are done
  useEffect(() => {
    if (allDone && !completeOnboarding.isPending) {
      autoDismissRef.current = setTimeout(() => {
        completeOnboarding.mutate()
      }, 3000)
    }
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [allDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render when loading or already done
  if (settingsLoading || progressLoading) return null
  if ((settings as any)?.onboardingDone) return null

  function handleDismiss() {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    completeOnboarding.mutate()
  }

  function handleTaskClick(taskId: string) {
    const routes: Record<string, () => void> = {
      account:     () => router.push('/dashboard/accounts'),
      transaction: () => router.push('/dashboard/transactions'),
      telegram:    () => window.open('https://t.me/newdteam_bot', '_blank'),
      import:      () => router.push('/dashboard/import'),
      budget:      () => router.push('/dashboard/budgets'),
      goal:        () => router.push('/dashboard/goals'),
    }
    routes[taskId as TaskId]?.()
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-3xl border py-0 shadow-none',
        'bg-gradient-to-r from-blue-50 to-indigo-50',
        'dark:from-blue-950/20 dark:to-indigo-950/20',
        'border-blue-100 dark:border-blue-900/30'
      )}
    >
      {/* Confetti burst when all done */}
      {allDone && <ConfettiBurst />}

      <CardContent className="px-4 py-3.5">
        <div className="flex items-center gap-4">
          {/* Left: circular progress */}
          <ProgressRing completed={completed} total={total} allDone={allDone} />

          {/* Right: title + task chips */}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground leading-tight mb-2">
              {allDone ? 'Всё готово! 🎉' : 'Настройте DreamWallet'}
            </p>

            {/* Horizontal scrollable chips */}
            <div
              className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {tasks.map((task) => (
                <TaskChip
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task.id)}
                />
              ))}
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'shrink-0 self-start h-7 w-7 rounded-full',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-blue-100/60 dark:hover:bg-blue-900/30'
            )}
            onClick={handleDismiss}
            disabled={completeOnboarding.isPending}
            aria-label="Закрыть"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
