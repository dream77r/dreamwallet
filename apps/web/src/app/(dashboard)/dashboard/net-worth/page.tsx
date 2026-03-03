"use client"
import { trpc } from "@/lib/trpc/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Landmark, Banknote } from "lucide-react"
import { cn } from "@/lib/utils"

function formatAmount(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  BANK_ACCOUNT: "Банковский счёт",
  CASH: "Наличные",
  INVESTMENT: "Инвестиции",
  CRYPTO: "Крипто",
  CREDIT_CARD: "Кредитная карта",
  SAVINGS: "Накопительный",
  OTHER: "Другое",
}

export default function NetWorthPage() {
  const { data, isLoading } = trpc.wallet.netWorth.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Landmark className="h-10 w-10" />
        <p className="text-sm">Нет данных для расчёта чистых активов</p>
      </div>
    )
  }

  const assetsRatio = data.totalAssets + data.totalDebts > 0
    ? (data.totalAssets / (data.totalAssets + data.totalDebts)) * 100
    : 100

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Чистые активы</h1>

      {/* Main net worth card */}
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">Чистые активы</p>
          <p className={cn(
            "text-4xl font-bold",
            data.netWorth >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatAmount(data.netWorth)}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {data.monthDelta >= 0
              ? <TrendingUp className="h-4 w-4 text-green-600" />
              : <TrendingDown className="h-4 w-4 text-red-600" />
            }
            <span className={cn(
              "text-sm font-medium",
              data.monthDelta >= 0 ? "text-green-600" : "text-red-600"
            )}>
              За этот месяц {data.monthDelta > 0 ? "+" : ""}{formatAmount(data.monthDelta)}
            </span>
          </div>

          {/* Assets vs Debts bar */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Активы: {formatAmount(data.totalAssets)}</span>
              <span>Обязательства: {formatAmount(data.totalDebts)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-red-200 dark:bg-red-950/40">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${assetsRatio}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Assets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-green-600" />
              Активы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.assets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нет счетов с положительным балансом</p>
            ) : (
              <>
                {data.assets.map((asset: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[asset.type] ?? asset.type}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">
                      {formatAmount(asset.balance)}
                    </p>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between">
                  <p className="text-sm font-medium">Итого активы</p>
                  <p className="text-sm font-bold text-green-600">{formatAmount(data.totalAssets)}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Debts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4 text-red-600" />
              Обязательства
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.debts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Нет непогашенных долгов</p>
            ) : (
              <>
                {data.debts.map((debt: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <p className="text-sm font-medium">{debt.counterparty}</p>
                    <p className="text-sm font-semibold text-red-600">
                      {formatAmount(debt.remaining)}
                    </p>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between">
                  <p className="text-sm font-medium">Итого обязательства</p>
                  <p className="text-sm font-bold text-red-600">{formatAmount(data.totalDebts)}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
