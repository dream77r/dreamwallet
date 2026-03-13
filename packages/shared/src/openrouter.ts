export async function callOpenRouter(opts: {
  model: string
  prompt: string
  maxTokens?: number
  systemPrompt?: string
  apiKey?: string
}): Promise<string> {
  const apiKey = opts.apiKey || process.env.OPENROUTER_API_KEY
  if (!apiKey) return ''

  const messages: Array<{ role: string; content: string }> = []
  if (opts.systemPrompt) {
    messages.push({ role: 'system', content: opts.systemPrompt })
  }
  messages.push({ role: 'user', content: opts.prompt })

  const maxAttempts = 3
  const backoffMs = 500

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://dreamwallet.app',
          'X-Title': 'DreamWallet',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: opts.model,
          max_tokens: opts.maxTokens ?? 600,
          messages,
        }),
      })

      if (!res.ok) {
        const status = res.status
        if ((status === 429 || status >= 500) && attempt < maxAttempts - 1) {
          await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)))
          continue
        }
        console.error('OpenRouter error:', status, await res.text())
        throw new Error(`OpenRouter error: ${status}`)
      }

      const data = await res.json()
      return (data.choices?.[0]?.message?.content ?? '') as string
    } catch (err) {
      if (attempt === maxAttempts - 1) throw err
      await new Promise(r => setTimeout(r, backoffMs * (attempt + 1)))
    }
  }
  return ''
}
