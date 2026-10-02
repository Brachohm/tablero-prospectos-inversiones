import { expect, test, type Page } from '@playwright/test'
import { accion } from './util'

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a && /wa\.me|^sms:|^tel:/.test(a.getAttribute('href') ?? '')) e.preventDefault()
    }, true)
  })
})

test('Contacto referido: referidor, relación y cadena de mensajes que se activa paso a paso', async ({ page }) => {
  await page.goto('/#/contactos')
  await page.getByRole('button', { name: '+ Nuevo contacto' }).click()
  await campo(page, 'Nombre').fill('Carla Mena')
  await campo(page, 'Celular').fill('0991234567')
  await campo(page, '¿Quién te lo refirió? (opcional)').fill('María José Vera')
  await page.getByRole('button', { name: 'Guardar contacto' }).click()
  await expect(page.getByRole('alert')).toHaveText('Elige la relación con quien lo refirió')
  await campo(page, 'Relación').selectOption('Amiga')
  await page.getByRole('button', { name: 'Guardar contacto' }).click()

  // En el tablero: referido por contactar (no entra aún al saludo diario)
  const ref = page.getByRole('region', { name: /Referidos por contactar/ })
  await expect(ref).toContainText('toca enviar el mensaje 1: presentación')
  await expect(page.getByRole('region', { name: /Saludar hoy/ })).toHaveCount(0)

  const cad = page.getByRole('region', { name: '🔗 Cadena de referido' })
  await expect(cad).toContainText(/¡Hola, buen(os|as) (días|tardes|noches)! ¿Tengo el gusto de hablar con Carla\? Soy Bracho, asesor de inversiones\. María, su amiga, me compartió su contacto/)
  await expect(cad.getByRole('link', { name: 'Enviar mensaje 2', exact: true })).toHaveCount(0)
  const m1 = cad.getByRole('link', { name: 'Enviar mensaje 1', exact: true })
  await expect(m1).toHaveAttribute('href', /^https:\/\/wa\.me\/593991234567\?text=/)
  await m1.click()
  await expect(cad).toContainText(/Enviado \d+ \w+ \d{4}/)

  const m2 = cad.getByRole('link', { name: 'Enviar mensaje 2', exact: true })
  await expect(cad).toContainText('quiso regalarle una asesoría')
  await expect(cad).toContainText('¿Qué día y a qué hora tendría disponibilidad?')
  await expect(ref).toContainText('mensaje 2')
  await cad.getByRole('link', { name: 'Enviar mensaje 2 por SMS' }).click()
  await expect(m2).toHaveCount(0)

  // Cadena terminada: pasa al saludo diario y queda disponible el mensaje 3 (opcional)
  await expect(ref).toHaveCount(0)
  await expect(page.getByRole('region', { name: /Saludar hoy/ })).toContainText('0 de 1 saludados')
  await expect(cad.getByRole('link', { name: 'Enviar mensaje 3', exact: true })).toBeVisible()

  // Se guarda
  await page.reload()
  await expect(page.getByRole('region', { name: '🔗 Cadena de referido' }).getByRole('link', { name: 'Enviar mensaje 3', exact: true })).toBeVisible()
})

test('Ficha con origen Referido: pide referidor y relación y muestra la cadena', async ({ page }) => {
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Pedro Ruiz')
  await campo(page, 'WhatsApp').fill('0987654321')
  await expect(campo(page, '¿Quién lo refirió?')).toHaveCount(0)
  await campo(page, '¿De dónde llegó?').selectOption('Referido')
  await campo(page, '¿Quién lo refirió?').fill('Luis Andrade')
  await campo(page, 'Relación con quien lo refirió').selectOption('Jefe')
  await accion(page, /Cadena de referido/)
  const cad = page.getByRole('region', { name: '🔗 Cadena de referido' })
  await expect(cad).toContainText('Luis, su jefe, me compartió su contacto')
  await cad.getByRole('button', { name: 'Ya lo envié' }).click()
  await expect(cad.getByRole('link', { name: 'Enviar mensaje 2', exact: true })).toBeVisible()
  // Queda en el historial
  await accion(page, 'Registrar contacto')
  await expect(page.getByRole('list', { name: 'Contactos registrados' }).getByText('Referido: mensaje 1')).toBeVisible()
})

test('El saludo de los referidos se edita en Configuración', async ({ page }) => {
  await page.goto('/#/ajustes/referidos')
  const r1 = page.getByRole('region', { name: 'Referido 1: Presentación' })
  await r1.getByLabel('Texto de Referido 1: Presentación').fill('Hola {nombre}, {saludo}. {referidor}{relacion} me pasó tu número. Soy {asesor}.')
  await expect(r1.locator('.ejemplo')).toContainText('Carla, su amiga, me pasó tu número')
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Configuración guardada y actualizada')).toBeVisible()

  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Pedro Ruiz')
  await campo(page, 'WhatsApp').fill('0987654321')
  await campo(page, '¿De dónde llegó?').selectOption('Referido')
  await campo(page, '¿Quién lo refirió?').fill('Luis Andrade')
  await campo(page, 'Relación con quien lo refirió').selectOption('Jefe')
  await accion(page, /Cadena de referido/)
  const cad = page.getByRole('region', { name: '🔗 Cadena de referido' })
  await expect(cad).toContainText(/Hola Pedro, buen(os|as) (días|tardes|noches)\. Luis, su jefe, me pasó tu número\. Soy Bracho\./)
})
