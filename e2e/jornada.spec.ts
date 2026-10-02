import { expect, test, type Page } from '@playwright/test'
import { accion } from './util'
import { readFileSync } from 'node:fs'

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

test('Fin de gestión: resumen, aviso sin conexión, copia y registro; al día siguiente, cargar la copia', async ({ page, context }, info) => {
  await page.clock.setFixedTime(new Date('2026-10-07T18:00:00-05:00'))
  await page.goto('/')

  // Inicio de jornada (primer día): se puede descartar
  const inicio = page.getByRole('region', { name: /Antes de empezar/ })
  await expect(inicio).toContainText('Carga tu copia de seguridad más reciente')
  await inicio.getByRole('button', { name: 'Ya está al día' }).click()
  await expect(inicio).toHaveCount(0)

  // Algo de trabajo: una ficha nueva
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await page.getByRole('button', { name: 'Guardar y volver' }).click()

  // Fin de gestión sin conexión
  await context.setOffline(true)
  await page.getByRole('button', { name: /Fin de gestión/ }).click()
  const hoja = page.getByRole('dialog', { name: '🏁 Fin de gestión' })
  await expect(hoja.getByLabel('Resumen del día')).toContainText('1nuevos (contactos y fichas)')
  await expect(hoja.getByText(/Sin conexión: conéctate a una red WiFi o a tus datos móviles/)).toBeVisible()
  await context.setOffline(false)
  await expect(hoja.getByText('🟢 Conectado a internet.')).toBeVisible()

  // Sin copia, finalizar pide confirmación; con copia, directo
  await expect(hoja.getByRole('button', { name: 'Finalizar sin copia' })).toBeVisible()
  const [descarga] = await Promise.all([page.waitForEvent('download'), hoja.getByRole('button', { name: '⬇️ Descargar copia' }).click()])
  const ruta = info.outputPath('copia.json')
  await descarga.saveAs(ruta)
  await expect(hoja.getByText(/✓ Copia hecha a las/)).toBeVisible()
  await hoja.getByRole('button', { name: '🏁 Finalizar gestión' }).click()
  await expect(page.getByText(/Gestión del día registrada\. Mañana, carga tu copia antes de empezar\./)).toBeVisible()
  await expect(hoja).toHaveCount(0)

  // Al día siguiente: recordar cargar la copia, con el último fin de gestión
  await page.clock.setFixedTime(new Date('2026-10-08T08:00:00-05:00'))
  await page.reload()
  const inicio2 = page.getByRole('region', { name: /Antes de empezar/ })
  await expect(inicio2).toContainText('Último fin de gestión: 7 oct 2026 · 0 gestiones · con copia de seguridad')
  await inicio2
    .getByLabel('Copia de seguridad para empezar el día')
    .setInputFiles({ name: 'copia.json', mimeType: 'application/json', buffer: readFileSync(ruta) })
  await expect(page.getByText(/Importado:/)).toBeVisible()
  await expect(inicio2).toHaveCount(0)
})

test('En el celular, el correo abre la app de correo aunque sea Gmail', async ({ page }) => {
  await page.goto('/#/ajustes')
  await campo(page, 'Correo electrónico').fill('bracho@gmail.com')
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByRole('region', { name: 'Herramientas de envío' })).toContainText('En el celular se abren las apps de WhatsApp y de correo.')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'WhatsApp').fill('0991234567')
  await campo(page, 'Correo').fill('ana@x.com')
  await accion(page, 'Invitación')
  const inv = page.getByRole('region', { name: 'Invitación a la reunión' })
  await expect(inv.getByRole('link', { name: '📧 Correo' })).toHaveAttribute('href', /^mailto:ana%40x\.com/)
  await expect(inv.getByRole('link', { name: '💬 WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\//)
})
