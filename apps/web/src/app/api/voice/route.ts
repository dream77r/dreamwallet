import { NextRequest, NextResponse } from 'next/server'

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY ?? 'ec8fde46fc3d2d38f1c4ede7910aa098419f75c7'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as Blob | null
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio' }, { status: 400 })
    }

    const audioBuffer = await audioFile.arrayBuffer()

    const res = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&language=ru&punctuate=true&smart_format=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBuffer,
      },
    )

    if (!res.ok) {
      console.error('DeepGram error:', res.status, await res.text())
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
    }

    const data = await res.json() as {
      results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> }
    }
    const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''

    return NextResponse.json({ text })
  } catch (err) {
    console.error('[voice] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
