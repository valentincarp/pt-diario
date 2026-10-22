import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { buildIcs, planEvents } from './src/logic/ics'
import calendar from './src/calendar.json'
import type { Settings } from './src/types'

// Calendrier publié avec le site : l'iPhone s'y abonne (webcal://…/calendrier.ics) et se met à jour seul.
const calendarFile = {
  name: 'calendrier-ics',
  generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
    const s = calendar as Settings
    this.emitFile({ type: 'asset', fileName: 'calendrier.ics', source: buildIcs(planEvents(s, s.planStart), new Date()) })
  },
}

export default defineConfig({
  // Chemins relatifs : l'appli marche aussi dans un sous-dossier (GitHub Pages).
  base: './',
  plugins: [
    react(),
    calendarFile,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'PT diário — portugais tous les jours',
        short_name: 'PT diário',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#0a7a46',
        background_color: '#f4f2ec',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
