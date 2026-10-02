import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

// En el entorno de Claude Code hay un Chromium preinstalado; en otro lado se usa el de Playwright.
const chromiumLocal = '/opt/pw-browsers/chromium'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173',
    ...devices['Pixel 7'],
    launchOptions: existsSync(chromiumLocal) ? { executablePath: chromiumLocal } : {},
    locale: 'es-EC',
    timezoneId: 'America/Guayaquil',
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
