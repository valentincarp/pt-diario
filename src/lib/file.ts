/** Sur téléphone : feuille de partage (Enregistrer dans Fichiers…). Sur ordinateur : téléchargement. */
export async function saveFile(name: string, text: string, type: string) {
  const file = new File([text], name, { type })
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
