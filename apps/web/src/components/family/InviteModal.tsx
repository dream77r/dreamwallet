'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteModal({ open, onOpenChange }: InviteModalProps) {
  const [copied, setCopied] = useState(false)

  const inviteMutation = trpc.family.invite.useMutation({
    onError: (err) => {
      toast.error(err.message)
    },
  })

  function handleGenerate() {
    inviteMutation.mutate()
  }

  async function handleCopy() {
    if (!inviteMutation.data?.link) return
    try {
      await navigator.clipboard.writeText(inviteMutation.data.link)
      setCopied(true)
      toast.success('Ссылка скопирована!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Пригласить в семью</DialogTitle>
          <DialogDescription>
            Сгенерируйте ссылку-приглашение и отправьте её члену семьи
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!inviteMutation.data ? (
            <div className="text-center py-4">
              <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <Button onClick={handleGenerate} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  'Сгенерировать ссылку'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ссылка действительна 7 дней
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteMutation.data.link}
                  className="flex-1 text-sm"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
