import { expect, test } from '@playwright/test'
import { accion, campo } from './util'

/** PNG de 1×1. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

test.beforeEach(async ({ page }) => {
  // Miércoles 7 de octubre de 2026, 10:00 en Ecuador.
  await page.clock.setFixedTime(new Date('2026-10-07T10:00:00-05:00'))
  await page.addInitScript(() => {
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a && /wa\.me|^sms:|^tel:|^mailto:/.test(a.getAttribute('href') ?? '')) e.preventDefault()
    }, true)
  })
})

test('Configuración: perfil, mensajes (sin emojis) y adjuntos; seguimiento 1-2-3 e invitación', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Configuración' }).click()

  // Perfil
  await campo(page, 'Nombre completo').fill('Bradley Hernández')
  await campo(page, 'Cómo te gusta que te llamen').fill('Brad')
  await campo(page, 'Rol').fill('asesor comercial de SaludSA')
  await expect(page.getByText('Vista previa: “Hola Ana, soy Brad, asesor comercial de SaludSA.”')).toBeVisible()
  await expect(page.getByText('Cambios sin guardar')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Configuración guardada y actualizada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar y actualizar' })).toBeDisabled()

  // Seguimiento: editar el mensaje 1; un emoji pegado avisa y no se envía
  await page.getByRole('tab', { name: 'Seguimiento' }).click()
  const m1 = page.getByRole('region', { name: 'Mensaje 1' })
  await m1.getByLabel('Texto de Mensaje 1').fill('Hola {nombre}, soy {asesor} ')
  await m1.getByLabel('Texto de Mensaje 1').fill('Hola {nombre}, soy {asesor} 👋')
  await expect(m1.getByText(/Los emojis no se envían/)).toBeVisible()
  await expect(m1.locator('.ejemplo')).toHaveText('Así lo verá Ana:Hola Ana, soy Brad')
  await expect(m1.getByRole('group', { name: /Emojis/ })).toHaveCount(0)

  // Saludos: foto adjunta
  await page.getByRole('tab', { name: 'Saludos' }).click()
  const foto = page.getByRole('region', { name: 'Saludo con foto' })
  await foto.getByLabel('Adjunto de Saludo con foto').setInputFiles({ name: 'flores.png', mimeType: 'image/png', buffer: PNG })
  await expect(foto.getByText('flores.png')).toBeVisible()
  // Un video que no es video se rechaza
  await page
    .getByRole('region', { name: 'Saludo con video' })
    .getByLabel('Adjunto de Saludo con video')
    .setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByText('Elige un video')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Configuración guardada y actualizada')).toBeVisible()

  // Se guardó: al recargar sigue ahí
  await page.reload()
  await expect(page.getByRole('region', { name: 'Saludo con foto' }).getByText('flores.png')).toBeVisible()

  // Ficha: seguimiento 1-2-3 con el texto guardado y el nombre del prospecto
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'WhatsApp').fill('0991234567')
  await campo(page, 'Correo').fill('ana@correo.com')
  await accion(page, 'Seguimiento 1')
  const seg = page.getByRole('region', { name: 'Seguimiento 1·2·3' })
  await expect(seg.getByText('Hola Ana, soy Brad', { exact: true })).toBeVisible()
  const enviar = seg.getByRole('link', { name: '💬 Enviar mensaje 1' })
  await expect(enviar).toHaveAttribute('href', /^https:\/\/wa\.me\/593991234567\?text=Hola%20Ana%2C%20soy%20Brad/)
  await enviar.click()
  await expect(page.getByText('Mensaje 1 de seguimiento registrado')).toBeVisible()
  // No dos el mismo día: el 2 toca mañana
  await expect(seg.getByText(/Ya enviaste un mensaje hoy · El mensaje 2 se puede enviar el 9 oct 2026/)).toBeVisible()
  await expect(seg.getByRole('link', { name: /Enviar mensaje 2/ })).toHaveCount(0)
  // Contestó: se detiene y se puede volver a empezar con el mensaje 1
  await seg.getByRole('button', { name: '✓ Contestó' }).click()
  await expect(seg.getByText(/Contestó el/)).toBeVisible()
  await seg.getByRole('button', { name: 'Enviar de nuevo el mensaje 1' }).click()
  await expect(seg.getByRole('link', { name: '💬 Enviar mensaje 1' })).toBeVisible()
  // Contestó: se detiene y se puede volver a empezar con el mensaje 1
  await seg.getByRole('button', { name: '✓ Contestó' }).click()
  await expect(seg.getByText(/Contestó el/)).toBeVisible()
  await seg.getByRole('button', { name: 'Enviar de nuevo el mensaje 1' }).click()
  await expect(seg.getByRole('link', { name: '💬 Enviar mensaje 1' })).toBeVisible()

  // Invitación: WhatsApp o correo, con la fecha de la reunión
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill('2026-10-09T10:30')
  await page.getByLabel('Lugar', { exact: true }).fill('su oficina')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  const inv = page.getByRole('region', { name: 'Invitación a la reunión' })
  await expect(inv).toContainText('Hola Ana, buenos días. Soy Brad, asesor comercial de SaludSA. Me gustaría invitarle a una reunión')
  await expect(inv).toContainText('el viernes 9 de octubre a las 10:30 en su oficina')
  const mail = inv.getByRole('link', { name: '📧 Correo' })
  await expect(mail).toHaveAttribute('href', /^mailto:ana%40correo\.com\?subject=Invitaci%C3%B3n%20a%20reuni%C3%B3n%20con%20Brad&body=Hola%20Ana/)
  await mail.click()
  await expect(page.getByText('Invitación por correo registrada')).toBeVisible()

  // Ambos: abre WhatsApp y deja listo el paso 2 (correo)
  await page.evaluate(() => {
    const w = window as unknown as { abiertos: string[] }
    w.abiertos = []
    window.open = ((u: string) => (w.abiertos.push(u), null)) as typeof window.open
  })
  await inv.getByRole('group', { name: 'Enviar la invitación' }).getByRole('button', { name: '📨 Ambos' }).click()
  const abiertos = await page.evaluate(() => (window as unknown as { abiertos: string[] }).abiertos)
  expect(abiertos[0]).toMatch(/^https:\/\/wa\.me\/593991234567\?text=Hola%20Ana/)
  const paso2 = inv.getByRole('status').filter({ hasText: 'Paso 2 de 2' })
  await expect(paso2.getByRole('link', { name: '📧 Enviar por correo' })).toHaveAttribute('href', /^mailto:ana%40correo\.com/)
  await paso2.getByRole('link', { name: '📧 Enviar por correo' }).click()
  await expect(paso2).toHaveCount(0)

  // Contactos: con foto configurada, el saludo deja elegir
  await page.goto('/#/contactos')
  await page.getByRole('button', { name: '+ Nuevo contacto' }).click()
  await campo(page, 'Nombre').fill('Luis Paz')
  await campo(page, 'Celular').fill('0987654321')
  await page.getByRole('button', { name: 'Guardar contacto' }).click()
  const sal = page.getByRole('region', { name: /Saludar hoy/ })
  await sal.getByRole('button', { name: 'Elegir saludo para Luis Paz' }).click()
  const opc = sal.getByRole('group', { name: 'Saludos para Luis Paz' })
  await expect(opc.getByRole('link', { name: '💬 Texto' })).toHaveAttribute('href', /text=Hola%20Luis%2C%20%C2%A1buenos%20d%C3%ADas!/)
  await expect(opc.getByRole('button', { name: '📷 Con foto' })).toBeVisible()
  await expect(opc.getByRole('button', { name: '🎬 Con video' })).toHaveCount(0)

  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)
})
