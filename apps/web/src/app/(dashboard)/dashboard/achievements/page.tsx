'use client'

import { trpc } from '@/lib/trpc/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Достижения</h1>
        <Button variant="outline" size="sm" onClick={() => checkNow.mutate()}>
          Проверить
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-3xl">
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{streak?.currentStreak ?? 0}</p>
            <p className="text-xs text-gray-500">Стрик дней</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{level}</p>
            <p className="text-xs text-gray-500">Уровень</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{points}</p>
            <p className="text-xs text-gray-500">Очки</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardContent className="p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{achievements?.filter(a => a.earned).length ?? 0}</p>
            <p className="text-xs text-gray-500">Бейджей</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Бейджи</h2>
        {achievements && achievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">🏆</span>
            <p className="text-lg font-semibold text-[#1C1C1E] mb-1">Пока нет достижений</p>
            <p className="text-sm text-[#8E8E93] mb-4">Добавляйте транзакции и ведите учёт, чтобы получать бейджи</p>
            <button onClick={() => checkNow.mutate()} className="text-sm font-semibold text-[#007AFF]">Проверить достижения →</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {achievements?.map(a => (
              <Card key={a.type} className={`rounded-3xl ${a.earned ? '' : 'opacity-40'}`}>
                <CardContent className="p-4 text-center">
                  <span className="text-3xl">{a.icon}</span>
                  <p className="text-xs font-medium mt-1">{a.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Challenges */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Челленджи</h2>
        {challenges?.active.map(c => (
          <Card key={c.id} className="rounded-3xl mb-3">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-gray-500">Прогресс: {c.progress}/{c.target}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  до {new Date(c.endsAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="mt-2 bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 rounded-full h-2 transition-all" style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}

        <h3 className="text-sm font-semibold text-gray-500 mt-4 mb-2">Доступные челленджи</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challenges?.templates.map((t, i) => (
            <Card key={t.type} className="rounded-3xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-gray-500">{t.durationDays} дн · {t.points} очков</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => startChallenge.mutate({ templateIndex: i })}>
                  Начать
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
