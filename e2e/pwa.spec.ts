import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

async function crearFicha(page: Page, nombre: string) {
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill(nombre)
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  await expect(page.getByRole('button', { name: new RegExp(nombre) })).toBeVisible()
}

test('se instala: manifiesto e íconos', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const m = await (await request.get('/' + href!.replace(/^\//, ''))).json()
  expect(m).toMatchObject({ short_name: 'Prospectos', display: 'standalone', start_url: './' })
  for (const i of m.icons) expect((await request.get('/' + i.src)).ok()).toBe(true)
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})

test('funciona sin conexión y no pierde las fichas', async ({ page, context }) => {
  await page.goto('/')
  // Espera a que el service worker esté activo y controle la página
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  await crearFicha(page, 'Sin Señal')

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: /Centro de Gestión/ })).toBeVisible()
  await page.getByRole('button', { name: /Sin Señal/ }).click()
  await expect(campo(page, 'Nombre')).toHaveValue('Sin Señal')
  // También se puede editar sin conexión
  await campo(page, 'Edad (años)').fill('41')
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  await page.reload()
  await page.getByRole('button', { name: /Sin Señal/ }).click()
  await expect(campo(page, 'Edad (años)')).toHaveValue('41')
  await context.setOffline(false)
})

test('copia de seguridad: descargar, borrar y restaurar', async ({ page }, info) => {
  await page.goto('/')
  await crearFicha(page, 'Respaldada')

  // Exportar y restaurar están en Configuración → Datos
  await page.getByRole('button', { name: 'Configuración' }).click()
  await page.getByRole('tab', { name: 'Datos' }).click()
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar copia de seguridad' }).click(),
  ])
  expect(descarga.suggestedFilename()).toMatch(/^respaldo-prospectos-\d{4}-\d{2}-\d{2}\.json$/)
  const ruta = info.outputPath('respaldo.json')
  await descarga.saveAs(ruta)
  const json = JSON.parse(readFileSync(ruta, 'utf8'))
  expect(json.fichas.map((f: { nombre: string }) => f.nombre)).toContain('Respaldada')
  await expect(page.getByText(/Última copia de seguridad: hoy/)).toBeVisible()

  // Borrar la ficha
  await page.getByRole('button', { name: 'Inicio' }).click()
  await page.getByRole('button', { name: /Respaldada/ }).click()
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('button', { name: 'Toca otra vez para eliminar' }).click()
  await expect(page.getByRole('button', { name: /Respaldada/ })).toHaveCount(0)

  // Restaurar
  await page.getByRole('button', { name: 'Configuración' }).click()
  await page.getByRole('tab', { name: 'Datos' }).click()
  await page.getByLabel('Archivo de copia de seguridad').setInputFiles(ruta)
  await expect(page.getByText(/Importado: 1 nuevas/)).toBeVisible()
  await page.getByRole('button', { name: 'Inicio' }).click()
  await expect(page.getByRole('button', { name: /Respaldada/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Respaldada/ })).toBeVisible()
  await page.getByRole('button', { name: 'Configuración' }).click()
  await page.getByRole('tab', { name: 'Datos' }).click()

  // Un archivo que no es de la app se rechaza
  await page.getByLabel('Archivo de copia de seguridad').setInputFiles({
    name: 'otro.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hola":1}'),
  })
  await expect(page.getByText('El archivo no es una copia de seguridad de esta app.')).toBeVisible()
})

test('dos pestañas abiertas se mantienen al día', async ({ page, context }) => {
  await page.goto('/')
  await crearFicha(page, 'Pestaña Uno')
  const otra = await context.newPage()
  await otra.goto('/')
  await expect(otra.getByRole('button', { name: /Pestaña Uno/ })).toBeVisible()

  // Cambio en la primera pestaña → aparece en la segunda sin recargar
  await page.getByRole('button', { name: /Pestaña Uno/ }).click()
  await campo(page, 'Nombre').fill('Pestaña Uno editada')
  await expect(otra.getByRole('button', { name: /Pestaña Uno editada/ })).toBeVisible()
})

test('migra las fichas que quedaron en localStorage (Fase 2)', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'tablero-saludsa:fichas:v1',
      JSON.stringify([{ id: 'vieja', creado: 1, mod: 1, tipo: 'nuevo', etapa: 'Nuevo', nombre: 'Ficha de la Fase 2', consentimiento: { ts: 1 } }]),
    )
  })
  await page.reload()
  await expect(page.getByRole('button', { name: /Ficha de la Fase 2/ })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('tablero-saludsa:fichas:v1'))).toBeNull()
})
