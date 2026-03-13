'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bitcoin,
  RefreshCw,
  Plus,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

const NETWORK_OPTIONS = [
  { value: 'ethereum', label: 'Ethereum (ETH)', icon: '⟠' },
  { value: 'bitcoin', label: 'Bitcoin (BTC)', icon: '₿' },
  { value: 'solana', label: 'Solana (SOL)', icon: '◎' },
  { value: 'ton', label: 'TON', icon: '💎' },
  { value: 'tron', label: 'TRON (TRX)', icon: '⚡' },
  { value: 'polygon', label: 'Polygon (POL)', icon: '⬡' },
  { value: 'arbitrum', label: 'Arbitrum (ETH)', icon: '🔵' },
  { value: 'bsc', label: 'BNB Chain (BNB)', icon: '🟡' },
] as const

const SYNC_INTERVALS = [
  { value: '15', label: 'Каждые 15 минут' },
  { value: '30', label: 'Каждые 30 минут' },
  { value: '60', label: 'Каждый час' },
  { value: '360', label: 'Каждые 6 часов' },
  { value: '1440', label: 'Раз в сутки' },
  { value: 'off', label: 'Выключено' },
] as const

const PAYMENT_SYSTEMS = [
  { key: 'yoomoney', name: 'ЮMoney', desc: 'Экспорт из ЮMoney (Яндекс.Деньги)', format: 'CSV (;)' },
  { key: 'paypal', name: 'PayPal', desc: 'Экспорт из PayPal Activity', format: 'CSV (,)' },
  { key: 'stripe', name: 'Stripe', desc: 'Экспорт из Stripe Dashboard', format: 'CSV (,)' },
] as const

const CRYPTO_EXCHANGES = [
  { key: 'binance', name: 'Binance', desc: 'Экспорт истории из Binance', format: 'CSV (,)' },
  { key: 'bybit', name: 'Bybit', desc: 'Экспорт истории из Bybit', format: 'CSV (,)' },
] as const

export default function IntegrationsPage() {
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [walletName, setWalletName] = useState('')
  const [networkHint, setNetworkHint] = useState<string>('')
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set())

  const utils = trpc.useUtils()

  const { data: cryptoAccounts, isLoading: cryptoLoading } = trpc.crypto.list.useQuery()
  const { data: wallet } = trpc.wallet.get.useQuery()
  const personalWallet = wallet

  const addWalletMut = trpc.crypto.addWallet.useMutation({
    onSuccess: () => {
      toast.success('Кошелёк добавлен')
      setAddDialogOpen(false)
      setAddress('')
      setWalletName('')
      setNetworkHint('')
      utils.crypto.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const syncMut = trpc.crypto.sync.useMutation({
    onSuccess: (result, variables) => {
      setSyncingIds((prev) => { const n = new Set(prev); n.delete(variables.accountId); return n })
      if (result.error) {
        toast.error(`Ошибка синхронизации: ${result.error}`)
      } else {
        toast.success(`Синхронизировано: +${result.added} транзакций`)
      }
      utils.crypto.list.invalidate()
    },
    onError: (err, variables) => {
      setSyncingIds((prev) => { const n = new Set(prev); n.delete(variables.accountId); return n })
      toast.error(err.message)
    },
  })

  const setSyncIntervalMut = trpc.crypto.setSyncInterval.useMutation({
    onSuccess: () => {
      toast.success('Интервал обновлён')
      utils.crypto.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSync(accountId: string) {
    setSyncingIds((prev) => new Set(prev).add(accountId))
    syncMut.mutate({ accountId })
  }

  function handleAddWallet() {
    if (!personalWallet || !address.trim()) return
    const evmHint = ['polygon', 'arbitrum', 'bsc'].includes(networkHint)
      ? (networkHint as 'polygon' | 'arbitrum' | 'bsc')
      : undefined
    addWalletMut.mutate({
      address: address.trim(),
      name: walletName.trim() || undefined,
      walletId: personalWallet.id,
      networkHint: evmHint,
    })
  }

  function formatSyncTime(date: Date | null) {
    if (!date) return 'Никогда'
    const d = new Date(date)
    const now = Date.now()
    const diff = now - d.getTime()
    if (diff < 60_000) return 'Только что'
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин назад`
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч назад`
    return d.toLocaleDateString('ru-RU')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Интеграции</h1>
        <p className="text-muted-foreground mt-1">
          Подключение криптокошельков и импорт из платёжных систем
        </p>
      </div>

      {/* ─── Crypto Wallets ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Криптокошельки</h2>
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Добавить кошелёк
          </Button>
        </div>

        {cryptoLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-20" /></CardContent></Card>
            ))}
          </div>
        ) : !cryptoAccounts?.length ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Bitcoin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Нет подключённых кошельков</p>
              <p className="text-sm mt-1">Добавьте адрес для автоматической загрузки транзакций</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cryptoAccounts.map((acc) => {
              const isSyncing = syncingIds.has(acc.id)
              const networkInfo = NETWORK_OPTIONS.find((n) => n.value === acc.cryptoNetwork)

              return (
                <Card key={acc.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{networkInfo?.icon || '🔗'}</span>
                          <span className="font-medium truncate">{acc.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                          {acc.cryptoAddress}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {networkInfo?.label.split(' ')[0] || acc.cryptoNetwork}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatSyncTime(acc.lastSyncAt)}
                      </span>
                      <span className="font-medium">
                        {Number(acc.balance).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={acc.syncIntervalMin?.toString() ?? 'off'}
                        onValueChange={(v) => {
                          setSyncIntervalMut.mutate({
                            accountId: acc.id,
                            intervalMin: v === 'off' ? null : Number(v),
                          })
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SYNC_INTERVALS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => handleSync(acc.id)}
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Поддерживаемые сети: Ethereum, Bitcoin, Solana, TON, TRON, Polygon, Arbitrum, BNB Chain
        </p>
      </section>

      {/* ─── Payment Systems (CSV Import) ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Платёжные системы</h2>
        <p className="text-sm text-muted-foreground">
          Импорт выписок через CSV. Скачайте выписку в личном кабинете и загрузите на странице импорта.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAYMENT_SYSTEMS.map((ps) => (
            <Card key={ps.key}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{ps.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{ps.desc}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{ps.format}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/dashboard/import?template=${ps.key}`)}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Импорт CSV
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Crypto Exchanges (CSV Import) ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Криптобиржи</h2>
        <p className="text-sm text-muted-foreground">
          Импорт истории операций через CSV-выгрузку.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CRYPTO_EXCHANGES.map((ex) => (
            <Card key={ex.key}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{ex.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{ex.desc}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{ex.format}</Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/dashboard/import?template=${ex.key}`)}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Импорт CSV
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Add Wallet Dialog ─── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить криптокошелёк</DialogTitle>
            <DialogDescription>
              Вставьте адрес кошелька — сеть определится автоматически.
              Для EVM-адресов (0x...) выберите сеть вручную.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Адрес кошелька</Label>
              <Input
                placeholder="0x..., bc1..., EQ..., T..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Название (опционально)</Label>
              <Input
                placeholder="Мой ETH кошелёк"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
              />
            </div>

            {/^0x[0-9a-fA-F]{40}$/.test(address.trim()) && (
              <div className="space-y-2">
                <Label>Сеть (для 0x адресов)</Label>
                <Select value={networkHint} onValueChange={setNetworkHint}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ethereum (по умолчанию)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="bsc">BNB Chain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleAddWallet}
              disabled={!address.trim() || addWalletMut.isPending}
            >
              {addWalletMut.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
