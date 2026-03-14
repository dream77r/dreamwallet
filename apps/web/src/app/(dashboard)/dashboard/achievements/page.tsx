'use client'

import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Trophy, Flame, Star, Zap } from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

export default function AchievementsPage() {
  const { data: progress } = trpc.gamification.getProgress.useQuery()
  const { data: achievements } = trpc.gamification.listAchievements.useQuery()
  const { data: challenges } = trpc.gamification.listChallenges.useQuery()
  const startChallenge = trpc.gamification.startChallenge.useMutation({
    onSuccess: () => toast.success('Челлендж начат!'),
  })
  const checkNow = trpc.gamification.checkNow.useMutation({
    onSuccess: (data) => {
      if (data.newAchievements.length) toast.success(`Новые достижения: ${data.newAchievements.length}!`)
      else toast.info('Пока нет новых достижений')
    },
  })

  const streak = progress?.streak
  const level = streak?.level ?? 1
  const points = streak?.totalPoints ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Достижения"
        actions={
          <Button variant="outline" size="sm" onClick={() => checkNow.mutate()}>
            Проверить
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card card-default rounded-2xl p-4 text-center">
          <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
          <p className="text-2xl font-bold">{streak?.currentStreak ?? 0}</p>
          <p className="text-xs text-muted-foreground">Стрик дней</p>
        </div>
        <div className="glass-card card-default rounded-2xl p-4 text-center">
          <Star className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
          <p className="text-2xl font-bold">{level}</p>
          <p className="text-xs text-muted-foreground">Уровень</p>
        </div>
        <div className="glass-card card-default rounded-2xl p-4 text-center">
          <Zap className="h-6 w-6 mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold">{points}</p>
          <p className="text-xs text-muted-foreground">Очки</p>
        </div>
        <div className="glass-card card-default rounded-2xl p-4 text-center">
          <Trophy className="h-6 w-6 mx-auto mb-1 text-purple-500" />
          <p className="text-2xl font-bold">{achievements?.filter(a => a.earned).length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Бейджей</p>
        </div>
      </div>

      {/* Achievements grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Бейджи</h2>
        {achievements && achievements.length === 0 ? (
          <div className="glass-card card-default rounded-2xl flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">🏆</span>
            <p className="text-lg font-semibold mb-1">Пока нет достижений</p>
            <p className="text-sm text-muted-foreground mb-4">Добавляйте транзакции и ведите учёт, чтобы получать бейджи</p>
            <button onClick={() => checkNow.mutate()} className="text-sm font-semibold text-primary">Проверить достижения →</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {achievements?.map(a => (
              <div
                key={a.type}
                className={`glass-card card-interactive rounded-2xl p-4 text-center${a.earned ? '' : ' opacity-40 grayscale'}`}
              >
                <span className="text-3xl">{a.icon}</span>
                <p className={`text-xs font-medium mt-1${a.earned ? ' animate-gold-shimmer' : ''}`}>{a.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Challenges */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Челленджи</h2>
        {challenges?.active.map(c => (
          <div key={c.id} className="glass-card card-default rounded-2xl p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm text-muted-foreground">Прогресс: {c.progress}/{c.target}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                до {new Date(c.endsAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
            <div className="mt-2 bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }} />
            </div>
          </div>
        ))}

        <h3 className="text-sm font-semibold text-muted-foreground mt-4 mb-2">Доступные челленджи</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges?.templates.map((t, i) => (
            <div key={t.type} className="glass-card card-default rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.durationDays} дн · {t.points} очков</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => startChallenge.mutate({ templateIndex: i })}>
                Начать
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
