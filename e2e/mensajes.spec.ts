import { expect, test, type Page } from '@playwright/test'
import { accion } from './util'

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

test('Mensajes por fase y recordatorio de reunión por WhatsApp y SMS', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a && /wa\.me|^sms:|^tel:/.test(a.getAttribute('href') ?? '')) e.preventDefault()
    }, true)
  })
  // Miércoles 7 de octubre de 2026, 16:00 en Ecuador: "buenas tardes"
  await page.clock.setFixedTime(new Date('2026-10-07T16:00:00-05:00'))
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'WhatsApp').fill('0991234567')

  // Fase "Nuevo": primer contacto
  await accion(page, 'Mensajes')
  const msj = page.getByRole('region', { name: 'Mensajes de seguimiento' })
  await expect(msj.getByRole('button', { name: 'Primer contacto' })).toHaveAttribute('aria-pressed', 'true')
  await expect(campo(page, 'Mensaje (puedes editarlo)')).toHaveValue(/^Hola Ana, buenas tardes\. Soy Bracho, asesor de SaludSA/)

  // Al agendar la primera reunión, la fase avanza sola y aparecen los recordatorios primero
  const iso = '2026-10-08'
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill(`${iso}T10:30`)
  await page.getByLabel('Lugar', { exact: true }).fill('su oficina')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await expect(page.getByText('Etapa: Primera reunión')).toBeVisible()
  // Mensajes: solo los de la fase (los recordatorios van aparte)
  await accion(page, 'Mensajes')
  await expect(msj.getByRole('button', { name: /Antes de la primera reunión/ })).toBeVisible()
  await expect(msj.getByRole('button', { name: /Confirmar reunión/ })).toHaveCount(0)

  // Recordatorio: confirmar la reunión
  await accion(page, 'Recordatorio')
  const rec = page.getByRole('region', { name: 'Recordatorio de reunión' })
  await expect(rec.getByText(/Reunión mañana a las 10:30 · su oficina/)).toBeVisible()
  await expect(rec.getByRole('button', { name: 'Confirmar reunión' })).toHaveAttribute('aria-pressed', 'true')
  const texto = 'Hola Ana, buenas tardes. Soy Bracho. Le escribo para confirmar nuestra reunión mañana a las 10:30 en su oficina. ¿Le sigue quedando bien?'
  await expect(campo(page, 'Recordatorio (puedes editarlo)')).toHaveValue(texto)
  await expect(rec.getByRole('link', { name: '📅 Agregar a Google Calendar' })).toHaveAttribute('href', /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/)

  // Editar y enviar por SMS → queda en el historial
  await campo(page, 'Recordatorio (puedes editarlo)').fill(texto + ' Saludos.')
  const sms = rec.getByRole('link', { name: '✉️ SMS' })
  await expect(sms).toHaveAttribute('href', 'sms:0991234567?body=' + encodeURIComponent(texto + ' Saludos.'))
  await sms.click()
  await expect(page.getByText(/En el historial: SMS/)).toBeVisible()
  await expect(rec.getByRole('link', { name: '💬 WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/593991234567\?text=Hola%20Ana/)

  // Agenda: la reunión de mañana con recordatorio por WhatsApp y SMS
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  const ag = page.getByRole('region', { name: 'Agenda' })
  await expect(ag.getByText(/Reunión · 10:30 · su oficina/)).toBeVisible()
  await expect(ag.getByRole('link', { name: 'Recordar la reunión por SMS a Ana Torres' })).toHaveAttribute(
    'href',
    'sms:0991234567?body=' + encodeURIComponent(texto),
  )
  await expect(ag.getByRole('link', { name: 'Recordar la reunión por WhatsApp a Ana Torres' })).toBeVisible()
})
