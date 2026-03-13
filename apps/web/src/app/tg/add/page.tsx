'use client'

import { useState, useEffect } from 'react'
import { useTelegram } from '@/components/telegram/TelegramProvider'

export default function TgAddPage() {
  const { isReady, isError, fetchWithAuth } = useTelegram()
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Use MainButton from Telegram SDK
  useEffect(() => {
    if (!isReady) return

    async function setupMainButton() {
      const WebApp = (await import('@twa-dev/sdk')).default
      WebApp.MainButton.setText('Добавить')
      WebApp.MainButton.show()

      const handler = async () => {
        if (!description.trim() || !amount) return

        WebApp.MainButton.showProgress()
        setSubmitting(true)

        try {
          const res = await fetchWithAuth('/api/tg/add', {
            method: 'POST',
            body: JSON.stringify({
              description: description.trim(),
              amount: parseFloat(amount),
              type,
            }),
          })

          if (res.ok) {
            const data = await res.json() as { category?: string }
            setResult({
              success: true,
              message: `${type === 'EXPENSE' ? 'Расход' : 'Доход'} добавлен${data.category ? ` → ${data.category}` : ''}`,
            })
            setDescription('')
            setAmount('')
          } else {
            setResult({ success: false, message: 'Ошибка при добавлении' })
          }
        } catch {
          setResult({ success: false, message: 'Ошибка сети' })
        } finally {
          WebApp.MainButton.hideProgress()
          setSubmitting(false)
        }
      }

      WebApp.MainButton.onClick(handler)
      return () => {
        WebApp.MainButton.offClick(handler)
        WebApp.MainButton.hide()
      }
    }

    const cleanup = setupMainButton()
    return () => { cleanup.then(fn => fn?.()) }
  }, [isReady, description, amount, type, fetchWithAuth])

  if (isError) {
    return <p className="text-center text-muted-foreground pt-20">Аккаунт не привязан</p>
  }

  if (!isReady) {
    return <div className="animate-pulse space-y-4 pt-4"><div className="h-10 bg-muted rounded" /><div className="h-10 bg-muted rounded" /></div>
  }

  return (
    <div className="space-y-5">
      <p className="text-lg font-semibold">Новая транзакция</p>

      {/* Type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            type === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground'
          }`}
          onClick={() => setType('EXPENSE')}
        >
          Расход
        </button>
        <button
          type="button"
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
            type === 'INCOME' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
          }`}
          onClick={() => setType('INCOME')}
        >
          Доход
        </button>
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm text-muted-foreground">Сумма</label>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-2xl font-bold outline-none focus:ring-2 focus:ring-primary"
          min="0.01"
          step="0.01"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm text-muted-foreground">Описание</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Кофе, такси, зарплата..."
          className="mt-1 w-full rounded-xl border bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
          maxLength={200}
        />
      </div>

      {/* Result message */}
      {result && (
        <div className={`rounded-xl p-3 text-sm text-center ${
          result.success ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
        }`}>
          {result.message}
        </div>
      )}

      {/* Fallback submit button (for non-SDK environments) */}
      <button
        type="button"
        disabled={submitting || !description.trim() || !amount}
        onClick={async () => {
          if (!description.trim() || !amount) return
          setSubmitting(true)
          try {
            const res = await fetchWithAuth('/api/tg/add', {
              method: 'POST',
              body: JSON.stringify({
                description: description.trim(),
                amount: parseFloat(amount),
                type,
              }),
            })
            if (res.ok) {
              const data = await res.json() as { category?: string }
              setResult({
                success: true,
                message: `${type === 'EXPENSE' ? 'Расход' : 'Доход'} добавлен${data.category ? ` → ${data.category}` : ''}`,
              })
              setDescription('')
              setAmount('')
            } else {
              setResult({ success: false, message: 'Ошибка' })
            }
          } catch {
            setResult({ success: false, message: 'Ошибка сети' })
          } finally {
            setSubmitting(false)
          }
        }}
        className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? 'Добавление...' : 'Добавить'}
      </button>
    </div>
  )
}
