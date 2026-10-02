import type { Page } from '@playwright/test'

/** Campo por su etiqueta visible. */
export const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

/** Abre "+ acciones" en la ficha (si está cerrado) y toca la acción. */
export async function accion(page: Page, nombre: string | RegExp) {
  const mas = page.getByRole('button', { name: /^[+−] acciones$/ })
  if ((await mas.getAttribute('aria-expanded')) !== 'true') await mas.click()
  const b = page.getByRole('group', { name: 'Acciones con el prospecto' }).getByRole('button', { name: nombre })
  if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click()
}

/** Pre-cierre sin planes en la Biblioteca: el producto se escribe (contribución regular por defecto). */
export async function precierre(page: Page, producto: string, aporte: string, plazo = '') {
  await accion(page, 'Ya va a contratar')
  await campo(page, 'Tipo de plan').selectOption('Contribución regular')
  if (plazo) await campo(page, 'Plazo (años)').fill(plazo)
  await campo(page, 'Producto seleccionado').fill(producto)
  await campo(page, 'Aporte mensual (USD)').fill(aporte)
}

/** Abre una sección desplegable de la ficha (si está plegada). */
export async function abrir(page: Page, titulo: string | RegExp) {
  const b = page.getByRole('heading', { name: titulo }).getByRole('button')
  if ((await b.getAttribute('aria-expanded')) === 'false') await b.click()
}
