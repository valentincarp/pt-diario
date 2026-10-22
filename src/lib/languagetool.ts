// Correction de texte par l'API publique gratuite de LanguageTool (portugais européen).
// Le texte est envoyé à languagetool.org : rien d'autre ne quitte l'appareil.
export type LtMatch = {
  message: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: { description: string }
}

export async function checkText(text: string): Promise<LtMatch[]> {
  const res = await fetch('https://api.languagetool.org/v2/check', {
    method: 'POST',
    body: new URLSearchParams({ text, language: 'pt-PT', motherTongue: 'fr' }),
  })
  if (!res.ok) throw new Error(res.status === 429 ? 'Trop de vérifications : attends une minute.' : `LanguageTool indisponible (${res.status}).`)
  return (await res.json()).matches
}
