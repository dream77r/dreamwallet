import { Card, CardContent } from '@/components/ui/card'
import { Users, Receipt } from 'lucide-react'

interface ShareData {
  group: {
    name: string
  }
  participant: {
    name: string
  }
  expenses: {
    id: string
    description: string
    amount: number
    paidByName: string
    date: string
  }[]
  owes: {
    toName: string
    amount: number
  }[]
  totalOwed: number
}

async function getShareData(token: string): Promise<ShareData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/split/share/${token}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function ShareSplitPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getShareData(token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="rounded-3xl max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Ссылка недействительна или срок действия истёк</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{data.group.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Участник: {data.participant.name}
          </p>
        </div>

        {/* What you owe */}
        {data.owes.length > 0 && (
          <Card className="rounded-3xl">
            <CardContent className="p-5">
              <h2 className="font-semibold mb-3">Ваши долги</h2>
              <div className="space-y-2">
                {data.owes.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">→ {item.toName}</span>
                    <span className="font-semibold text-red-600 tabular-nums">
                      {item.amount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <span className="font-medium text-sm">Итого</span>
                <span className="font-bold text-red-600 tabular-nums">
                  {data.totalOwed.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {data.owes.length === 0 && (
          <Card className="rounded-3xl">
            <CardContent className="p-5 text-center">
              <p className="text-green-600 font-medium">Все расчёты завершены!</p>
            </CardContent>
          </Card>
        )}

        {/* Expenses */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold">Расходы группы</h2>
          </div>
          {data.expenses.length === 0 ? (
            <Card className="rounded-3xl">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">Пока нет расходов</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.expenses.map((expense) => (
                <Card key={expense.id} className="rounded-3xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{expense.description}</p>
                        <p className="text-xs text-gray-500">
                          Оплатил: {expense.paidByName} · {new Date(expense.date).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums text-sm">
                        {expense.amount.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          DreamWallet — деление расходов
        </p>
      </div>
    </div>
  )
}
