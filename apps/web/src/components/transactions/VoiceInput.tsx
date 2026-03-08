'use client'

import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  onResult: (text: string) => void
  className?: string
}

type RecordingState = 'idle' | 'recording' | 'processing'

export function VoiceInput({ onResult, className }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setState('processing')
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')

          const res = await fetch('/api/voice', { method: 'POST', body: formData })
          if (res.ok) {
            const { text } = await res.json() as { text: string }
            if (text) onResult(text)
          }
        } finally {
          setState('idle')
        }
      }

      mediaRecorder.start()
      setState('recording')
    } catch {
      setState('idle')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  const icon = state === 'processing' ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : state === 'recording' ? (
    <MicOff className="h-4 w-4" />
  ) : (
    <Mic className="h-4 w-4" />
  )

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={state === 'processing'}
      onClick={state === 'recording' ? stopRecording : startRecording}
      className={cn(
        'transition-colors',
        state === 'recording' && 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100',
        className,
      )}
      title={state === 'recording' ? 'Остановить запись' : 'Голосовой ввод'}
    >
      {icon}
    </Button>
  )
}
