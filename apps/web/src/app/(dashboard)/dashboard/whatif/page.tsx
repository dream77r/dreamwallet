'use client'

import { trpc } from '@/lib/trpc/client'
import { GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

export const dynamic = 'force-dynamic'

export default function WhatIfPage() {
  const suggestMutation = trpc.whatif.suggestScenarios.useMutation()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Что если?"
        actions={
          <Button onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending}>
            {suggestMutation.isPending ? 'Анализ...' : 'Предложить сценарии'}
          </Button>
        }
      />

      {!suggestMutation.data && (
        <div className="glass-card card-default rounded-2xl p-8 text-center space-y-3">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/70" />
          <p className="text-muted-foreground">Моделируйте изменения бюджета и смотрите прогноз</p>
          <p className="text-sm text-muted-foreground/70">Нажмите «Предложить сценарии» для AI-анализа</p>
        </div>
      )}

      {suggestMutation.data && (
        <div className="space-y-4">
          {(suggestMutation.data as any[]).map((scenario: any, i: number) => (
            <div key={i} className="glass-card card-default rounded-2xl p-5">
              <h3 className="font-semibold">{scenario.name}</h3>
              <p className="text-sm text-income mt-1">
                Экономия: ~{scenario.estimatedSaving?.toLocaleString('ru-RU')} ₽/мес
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
