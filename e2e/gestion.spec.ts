import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const BASE = fileURLToPath(new URL('./datos/base.xlsx', import.meta.url))

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

test('Base de datos → Centro de Gestión: uno por uno, con resumen obligatorio, recomendación y soltar', async ({ page }) => {
  await page.goto('/')
  // Inicio: saludo, fecha y frase
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Buenos días, Bracho/)
  await expect(page.getByText('Miércoles, 7 de octubre de 2026')).toBeVisible()
  await expect(page.locator('.hero .frase')).toHaveText(/^“.+”$/)

  // Base de datos: cargar Excel (encabezado en la fila 2, edad desde la fecha de nacimiento)
  await page.getByRole('navigation').getByRole('button', { name: 'Base de datos' }).click()
  await page.getByLabel('Archivo de Excel o CSV').setInputFiles(BASE)
  await expect(page.getByText('base.xlsx: 4 contactos con nombre y celular o correo.')).toBeVisible()
  const lista = page.getByRole('list', { name: 'Contactos del archivo' })
  await expect(lista.getByText('36 años · Quito')).toBeVisible()
  await page.getByLabel('Ciudad', { exact: true }).first().selectOption('Quito')
  await expect(page.getByText('2 con este filtro · 0 ya están en tu base')).toBeVisible()
  await page.getByRole('button', { name: 'Agregar 2 al Centro de Gestión' }).click()
  await expect(page.getByText('2 contactos agregados al Centro de Gestión')).toBeVisible()
  await expect(page.getByRole('region', { name: /Tu base/ })).toContainText('Ana Paz')

  // Inicio muestra cuántos hay por gestionar
  await page.getByRole('navigation').getByRole('button', { name: 'Inicio' }).click()
  await expect(page.getByRole('button', { name: /Centro de Gestión/ })).toContainText('2 por gestionar hoy')
  // Los de base de datos no entran al saludo diario
  await expect(page.getByRole('region', { name: /Saludar hoy/ })).toHaveCount(0)

  // Centro de Gestión
  await page.getByRole('button', { name: /Centro de Gestión/ }).click()
  await expect(page.getByRole('button', { name: 'Base de datos 2' })).toBeVisible()
  const card = page.getByRole('article', { name: 'Gestión de Ana Paz' })
  await expect(card).toContainText('36 años')
  await expect(card).toContainText('Quito')
  await expect(card.getByRole('region', { name: 'Recomendación' })).toContainText('Primer contacto')
  await expect(card.getByRole('link', { name: /Llamar/ })).toHaveAttribute('href', 'tel:0991112233')

  // No se puede continuar sin resultado ni resumen
  await card.getByRole('button', { name: 'Guardar y siguiente →' }).click()
  await expect(card.getByRole('alert')).toHaveText('Elige cómo terminó la gestión')
  await card.getByRole('button', { name: /Interesado/ }).click()
  await card.getByRole('button', { name: 'Guardar y siguiente →' }).click()
  await expect(card.getByRole('alert')).toHaveText('Escribe un resumen de la gestión para continuar')

  // Saludo y registro de la acción
  await card.getByRole('button', { name: /Saludo/ }).click()
  await card.getByRole('link', { name: '💬 Saludo de texto' }).click()
  await expect(card.getByText('Hecho en esta gestión: Saludo')).toBeVisible()
  await card.getByRole('textbox', { name: /Resumen de la gestión/ }).fill('Le interesa un plan familiar, tiene dos hijos')
  await card.getByRole('button', { name: 'Guardar y siguiente →' }).click()

  // Siguiente contacto automático
  const carla = page.getByRole('article', { name: 'Gestión de Carla Ruiz' })
  await expect(carla).toBeVisible()
  await expect(page.getByText('Hoy: 1 de 2 gestionados')).toBeVisible()
  // Sin celular: no se puede llamar
  await expect(carla.getByRole('button', { name: /Llamar/ })).toBeDisabled()
  // Agendar reunión → abre la invitación (por correo)
  await carla.getByRole('button', { name: /Agendar reunión/ }).click()
  await carla.getByLabel('Fecha y hora').fill('2026-10-09T10:30')
  await carla.getByLabel('Lugar', { exact: true }).fill('su oficina')
  await carla.getByRole('button', { name: 'Guardar reunión' }).click()
  const inv = carla.getByLabel('Invitación a la reunión')
  await expect(inv).toContainText('el viernes 9 de octubre a las 10:30 en su oficina')
  await expect(inv.getByRole('link', { name: '📧 Correo' })).toHaveAttribute('href', /^mailto:carla%40correo\.com/)
  // Sin celular, "Ambos" no aplica
  await expect(inv.getByRole('button', { name: '📨 Ambos' })).toBeDisabled()
  await expect(carla.getByRole('button', { name: /Agendó reunión/ })).toHaveAttribute('aria-pressed', 'true')

  // Soltar: pide resumen y dos toques
  await carla.getByRole('button', { name: /No interesado/ }).click()
  await carla.getByRole('textbox', { name: /Resumen de la gestión/ }).fill('Dijo que no le interesa por ahora')
  await carla.getByRole('button', { name: '🏁 Soltar contacto' }).click()
  await carla.getByRole('button', { name: '¿Soltar? Toca otra vez' }).click()
  await expect(page.getByText(/Carla Ruiz quedó fuera de gestión/)).toBeVisible()
  await expect(page.getByText('¡Terminaste por hoy! 🎉')).toBeVisible()

  // Sigue en la base de datos, como soltado, y se puede recuperar
  await page.getByRole('navigation').getByRole('button', { name: 'Base de datos' }).click()
  await page.getByRole('button', { name: 'Soltados 1' }).click()
  await page.getByRole('button', { name: 'Recuperar' }).click()
  await expect(page.getByText('Carla Ruiz volvió al Centro de Gestión')).toBeVisible()
  // Espera a que quede escrito en el dispositivo antes de recargar
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((ok) => {
            const r = indexedDB.open('tablero-prospectos-saludsa')
            r.onsuccess = () => {
              const q = r.result.transaction('contactos').objectStore('contactos').getAll()
              q.onsuccess = () => {
                const c = (q.result as { nombre: string; soltado?: unknown; reunion?: string }[]).find((x) => x.nombre === 'Carla Ruiz')
                ok(c && !c.soltado ? String(c.reunion) : '')
              }
            }
          }),
      ),
    )
    .toBe('2026-10-09T10:30')

  // La gestión de Ana quedó guardada y su recomendación cambió
  await page.reload()
  await page.getByRole('navigation').getByRole('button', { name: 'Gestión' }).click()
  await page.clock.setFixedTime(new Date('2026-10-08T10:00:00-05:00'))
  await page.reload()
  // Primero quien tiene reunión mañana (Carla, recuperada)
  const carla2 = page.getByRole('article', { name: 'Gestión de Carla Ruiz' })
  await expect(carla2).toContainText('Reunión mañana a las 10:30')
  await carla2.getByRole('button', { name: /Recordatorio/ }).click()
  await expect(carla2.getByLabel('Recordatorio de reunión')).toContainText('Le escribo para confirmar nuestra reunión mañana a las 10:30 en su oficina')
  await carla2.getByRole('button', { name: /Volver a contactar/ }).click()
  await carla2.getByRole('textbox', { name: /Resumen de la gestión/ }).fill('Le confirmé la reunión de mañana')
  await carla2.getByRole('button', { name: 'Guardar y siguiente →' }).click()

  const ana = page.getByRole('article', { name: 'Gestión de Ana Paz' })
  await expect(ana).toContainText('Última gestión 7 oct 2026: Interesado')
  await expect(ana).toContainText('Le interesa un plan familiar, tiene dos hijos')
  await expect(ana.getByRole('region', { name: 'Recomendación' })).toContainText('Hay interés: agenda la reunión')

  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)
})

