/**
 * Copy discipline for the marketing surface.
 *
 * The product modules are written long on purpose — the sales and security pages
 * need that depth. A landing page does not. These helpers shorten by choosing a
 * complete, shorter unit of text (a clause, a sentence, a figure) rather than by
 * cutting mid-word: a trailing ellipsis reads as a bug, not as brevity. Where
 * text still runs long, clamp it visually with `u-clamp-*` instead.
 */

/** The first sentence, trimmed. Never cuts mid-sentence. */
export function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?=\s|$)/)
  return (m ? m[0] : text).trim()
}

const wordCount = (t: string) => t.trim().split(/\s+/).length

/**
 * The shortest complete phrase that carries the point: the leading clause when
 * the text has one, otherwise the whole thing. No ellipsis, ever.
 */
export function clause(text: string, max = 10): string {
  const t = text.trim().replace(/\.$/, '')
  if (wordCount(t) <= max) return t
  const head = t.split(/\s*[—–:,]\s*/)[0].trim()
  if (wordCount(head) >= 3 && wordCount(head) <= max + 2) return head
  return t
}

/** A headline that fits two lines at display size. */
export const headline = (tagline: string, max = 10) => clause(tagline, max)

/** One supporting sentence. Returns the shortest complete sentence available. */
export function lede(text: string, max = 28): string {
  const first = firstSentence(text)
  if (wordCount(first) <= max) return first
  // A long opener usually chains clauses; the first two carry the meaning.
  const parts = first.split(/\s*[—–;]\s*|,\s+(?=and |so |which |but )/)
  const short = parts[0].trim().replace(/[,;:]$/, '')
  return wordCount(short) >= 6 ? `${short}.` : first
}

/**
 * The figure inside a cost line: "$1.2tn in global losses" → "$1.2tn".
 * Returns null when the text carries no headline number, so the caller can omit
 * the stat rather than print a paragraph in stat type.
 */
export function figure(text?: string): string | null {
  if (!text) return null
  const m = text.match(/(?:[$£€]\s?\d[\d,.]*\s?(?:tn|bn|m|k|B|M|K)?|\d[\d,.]*\s?(?:%|×|x\b|hours?|days?|weeks?|months?))/i)
  if (!m) return null
  const v = m[0].trim()
  return v.length <= 14 ? v : null
}

/** The remainder of a cost line once its figure has been pulled out. */
export function figureRest(text?: string): string {
  if (!text) return ''
  const f = figure(text)
  if (!f) return text
  return text.replace(f, '').replace(/^\s*(in|of|per|a)\s+/i, '').trim()
}

/** Sentence case for a fragment that may arrive capitalised mid-sentence. */
export function sentence(text: string): string {
  const t = text.trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Kept for callers that genuinely want a hard word cap (tables, chips). */
export function words(text: string, max: number): string {
  const parts = text.trim().split(/\s+/)
  return parts.length <= max ? text.trim() : parts.slice(0, max).join(' ').replace(/[,;:.]$/, '')
}

/**
 * "a account" is the kind of thing that makes a product look unfinished, and
 * the nouns here come from data, so the article has to be chosen at runtime.
 * Handles the ordinary vowel rule plus the English words that break it.
 */
const AN_EXCEPTIONS = /^(hour|honest|honou?r|heir)/i
const A_EXCEPTIONS = /^(uni|use|user|euro|one|ubiquit)/i
export function article(noun: string): 'a' | 'an' {
  if (A_EXCEPTIONS.test(noun)) return 'a'
  if (AN_EXCEPTIONS.test(noun)) return 'an'
  return /^[aeiou]/i.test(noun) ? 'an' : 'a'
}
export const withArticle = (noun: string) => `${article(noun)} ${noun}`
