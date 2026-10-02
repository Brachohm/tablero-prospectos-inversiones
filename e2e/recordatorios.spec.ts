import { expect, test } from '@playwright/test'
import { accion, campo } from './util'

test('Dos recordatorios por reunión: el 1 manual; el 2 avisa en el Inicio una hora antes', async ({ page }) => {
  await page.addInitScript(() => {
    window.open = (() => null) as typeof window.open
    document.addEventListener(
      'click',
      (e) => {
        const a = (e.target as HTMLElement).closest('a')
        if (a && /wa\.me|^sms:/.test(a.getAttribute('href') ?? '')) e.preventDefault()
      },
      true,
    )
  })
  // Miércoles 7 de octubre de 2026, 8:00 en Ecuador
  await page.clock.install({ time: new Date('2026-10-07T08:00:00-05:00') })
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'WhatsApp').fill('0991234567')
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill('2026-10-07T10:00')
  await page.getByLabel('Lugar', { exact: true }).fill('su oficina')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()

  // Recordatorio 1: lo envías tú
  await accion(page, 'Recordatorio')
  const r1 = page.getByLabel('Recordatorio 1')
  await r1.getByRole('link', { name: '💬 WhatsApp' }).click()
  await expect(r1).toContainText('✓ enviado')
  // El 2 aún no: se habilita a las 9:00
  const r2 = page.getByLabel('Recordatorio 2')
  await expect(r2).toContainText('Se habilita hoy a las 9:00 (1 hora antes)')

  // En el Inicio, a las 8:00 aparece como "más tarde hoy"
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  const aviso = page.getByRole('region', { name: 'Recordatorios de reunión' })
  await expect(aviso).toContainText('Más tarde hoy: Ana Torres (envíalo desde las 9:00)')

  // A las 9:20: toca enviarlo
  await page.clock.fastForward('01:20:00')
  await expect(aviso.getByRole('article', { name: 'Recordatorio para Ana Torres' })).toContainText('en 40 min · su oficina')
  const enviar = aviso.getByRole('link', { name: 'Enviar recordatorio 2 por WhatsApp a Ana Torres' })
  await expect(enviar).toHaveAttribute('href', /Le%20recuerdo%20que%20en%20un%20momento%2C%20a%20las%2010%3A00%2C%20nos%20vemos%20en%20su%20oficina/)
  await enviar.click()
  await expect(page.getByText('Recordatorio 2 enviado a Ana Torres')).toBeVisible()
  await expect(aviso).toHaveCount(0)

  // En la ficha quedan los dos
  await page.getByRole('button', { name: /Ana Torres/ }).first().click()
  await accion(page, 'Recordatorio')
  await expect(page.getByRole('region', { name: 'Recordatorio de reunión' })).toContainText('2/2')
})
