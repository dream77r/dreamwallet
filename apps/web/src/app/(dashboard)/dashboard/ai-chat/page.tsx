'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BrainCircuit, Send, Loader2, User } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Ошибка: ${err.message}` },
      ])
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || chatMutation.isPending) return

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    chatMutation.mutate({ message: trimmed })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">AI Советник</h1>
        <p className="text-muted-foreground text-sm">
          Спросите о расходах, категориях или финансовых привычках
        </p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <BrainCircuit className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Привет! Я ваш финансовый советник.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Спросите меня о расходах, категориях или финансовых привычках.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <BrainCircuit className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-sm text-muted-foreground">Думаю...</span>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <CardContent className="border-t pt-4 pb-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите вопрос..."
              maxLength={500}
              disabled={chatMutation.isPending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || chatMutation.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
