'use client'

import { trpc } from '@/lib/trpc/client'
import { Card, CardContent } from '@/components/ui/card'
import { GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function WhatIfPage() {
  const suggestMutation = trpc.whatif.suggestScenarios.useMutation()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Что если?</h1>
        <Button onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending}>
          {suggestMutation.isPending ? 'Анализ...' : 'Предложить сценарии'}
        </Button>
      </div>

      {!suggestMutation.data && (
        <Card className="rounded-3xl">
          <CardContent className="p-8 text-center space-y-3">
            <GitBranch className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-gray-500">Моделируйте изменения бюджета и смотрите прогноз</p>
            <p className="text-sm text-gray-400">Нажмите «Предложить сценарии» для AI-анализа</p>
          </CardContent>
        </Card>
      )}

      {suggestMutation.data && (
        <div className="space-y-4">
          {(suggestMutation.data as any[]).map((scenario: any, i: number) => (
            <Card key={i} className="rounded-3xl">
              <CardContent className="p-5">
                <h3 className="font-semibold">{scenario.name}</h3>
                <p className="text-sm text-green-600 mt-1">
                  Экономия: ~{scenario.estimatedSaving?.toLocaleString('ru-RU')} ₽/мес
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
