'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/ui/page-header'
import { BrainCircuit, Send, Loader2, User } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { ChatBlockRenderer } from '@/components/ai/ChatBlockRenderer'
import { VoiceInput } from '@/components/transactions/VoiceInput'
import type { ChatBlock } from '@dreamwallet/shared'

interface Message {
  role: 'user' | 'assistant'
  content?: string
  blocks?: ChatBlock[]
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: 'assistant', blocks: data.blocks }])
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', blocks: [{ type: 'text', content: `Ошибка: ${err.message}` }] },
      ])
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chatMutation.isPending) return
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    chatMutation.mutate({ message: trimmed })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl">
      <PageHeader
        title="AI Советник"
        description="Спросите о расходах, категориях или финансовых привычках"
      />

      <div className="glass-card card-default rounded-2xl flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-hero animate-pulse-glow">
                  <BrainCircuit className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium">Привет! Я ваш финансовый советник.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Спросите меня о расходах, балансе, бюджетах или попросите совет.
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
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-hero">
                    <BrainCircuit className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'gradient-hero text-white whitespace-pre-wrap'
                      : 'glass-card'
                  }`}
                >
                  {msg.role === 'user' && msg.content}
                  {msg.role === 'assistant' && msg.blocks && (
                    <ChatBlockRenderer blocks={msg.blocks} />
                  )}
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-hero">
                  <BrainCircuit className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-sm text-muted-foreground">Думаю...</span>
                </div>
              </div>
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-border/50 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Напишите вопрос..."
              maxLength={500}
              disabled={chatMutation.isPending}
              className="flex-1 rounded-xl"
            />
            <VoiceInput onResult={(text) => sendMessage(text)} />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || chatMutation.isPending}
              className="rounded-xl tap-target"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
