'use client'

import { useState, useRef, useCallback } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mic, MicOff, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
}

interface VoiceCommandButtonProps {
  className?: string
  onResult?: (response: { answer: string }) => void
}

export function VoiceCommandButton({ className, onResult }: VoiceCommandButtonProps) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [showResult, setShowResult] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const queryMutation = trpc.ai.naturalQuery.useMutation({
    onSuccess: (data) => {
      setShowResult(true)
      onResult?.(data as any)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      toast.error('Ваш браузер не поддерживает распознавание речи')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'ru-RU'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      setTranscript(finalTranscript || interimTranscript)

      if (finalTranscript) {
        setListening(false)
        queryMutation.mutate({ message: finalTranscript })
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListening(false)
      if (event.error !== 'aborted') {
        toast.error('Ошибка распознавания речи')
      }
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    setTranscript('')
    setShowResult(false)
  }, [queryMutation])

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  function dismiss() {
    setShowResult(false)
    setTranscript('')
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={listening ? stopListening : startListening}
        disabled={queryMutation.isPending}
        className={cn(
          'transition-colors',
          listening && 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100',
        )}
        title={listening ? 'Остановить' : 'Голосовая команда'}
      >
        {queryMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : listening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {(transcript || showResult) && (
        <Card className="absolute top-full mt-2 right-0 w-72 rounded-2xl shadow-lg z-50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {transcript && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="text-xs text-gray-400 block mb-0.5">Вы сказали:</span>
                    {transcript}
                  </p>
                )}

                {queryMutation.isPending && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Обрабатываю...
                  </div>
                )}

                {showResult && queryMutation.data && (
                  <div className="text-sm">
                    <span className="text-xs text-gray-400 block mb-0.5">Ответ:</span>
                    <p className="text-gray-800">
                      {(queryMutation.data as any).response ?? (queryMutation.data as any).answer}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={dismiss}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
