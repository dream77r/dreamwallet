'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { detectCryptoNetwork, shortenAddress } from '@/lib/crypto-detect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { RefreshCw, Plus, Wallet2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

const NETWORK_COLORS: Record<string, string> = {
  ethereum: 'bg-purple-100 text-purple-800',
  bitcoin: 'bg-orange-100 text-orange-800',
  solana: 'bg-green-100 text-green-800',
  bsc: 'bg-yellow-100 text-yellow-800',
  polygon: 'bg-violet-100 text-violet-800',
  arbitrum: 'bg-blue-100 text-blue-800',
  ton: 'bg-sky-100 text-sky-800',
  tron: 'bg-red-100 text-red-800',
}

const NETWORK_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  bitcoin: 'Bitcoin',
  solana: 'Solana',
  bsc: 'BSC',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  ton: 'TON',
  tron: 'TRON',
}

function formatRub(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function AddWalletDialog({ walletId, onAdded }: { walletId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')

  const detected = address.length > 10 ? detectCryptoNetwork(address) : null
  const addMutation = trpc.crypto.addWallet.useMutation({
    onSuccess: () => {
      toast.success('Кошелёк добавлен')
      setOpen(false)
      setAddress('')
      setName('')
      onAdded()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить кошелёк
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить крипто-кошелёк</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Адрес кошелька</label>
            <Input
              placeholder="0x... / bc1... / SOL-адрес"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            {detected && (
              <div className="mt-2">
                {detected.network ? (
                  <Badge className={NETWORK_COLORS[detected.network]}>
                    {detected.name} ({detected.symbol})
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">Сеть не определена</span>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Название (необязательно)</label>
            <Input
              placeholder="Мой Bitcoin кошелёк"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!address || !detected?.network || addMutation.isPending}
            onClick={() => addMutation.mutate({ address, name: name || undefined, walletId })}
          >
            {addMutation.isPending ? 'Добавляю...' : 'Добавить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CryptoAccount {
  id: string
  name: string
  cryptoAddress: string | null
  cryptoNetwork: string | null
  cryptoSymbol: string | null
  balance: number | string
  lastSyncAt: Date | string | null
}

function EditWalletDialog({
  account,
  open,
  onOpenChange,
  onSaved,
}: {
  account: CryptoAccount
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const [name, setName] = useState(account.name)

  const updateMutation = trpc.crypto.updateWallet.useMutation({
    onSuccess: () => {
      toast.success('Кошелёк обновлён')
      onOpenChange(false)
      onSaved()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать кошелёк</DialogTitle>
          <DialogDescription>
            {account.cryptoAddress ? shortenAddress(account.cryptoAddress) : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Название</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || updateMutation.isPending}
            onClick={() => updateMutation.mutate({ accountId: account.id, name: name.trim() })}
          >
            {updateMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteWalletDialog({
  account,
  open,
  onOpenChange,
  onDeleted,
}: {
  account: CryptoAccount
  open: boolean
  onOpenChange: (v: boolean) => void
  onDeleted: () => void
}) {
  const deleteMutation = trpc.crypto.deleteWallet.useMutation({
    onSuccess: () => {
      toast.success('Кошелёк удалён')
      onOpenChange(false)
      onDeleted()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить кошелёк?</DialogTitle>
          <DialogDescription>
            Будут удалены все транзакции этого счёта. Это действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="rounded-lg border p-3">
            <p className="font-medium">{account.name}</p>
            {account.cryptoAddress && (
              <p className="text-sm text-muted-foreground font-mono">
                {shortenAddress(account.cryptoAddress)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ accountId: account.id })}
            >
              {deleteMutation.isPending ? 'Удаляю...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function CryptoPage() {
  const utils = trpc.useUtils()

  // Get personal wallet
  const { data: personalWallet } = trpc.wallet.get.useQuery()

  const { data: accounts, isLoading } = trpc.crypto.list.useQuery()

  const syncMutation = trpc.crypto.sync.useMutation({
    onSuccess: (result) => {
      if (result.error) {
        toast.error(`Ошибка синхронизации: ${result.error}`)
      } else {
        toast.success(`Синхронизировано: +${result.added} транзакций`)
      }
      void utils.crypto.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.crypto.deleteWallet.useMutation({
    onSuccess: () => {
      toast.success('Кошелёк удалён')
      void utils.crypto.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  // Edit / Delete dialog state
  const [editAccount, setEditAccount] = useState<CryptoAccount | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<CryptoAccount | null>(null)

  // Auto-sync on page open
  const syncAllMutation = trpc.crypto.syncAll.useMutation({
    onSuccess: () => void utils.crypto.list.invalidate(),
  })

  // Trigger auto-sync once on mount
  const [autoSynced, setAutoSynced] = useState(false)
  if (!autoSynced && accounts && accounts.length > 0) {
    setAutoSynced(true)
    syncAllMutation.mutate({ force: false })
  }

  if (!personalWallet) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Загрузка кошелька...</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Крипто</h1>
          <p className="text-muted-foreground text-sm">Крипто-счета с автосинком</p>
        </div>
        <AddWalletDialog
          walletId={personalWallet.id}
          onAdded={() => void utils.crypto.list.invalidate()}
        />
      </div>

      {isLoading && (
        <div className="text-muted-foreground">Загрузка счетов...</div>
      )}

      {!isLoading && (!accounts || accounts.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Wallet2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Нет крипто-счетов. Добавьте первый кошелёк.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account) => {
          const isSyncing = syncMutation.isPending && syncMutation.variables?.accountId === account.id
          const network = account.cryptoNetwork ?? 'ethereum'
          const lastSync = account.lastSyncAt
            ? formatDistanceToNow(new Date(account.lastSyncAt), { addSuffix: true, locale: ru })
            : 'никогда'

          return (
            <Card key={account.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">
                    {account.name}
                  </CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge className={`text-xs ${NETWORK_COLORS[network] ?? ''}`}>
                      {NETWORK_LABELS[network] ?? network}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditAccount(account as unknown as CryptoAccount)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteAccount(account as unknown as CryptoAccount)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {account.cryptoAddress && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {shortenAddress(account.cryptoAddress)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-2xl font-bold">
                    {formatRub(Number(account.balance))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    в рублях по текущему курсу
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Синхр. {lastSync}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSyncing}
                    onClick={() => syncMutation.mutate({ accountId: account.id })}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Синхр...' : 'Синхронизировать'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {editAccount && (
        <EditWalletDialog
          account={editAccount}
          open={!!editAccount}
          onOpenChange={(v) => { if (!v) setEditAccount(null) }}
          onSaved={() => {
            setEditAccount(null)
            void utils.crypto.list.invalidate()
          }}
        />
      )}

      {deleteAccount && (
        <DeleteWalletDialog
          account={deleteAccount}
          open={!!deleteAccount}
          onOpenChange={(v) => { if (!v) setDeleteAccount(null) }}
          onDeleted={() => {
            setDeleteAccount(null)
            void utils.crypto.list.invalidate()
          }}
        />
      )}
    </div>
  )
}
