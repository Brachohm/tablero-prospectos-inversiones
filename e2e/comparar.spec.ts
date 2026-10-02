import { expect, test, type Page } from '@playwright/test'
import { abrir, accion, campo } from './util'

async function crearPlan(page: Page, nombre: string, tabla: [string, string][], beneficios = '') {
  await page.goto('/#/biblioteca/planes')
  await page.getByRole('button', { name: '+ Nuevo plan' }).click()
  await campo(page, 'Nombre del plan').fill(nombre)
  if (beneficios) await campo(page, 'Beneficios y servicios incluidos').fill(beneficios)
  const t = page.getByRole('group', { name: `Tabla de coberturas de ${nombre}` })
  for (const [c, v] of tabla) await t.getByLabel(c, { exact: true }).fill(v)
  await page.getByRole('button', { name: 'Guardar plan' }).click()
  await expect(page.locator('article.plan').filter({ hasText: nombre })).toContainText(`Tabla de coberturas: ${tabla.length} conceptos`)
}

test('Cambio de seguro: cargar el plan actual, comparar con la Biblioteca y recomendar', async ({ page }) => {
  await crearPlan(
    page,
    'Plan Plus',
    [
      ['Prima mensual (USD)', '$110'],
      ['Deducible', '$300'],
      ['Cobertura máxima anual', '$100.000'],
      ['Maternidad', '$2.000'],
      ['Días para el reembolso', '10 días'],
    ],
    'Telemedicina 24/7',
  )
  await crearPlan(page, 'Plan Básico', [
    ['Prima mensual (USD)', '$90'],
    ['Deducible', '$800'],
    ['Cobertura máxima anual', '$50.000'],
  ])

  // Argumentos creados por el sistema con esos planes
  await page.goto('/#/biblioteca/argumentos')
  const sis = page.getByRole('region', { name: /Creados por el sistema/ })
  await expect(sis).toContainText('Solo Plan Plus incluye: Telemedicina 24/7')
  await expect(sis).toContainText('Deducible: $300 con Plan Plus, el más bajo entre los planes que manejo.')
  await expect(sis.getByText('🤖 Beneficio exclusivo')).toBeVisible()
  await expect(sis).toContainText('validar con la aseguradora')
  // Guardar uno como propio
  await sis.locator('article').filter({ hasText: 'Solo Plan Plus incluye' }).getByRole('button', { name: 'Guardar como mío' }).click()
  await expect(page.getByText('Guardado en tus argumentos: ya puedes editarlo')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tus argumentos (1)' })).toBeVisible()
  await expect(sis).not.toContainText('Solo Plan Plus incluye')

  // Ficha de cambio de seguro
  await page.goto('/')
  await page.goto('/#/nueva/cambio')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Luis Paz')
  await campo(page, 'WhatsApp').fill('0991234567')
  await abrir(page, 'Descubrimiento')
  await page.getByRole('button', { name: /Reembolsos/ }).click()

  await accion(page, 'Comparar plan actual')
  const cmp = page.getByRole('region', { name: 'Su plan actual vs. tus planes' })
  // Cargar la tabla del plan actual desde un CSV
  await cmp.getByLabel('Archivo para Tabla de coberturas del plan actual').setInputFiles({
    name: 'mi-plan.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Cobertura;Valor\nPrima mensual;$100\nDeducible anual;$500\nMonto máximo de cobertura;$50.000\nMaternidad;No incluye\nReembolso;30 días\n',
    ),
  })
  await expect(page.getByText('Encontré 5 conceptos en mi-plan.csv: revísalos')).toBeVisible()
  await expect(cmp.getByLabel('Deducible', { exact: true })).toHaveValue('$500')
  await cmp.getByRole('button', { name: 'Ver la comparación' }).click()

  // Recomendación
  await expect(cmp.getByText('⭐ Recomendado')).toBeVisible()
  await expect(cmp.getByRole('heading', { name: 'Plan Plus' })).toBeVisible()
  await expect(cmp).toContainText('$110 al mes · +$10 frente a hoy ($100)')
  const gana = cmp.locator('.an-sec.busca')
  // Su motivo (reembolsos) primero
  await expect(gana.locator('li').first()).toHaveText('✅ Días para el reembolso: 10 días (hoy 30 días)')
  await expect(gana).toContainText('Maternidad: $2.000 (hoy no lo tiene)')
  await expect(gana).toContainText('Incluye: Telemedicina 24/7')
  // La alternativa muestra lo que pierde
  await cmp.getByRole('button', { name: 'Plan Básico' }).click()
  await expect(cmp.locator('.an-sec.evita')).toContainText('Deducible: $800 (hoy $500)')
  await cmp.getByRole('button', { name: '⭐ Plan Plus' }).click()

  // Llevar a la oferta y a "¿Qué gana?"
  await cmp.getByRole('button', { name: 'Usar en la propuesta' }).click()
  await expect(page.getByText(/Plan Plus se sumó a la propuesta y al pre-cierre/)).toBeVisible()
  await expect(cmp.getByRole('link', { name: '💬 Enviar' })).toHaveAttribute('href', /wa\.me\/593991234567\?text=Hola%20Luis/)
  // Ya va a contratar: el pre-cierre trae el plan, su prima y lo que gana
  await accion(page, 'Ya va a contratar')
  await expect(campo(page, 'Producto seleccionado')).toHaveValue(/.+/)
  await expect(campo(page, 'Valor a pagar mensual (USD)')).toHaveValue('110')
  await expect(campo(page, '¿Qué gana frente a su póliza actual?')).toHaveValue(/Días para el reembolso: 10 días/)

  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)
})
