'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Zap, CheckCircle, XCircle, Loader2, TestTube } from 'lucide-react'
import { toast } from 'sonner'
import { OPENROUTER_MODELS } from '@/server/routers/ai'

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free:     { label: 'Бесплатно', color: 'bg-green-100 text-green-700' },
  fast:     { label: 'Быстрая',   color: 'bg-blue-100 text-blue-700'  },
  balanced: { label: 'Баланс',    color: 'bg-violet-100 text-violet-700' },
  powerful: { label: 'Мощная',    color: 'bg-orange-100 text-orange-700' },
}

export default function AdminAiPage() {
  const { data, refetch } = trpc.ai.getAllModels.useQuery()
  const [enabledIds, setEnabledIds] = useState<string[]>([])
  const [defaultModel, setDefaultModel] = useState<string>('')
  const [initialized, setInitialized] = useState(false)

  // Initialize state from server data
  if (data && !initialized) {
    setEnabledIds(data.enabledIds.length > 0 ? data.enabledIds : [OPENROUTER_MODELS[0].id])
    setDefaultModel(data.enabledIds[0] ?? OPENROUTER_MODELS[0].id)
    setInitialized(true)
  }

  const saveMutation = trpc.ai.setAvailableModels.useMutation({
    onSuccess: () => { toast.success('Настройки сохранены'); refetch() },
    onError: (e) => toast.error(e.message),
  })

  const testMutation = trpc.ai.testConnection.useMutation({
    onSuccess: (r) => toast.success(`✅ ${r.model}: "${r.response}"`),
    onError: (e) => toast.error(e.message),
  })

  const toggleModel = (id: string) => {
    setEnabledIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id)
        if (defaultModel === id && next.length > 0) setDefaultModel(next[0])
        return next.length === 0 ? prev : next // must have at least one
      }
      return [...prev, id]
    })
  }

  const providers = [...new Set(OPENROUTER_MODELS.map(m => m.provider))]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            AI-настройки
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Управление моделями OpenRouter для пользователей
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.hasApiKey ? (
            <Badge className="bg-green-100 text-green-700 gap-1">
              <CheckCircle className="h-3 w-3" /> API ключ активен
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 gap-1">
              <XCircle className="h-3 w-3" /> OPENROUTER_API_KEY не задан
            </Badge>
          )}
        </div>
      </div>

      {/* Model selection by provider */}
      {providers.map(provider => (
        <Card key={provider}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{provider}</CardTitle>
            <CardDescription>
              {enabledIds.filter(id => OPENROUTER_MODELS.find(m => m.id === id && m.provider === provider)).length} из{' '}
              {OPENROUTER_MODELS.filter(m => m.provider === provider).length} моделей включено
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {OPENROUTER_MODELS.filter(m => m.provider === provider).map(model => {
              const tier = TIER_LABELS[model.tier] ?? { label: model.tier, color: 'bg-gray-100 text-gray-700' }
              const isEnabled = enabledIds.includes(model.id)
              return (
                <div key={model.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleModel(model.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{model.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tier.color}`}>
                        {tier.label}
                      </span>
                      {model.costPer1k === 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">FREE</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{model.id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {model.costPer1k > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        ${(model.costPer1k * 1000).toFixed(2)} / 1M токенов
                      </p>
                    ) : (
                      <p className="text-xs text-green-600">Бесплатно</p>
                    )}
                    {isEnabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs mt-1"
                        onClick={() => testMutation.mutate({ model: model.id })}
                        disabled={testMutation.isPending}
                      >
                        <TestTube className="h-3 w-3 mr-1" />
                        Тест
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {/* Default model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Модель по умолчанию
          </CardTitle>
          <CardDescription>
            Используется для новых пользователей, которые ещё не выбрали модель
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label>Модель</Label>
            <Select value={defaultModel} onValueChange={setDefaultModel}>
              <SelectTrigger className="w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enabledIds.map(id => {
                  const m = OPENROUTER_MODELS.find(x => x.id === id)
                  return m ? (
                    <SelectItem key={id} value={id}>{m.name} ({m.provider})</SelectItem>
                  ) : null
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate({ modelIds: enabledIds, defaultModel })}
          disabled={saveMutation.isPending || enabledIds.length === 0}
          className="min-w-32"
        >
          {saveMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохраняю...</>
          ) : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  )
}