test('Pasar a reunión: elige nuevo cliente o cambio de seguro y abre su ficha', async ({ page }) => {
  await page.goto('/#/gestion/contactos')
  await page.getByRole('button', { name: '+ Nuevo contacto' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Marta Lino')
  await page.getByLabel('Celular', { exact: true }).fill('0991234567')
  await page.getByRole('button', { name: 'Guardar contacto' }).click()

  await page.getByRole('tab', { name: 'Gestionar' }).click()
  const card = page.getByRole('article', { name: 'Gestión de Marta Lino' })
  await card.getByRole('button', { name: /Pasar a reunión/ }).click()
  const opc = card.getByLabel('Pasar a reunión')
  await expect(opc.getByRole('button', { name: /Nuevo cliente/ })).toBeVisible()
  // Sin resumen no pasa
  await opc.getByRole('button', { name: /Cambio de seguro/ }).click()
  await expect(card.getByRole('alert')).toHaveText('Escribe un resumen de la gestión para continuar')
  await card.getByRole('textbox', { name: /Resumen de la gestión/ }).fill('Quiere cambiarse, su seguro actual no le reembolsa')
  await opc.getByRole('button', { name: /Cambio de seguro/ }).click()

  // Ficha de persona asegurada con sus datos
  await expect(page.getByText(/Cambio de seguro: completa su ficha para la reunión/)).toBeVisible()
  await page.getByLabel(/La persona aceptó/).click()
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Marta Lino')
  await expect(page.getByLabel('Aseguradora actual', { exact: true })).toBeVisible()
  await expect(page.locator('.top .who small')).toContainText('Persona asegurada')
  // Al pasar a reunión, la etapa avanza sola
  await expect(page.getByText('Etapa: Primera reunión')).toBeVisible()
  // La gestión quedó guardada en la ficha
  await expect(page.getByRole('list', { name: 'Contactos registrados' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Guardar y volver' }).click()

  // En la lista de contactos el botón también deja elegir
  await page.goto('/#/gestion/contactos')
  await page.getByRole('button', { name: '+ Nuevo contacto' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Juan Ríos')
  await page.getByLabel('Celular', { exact: true }).fill('0987654321')
  await page.getByRole('button', { name: 'Guardar contacto' }).click()
  await page.getByRole('button', { name: '🤝 Pasar a reunión' }).click()
  await page.getByRole('group', { name: '¿Nuevo cliente o cambio de seguro?' }).getByRole('button', { name: '🚀 Nuevo cliente' }).click()
  await expect(page.locator('.top .who small')).toContainText('Nuevo prospecto')
})

test('Inicio: nuevo contacto que queda en la Base de datos y en el Centro de Gestión (sin repetir)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Nuevo contacto/ }).click()
  const hoja = page.getByRole('dialog', { name: 'Agregar contacto' })
  await hoja.getByLabel('Nombre', { exact: true }).fill('Rosa Mena')
  await hoja.getByLabel('Celular', { exact: true }).fill('0991112233')
  await hoja.getByLabel('Ciudad', { exact: true }).fill('Quito')
  await hoja.getByLabel('Origen', { exact: true }).selectOption('Evento')
  await hoja.getByRole('button', { name: 'Guardar contacto' }).click()
  await expect(page.getByText('Rosa Mena quedó en tu Base de datos y en el Centro de Gestión')).toBeVisible()
  await expect(hoja).toHaveCount(0)

  // No se repite el mismo celular
  await page.getByRole('button', { name: /Nuevo contacto/ }).click()
  await hoja.getByLabel('Nombre', { exact: true }).fill('Rosa M.')
  await hoja.getByLabel('Celular', { exact: true }).fill('+593 99 111 2233')
  await hoja.getByRole('button', { name: 'Guardar contacto' }).click()
  await expect(hoja.getByRole('alert')).toHaveText('Ya está en tu base: Rosa Mena')
  await hoja.getByRole('button', { name: 'Cerrar' }).click()

  // En la Base de datos y en el Centro de Gestión
  await page.getByRole('navigation').getByRole('button', { name: 'Base de datos' }).click()
  await expect(page.getByRole('region', { name: /Tu base/ })).toContainText('Rosa Mena')
  await expect(page.getByRole('region', { name: /Tu base/ })).toContainText('Quito · Evento')
  await page.getByRole('navigation').getByRole('button', { name: 'Gestión' }).click()
  await expect(page.getByRole('button', { name: 'Evento 1' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Gestión de Rosa Mena' })).toBeVisible()
})
