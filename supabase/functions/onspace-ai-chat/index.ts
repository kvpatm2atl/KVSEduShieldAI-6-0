// Edge Function: onspace-ai-chat — AI chat + AI voice lesson parsing
// Powered by OnSpace.AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { messages, model, mode, voiceText } = body

    const onspaceAiUrl = Deno.env.get('ONSPACE_AI_BASE_URL') ?? 'https://ai.onspace.ai/v1'
    const onspaceAiKey = Deno.env.get('ONSPACE_AI_API_KEY') ?? ''

    // ── Voice Lesson Parsing Mode ───────────────────────────────────────────
    if (mode === 'parse_lesson') {
      const parseMessages = [
        {
          role: 'system',
          content: `You are a school lesson tracker assistant. Extract lesson details from teacher's voice input.
Return ONLY a JSON object with these fields: { "subject": string, "chapter": string, "topic": string }.
Subject must be one of: Mathematics, Science, Physics, Chemistry, Biology, English, Hindi, Social Science, Computer Science, Economics, Work Education, Art Education.
If subject is not mentioned, guess from context.
Chapter is the book chapter name. Topic is the specific lesson topic covered.
Example input: "Chapter Triangles topic Similarity Theorem Mathematics"
Example output: {"subject":"Mathematics","chapter":"Triangles","topic":"Similarity Theorem"}`
        },
        { role: 'user', content: voiceText ?? '' }
      ]

      const response = await fetch(`${onspaceAiUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${onspaceAiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: parseMessages, max_tokens: 150, temperature: 0.2 }),
      })

      if (!response.ok) {
        const err = await response.text()
        return new Response(JSON.stringify({ error: `AI: ${err}` }), {
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content ?? '{}'
      let parsed = { subject: '', chapter: '', topic: '' }
      try {
        // Extract JSON from the response (may have surrounding text)
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      } catch { }

      return new Response(JSON.stringify({ parsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Standard Chat Completions ───────────────────────────────────────────
    const response = await fetch(`${onspaceAiUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${onspaceAiKey}` },
      body: JSON.stringify({ model: model ?? 'gpt-4o-mini', messages, max_tokens: 1024, temperature: 0.7 }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: `OnSpace AI: ${err}` }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('onspace-ai-chat error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
