import { expect, test } from '@playwright/test'

// PNG de 1×1 px
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const campo = (page: import('@playwright/test').Page, l: string) => page.getByLabel(l, { exact: true })

test('Tu foto: se sube en Configuración y va en el saludo a quien no te tiene registrado', async ({ page }) => {
  await page.goto('/#/ajustes')
  const sec = page.getByRole('region', { name: 'Tu foto' })
  await expect(sec.getByText('Subir foto')).toBeVisible()
  // Un archivo que no es imagen se rechaza
  await sec.getByLabel('Elegir tu foto').setInputFiles({ name: 'x.pdf', mimeType: 'application/pdf', buffer: PNG })
  await expect(page.getByText('Elige una foto')).toBeVisible()
  await sec.getByLabel('Elegir tu foto').setInputFiles({ name: 'yo.png', mimeType: 'image/png', buffer: PNG })
  await expect(sec.getByRole('img', { name: 'Tu foto' })).toBeVisible()
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Configuración guardada y actualizada')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('region', { name: 'Tu foto' }).getByRole('img', { name: 'Tu foto' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tu foto' }).getByText('Cambiar foto')).toBeVisible()

  // Contacto sin registrar: el saludo se comparte con la foto (botón, no enlace de solo texto)
  await page.goto('/#/gestion/contactos')
  await page.getByRole('button', { name: '+ Nuevo contacto' }).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'Celular').fill('0991234567')
  await page.getByRole('button', { name: 'Guardar contacto' }).click()
  await expect(page.getByRole('button', { name: 'Saludar por WhatsApp a Ana Torres' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Saludar por WhatsApp a Ana Torres' })).toHaveCount(0)
})
