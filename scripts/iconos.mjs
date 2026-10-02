// Genera los PNG del ícono a partir de los SVG de public/ (usa Chromium de Playwright).
// Uso: node scripts/iconos.mjs
import { chromium } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

const local = '/opt/pw-browsers/chromium'
const b = await chromium.launch(existsSync(local) ? { executablePath: local } : {})
const page = await b.newPage()
const salidas = [
  ['public/icono.svg', 'public/icono-192.png', 192],
  ['public/icono.svg', 'public/icono-512.png', 512],
  ['public/icono-maskable.svg', 'public/icono-maskable-512.png', 512],
  ['public/icono-maskable.svg', 'public/apple-touch-icon.png', 180],
]
for (const [svg, png, px] of salidas) {
  await page.setViewportSize({ width: px, height: px })
  const data = 'data:image/svg+xml;base64,' + readFileSync(svg).toString('base64')
  await page.setContent(`<body style="margin:0;background:transparent"><img src="${data}" width="${px}" height="${px}"></body>`)
  await page.screenshot({ path: png, omitBackground: true })
  console.log(png)
}
await b.close()
