import { devices, expect, test, type Page } from '@playwright/test'
import { accion } from './util'

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

// En computadora: WhatsApp Web y el correo web según el dominio.
test.use({ ...devices['Desktop Chrome'] })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a && /^(https?:\/\/(?!localhost)|mailto:|sms:|tel:)/.test(a.getAttribute('href') ?? '')) e.preventDefault()
    }, true)
  })
})

test('Perfil con celular y correo; sincronizar WhatsApp Web y Gmail; los envíos usan esas herramientas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Sincroniza tus herramientas/ })).toBeVisible()
  await page.getByRole('button', { name: /Sincroniza tus herramientas/ }).click()

  const herr = page.getByRole('region', { name: 'Herramientas de envío' })
  await expect(herr.getByText(/Escribe tu celular y tu correo/)).toBeVisible()
  await campo(page, 'Celular (WhatsApp)').fill('0991')
  await campo(page, 'Correo electrónico').fill('bracho@gmail.com')
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Revisa tu número de celular')).toBeVisible()
  await campo(page, 'Celular (WhatsApp)').fill('099 765 4321')
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Configuración guardada y actualizada')).toBeVisible()

  await expect(herr).toContainText('Los mensajes salen por WhatsApp Web y los correos por Gmail / Google Workspace')
  await herr.getByRole('button', { name: '🔄 Sincronizar' }).click()
  const pasos = herr.getByRole('list', { name: 'Sincronizar herramientas' })
  const wa = pasos.getByRole('link', { name: 'Activar' }).first()
  await expect(wa).toHaveAttribute('href', 'https://web.whatsapp.com/')
  await expect(wa).toHaveAttribute('target', 'whatsapp')
  await wa.click()
  const gm = pasos.getByRole('link', { name: 'Activar' })
  await expect(gm).toHaveAttribute('href', 'https://mail.google.com/mail/?authuser=bracho%40gmail.com')
  await gm.click()
  await expect(pasos.getByText('✓ Listas para la gestión')).toBeVisible()
  await expect(herr.getByText('Listas ✓')).toBeVisible()

  // Inicio ya no pide sincronizar
  await page.getByRole('navigation').getByRole('button', { name: 'Inicio' }).click()
  await expect(page.getByRole('button', { name: /Sincroniza tus herramientas/ })).toHaveCount(0)

  // Una ficha: WhatsApp Web y Gmail con la firma
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'WhatsApp').fill('0991234567')
  await campo(page, 'Correo').fill('ana@correo.com')
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill('2030-10-09T10:30')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await accion(page, 'Mensajes')
  const msj = page.getByRole('region', { name: 'Mensajes de seguimiento' })
  const enlace = msj.getByRole('link', { name: '💬 WhatsApp' })
  await expect(enlace).toHaveAttribute('href', /^https:\/\/web\.whatsapp\.com\/send\?phone=593991234567&text=Hola%20Ana/)
  await expect(enlace).toHaveAttribute('target', 'whatsapp')
  await accion(page, 'Invitación')
  const inv = page.getByRole('region', { name: 'Invitación a la reunión' })
  const correo = inv.getByRole('link', { name: '📧 Correo' })
  await expect(correo).toHaveAttribute('href', /^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&authuser=bracho%40gmail\.com&to=ana%40correo\.com&su=/)
  await expect(correo).toHaveAttribute('href', /WhatsApp%3A%20099%20765%204321/)
  await expect(correo).toHaveAttribute('target', 'correo')
})

test('Modo sin conexión: WhatsApp y correo pasan a las apps', async ({ page }) => {
  await page.goto('/#/ajustes')
  await campo(page, 'Celular (WhatsApp)').fill('0997654321')
  await campo(page, 'Correo electrónico').fill('bracho@gmail.com')
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Configuración guardada y actualizada')).toBeVisible()

  const ficha = async () => {
    await page.goto('/#/nueva/nuevo')
    await page.getByLabel(/La persona aceptó/).click()
    await campo(page, 'Nombre').fill('Ana')
    await campo(page, 'WhatsApp').fill('0991234567')
    await campo(page, 'Correo').fill('ana@x.com')
    await accion(page, 'Invitación')
    return page.getByRole('region', { name: 'Invitación a la reunión' })
  }
  let inv = await ficha()
  await expect(inv.getByRole('link', { name: '💬 WhatsApp' })).toHaveAttribute('href', /^https:\/\/web\.whatsapp\.com\/send/)
  await expect(inv.getByRole('link', { name: '📧 Correo' })).toHaveAttribute('href', /^https:\/\/mail\.google\.com/)

  await page.goto('/#/ajustes')
  await page.getByRole('switch', { name: /Modo sin conexión/ }).check()
  await expect(page.getByText('Modo sin conexión activado')).toBeVisible()
  inv = await ficha()
  await expect(inv.getByRole('link', { name: '💬 WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/593991234567/)
  await expect(inv.getByRole('link', { name: '📧 Correo' })).toHaveAttribute('href', /^mailto:ana%40x\.com/)
})
