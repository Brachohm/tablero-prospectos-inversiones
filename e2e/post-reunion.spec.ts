import { expect, test, type Page } from '@playwright/test'
import { abrir, accion } from './util'
import { readFileSync } from 'node:fs'

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-07T10:00:00-05:00'))
  await page.addInitScript(() => {
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a && /wa\.me|^mailto:/.test(a.getAttribute('href') ?? '')) e.preventDefault()
    }, true)
    // Google Calendar: se anota lo que se abriría
    const w = window as unknown as { abiertos: string[] }
    w.abiertos = []
    window.open = ((u: string) => (w.abiertos.push(u), null)) as typeof window.open
  })
})

test('Post reunión (cambio de seguro): informe PDF, segunda reunión, pedidos y calificación', async ({ page }, info) => {
  await page.goto('/')
  await page.goto('/#/nueva/cambio')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Luis Paz')
  await campo(page, 'WhatsApp').fill('0991234567')
  await campo(page, 'Correo').fill('luis@correo.com')
  await campo(page, 'Edad (años)').fill('45')
  await campo(page, '¿Quién depende de esta persona?').fill('Esposa e hijos')
  await abrir(page, 'Descubrimiento')
  await campo(page, 'Aseguradora actual').fill('Otra aseguradora')
  // Tipo de póliza actual: individual, masivo o corporativo
  await campo(page, '¿Su seguro actual es individual, masivo o corporativo?').selectOption('Corporativo')
  await page.getByRole('button', { name: /Reembolsos/ }).click()

  // Primera reunión hecha → se abre el informe post reunión
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill('2026-10-07T09:00')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await accion(page, '1ª reunión realizada')
  const post = page.getByRole('region', { name: 'Post reunión' })
  // Sin segunda reunión no se envía
  await expect(post.getByText(/Agenda la segunda reunión: el mensaje/)).toBeVisible()
  await expect(post.getByRole('button', { name: '💬 WhatsApp' })).toBeDisabled()
  await post.getByLabel('Fecha y hora').fill('2026-10-09T10:30')
  await post.getByLabel('Lugar', { exact: true }).fill('su oficina')
  await post.getByRole('button', { name: 'Guardar reunión' }).click()
  // Se abre Google Calendar con la cita lista
  const abiertos = await page.evaluate(() => (window as unknown as { abiertos: string[] }).abiertos)
  expect(abiertos.at(-1)).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE.*dates=20261009T103000%2F20261009T113000/)
  await expect(post.getByText(/Segunda reunión: el viernes 9 de octubre a las 10:30 · su oficina/)).toBeVisible()
  // Descargar el PDF, WhatsApp y correo
  const botones = post.getByRole('group', { name: 'Enviar el informe' })
  await expect(botones.getByRole('button')).toHaveCount(1)
  await expect(botones.getByRole('link')).toHaveCount(2)

  // Vista previa de la estrategia (familia → plan familiar + complemento)
  await expect(post.getByLabel('Vista previa del informe')).toContainText('Un plan familiar integral')

  // Mensaje: segunda reunión, recordatorio, pedidos de cambio y calificación
  await post.getByText('Mensaje que lo acompaña').click()
  const msj = post.locator('.msj-vista .paso-txt')
  await expect(msj).toContainText('Nuestra segunda reunión ya quedó agendada: El viernes 9 de octubre a las 10:30 · su oficina. Le enviaré un recordatorio antes.')
  await expect(msj).toContainText('1. El PDF de la tabla de coberturas de su plan actual.')
  await expect(msj).toContainText('2. La sábana de reclamos (su historial de reclamos): puede solicitarla a su asesor o a su aseguradora.')
  await expect(msj).toContainText('¿Cómo calificaría la asesoría de hoy, del 1 al 5?')

  // PDF
  const [descarga] = await Promise.all([page.waitForEvent('download'), post.getByRole('button', { name: '📄 Descargar PDF' }).click()])
  expect(descarga.suggestedFilename()).toBe('informe-Luis-Paz-2026-10-07.pdf')
  const ruta = info.outputPath('informe.pdf')
  await descarga.saveAs(ruta)
  const bytes = readFileSync(ruta)
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  expect(bytes.length).toBeGreaterThan(3000)

  // WhatsApp: el mensaje listo (con la sábana de reclamos) y queda registrado
  const wa = botones.getByRole('link', { name: '💬 WhatsApp' })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/593991234567\?text=Hola%20Luis/)
  await expect(wa).toHaveAttribute('href', /s%C3%A1bana%20de%20reclamos/)
  await wa.click()
  await expect(post.getByText('Enviado')).toBeVisible()

  // Correo: asunto y cuerpo listos; además descarga el PDF para adjuntarlo
  const mail = botones.getByRole('link', { name: '📧 Correo' })
  await expect(mail).toHaveAttribute('href', /^mailto:luis%40correo\.com\?subject=Informe%20de%20nuestra%20reuni%C3%B3n/)
  await expect(mail).toHaveAttribute('href', /s%C3%A1bana%20de%20reclamos/)
  const [pdf2] = await Promise.all([page.waitForEvent('download'), mail.click()])
  expect(pdf2.suggestedFilename()).toBe('informe-Luis-Paz-2026-10-07.pdf')

  // Calificación recibida
  await post.getByRole('button', { name: '4 de 5' }).click()
  await expect(post.getByText('4 de 5', { exact: true })).toBeVisible()
  // Espera a que termine de guardarse en el dispositivo antes de recargar
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((ok) => {
            const r = indexedDB.open('tablero-prospectos-saludsa')
            r.onsuccess = () => {
              const q = r.result.transaction('fichas').objectStore('fichas').getAll()
              q.onsuccess = () => ok((q.result as { calificacion?: { valor: number } }[]).find((f) => f.calificacion)?.calificacion?.valor ?? 0)
            }
          }),
      ),
    )
    .toBe(4)
  await page.reload()
  await accion(page, 'Informe post reunión')
  await expect(page.getByRole('region', { name: 'Post reunión' }).getByText('4 de 5', { exact: true })).toBeVisible()
})

test('Post reunión (nuevo cliente): sin pedidos de cambio', async ({ page }) => {
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'WhatsApp').fill('0991234567')
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill('2026-10-07T09:00')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await accion(page, '1ª reunión realizada')
  const post = page.getByRole('region', { name: 'Post reunión' })
  // Por Zoom, con su link
  await post.getByRole('button', { name: 'Zoom' }).click()
  await post.getByLabel('Fecha y hora').fill('2026-10-10T09:00')
  await post.getByLabel('Link de la reunión').fill('https://zoom.us/j/555')
  await post.getByRole('button', { name: 'Guardar reunión' }).click()
  await post.getByText('Mensaje que lo acompaña').click()
  await expect(post.locator('.msj-vista .paso-txt')).not.toContainText('sábana')
  await expect(post.locator('.msj-vista .paso-txt')).toContainText('Zoom: https://zoom.us/j/555')
  await expect(post.getByRole('link', { name: '💬 WhatsApp' })).toHaveAttribute('href', /wa\.me\/593991234567\?text=Hola%20Ana/)
})
