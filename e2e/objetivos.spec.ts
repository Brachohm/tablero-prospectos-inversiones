import { expect, test, type Page } from '@playwright/test'
import { precierre } from './util'

const campo = (page: Page, etiqueta: string) => page.getByLabel(etiqueta, { exact: true })

test('Objetivo del mes: se llena con los cierres y desbloquea la comisión', async ({ page }) => {
  await page.goto('/')
  const obj = page.getByRole('region', { name: /Objetivo de/ })
  await expect(obj).toContainText('$0 de $750 en prima mensual')
  await expect(obj).toContainText('Te faltan $750')

  const cerrar = async (nombre: string, precio: string) => {
    await page.goto('/')
    await page.goto('/#/nueva/nuevo')
    await page.getByLabel(/La persona aceptó/).click()
    await campo(page, 'Nombre').fill(nombre)
    await precierre(page, 'Plan Salud', precio)
    await page.getByRole('button', { name: 'Venta exitosa', exact: true }).click()
  }
  const volver = () => page.getByRole('button', { name: 'Guardar y volver' }).click()

  await cerrar('Ana', '300')
  await volver()
  await expect(obj).toContainText('$300 de $750')
  await expect(obj).toContainText('1 contrato cerrado')
  // promedio 300 → faltan 450 ≈ 2 clientes para 750; 800 ≈ 3 para 1100
  await expect(obj).toContainText('Te faltan $450 · ≈ 2 clientes')
  await expect(obj).toContainText('Te faltan $800 · ≈ 3 clientes')

  await cerrar('Luis', '500')
  await expect(page.getByText(/Desbloqueaste: 90% de comisión/)).toBeVisible()
  await volver()
  await expect(obj).toContainText('$800 de $750')
  await expect(obj.getByText('¡Desbloqueado este mes!')).toHaveCount(1)
  await expect(obj).toContainText('Te faltan $300 · ≈ 1 cliente')

  // Pre-cierre: simulación en la línea de progreso (en la ficha y en el inicio)
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Rosa')
  await precierre(page, 'Plan Salud', '200')
  await expect(page.getByLabel('Simulación del objetivo', { exact: true })).toContainText(/con esta venta: \$1\.?000/)
  await volver()
  await expect(obj).toContainText(/En pre-cierre: \$200\. Si se cierran, llegas a \$1\.?000/)
  await expect(obj).toContainText('$800 de $750')
})

test('Contactos nuevos: registrar, saludar cada día y pasar a prospecto', async ({ page }) => {
  await page.addInitScript(() => {
    // En la prueba no se abre WhatsApp: solo se comprueba el enlace y el registro.
    document.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (a && /wa\.me|^tel:/.test(a.getAttribute('href') ?? '')) e.preventDefault()
    }, true)
  })
  await page.goto('/#/gestion/contactos')
  await page.getByRole('button', { name: '+ Nuevo contacto' }).click()
  await campo(page, 'Nombre').pressSequentially('María José Vera')
  await page.getByRole('button', { name: 'Guardar contacto' }).click()
  await expect(page.getByRole('alert')).toHaveText('Pon al menos el celular o el correo')
  await campo(page, 'Edad (años)').fill('41')
  await campo(page, 'Género').selectOption('Femenino')
  await campo(page, 'Celular').fill('0991234567')
  await campo(page, 'Correo').fill('maria@correo.com')
  // Contacto nuevo: por defecto "Sin registrar" (aún no tiene mi número)
  const reg = page.getByRole('switch')
  await expect(reg).not.toBeChecked()
  await expect(page.getByText('Aún no tiene tu número: el saludo incluye una presentación breve de quién eres.')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar contacto' }).click()
  await expect(page.getByRole('heading', { name: 'María José Vera' })).toBeVisible()
  await expect(page.getByText('Sin registrar: el saludo lo presenta')).toBeVisible()
  await expect(page.getByText('41 años · Femenino')).toBeVisible()

  // Recordatorio de hoy en el tablero
  const sal = page.getByRole('region', { name: /Saludar hoy/ })
  await expect(sal).toContainText('0 de 1 saludados')
  const wa = sal.getByRole('link', { name: 'Saludar por WhatsApp a María José Vera' })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/593991234567\?text=.*Mar%C3%ADa/)
  // Sin registrar: el saludo lleva la presentación breve
  await expect(wa).toHaveAttribute('href', /Le%20saluda%20Bracho%2C%20asesor%20de%20SaludSA/)
  await wa.click()
  await expect(sal).toContainText('1 de 1 saludados')
  await expect(sal).toContainText('¡Saludaste a todos tus contactos hoy!')
  // Deshacer
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(sal).toContainText('0 de 1 saludados')
  await sal.getByRole('button', { name: 'Marcar como saludado a María José Vera' }).click()
  await expect(sal).toContainText('1 de 1 saludados')

  // Se guarda: al recargar sigue saludado hoy (espera a que quede escrito en el dispositivo)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((ok) => {
            const r = indexedDB.open('tablero-prospectos-inversiones')
            r.onsuccess = () => {
              const q = r.result.transaction('contactos').objectStore('contactos').getAll()
              q.onsuccess = () => ok((q.result as { ultimoSaludo?: string }[]).filter((c) => c.ultimoSaludo).length)
            }
          }),
      ),
    )
    .toBe(1)
  await page.reload()
  await expect(sal).toContainText('1 de 1 saludados')

  // Pasar a prospecto: la ficha arranca con sus datos
  await page.getByRole('button', { name: '🤝 Pasar a reunión' }).click()
  await page.getByRole('button', { name: '🚀 Nuevo cliente' }).click()
  await page.getByLabel(/La persona aceptó/).click()
  await expect(campo(page, 'Nombre')).toHaveValue('María José Vera')
  await expect(campo(page, 'Edad (años)')).toHaveValue('41')
  await expect(campo(page, 'WhatsApp')).toHaveValue('0991234567')
  await expect(campo(page, 'Correo')).toHaveValue('maria@correo.com')
  await page.goto('/#/contactos')
  await expect(page.getByRole('heading', { name: 'María José Vera' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /contactos ya pasados a prospecto \(1\)/ })).toBeVisible()
  await expect(page.getByRole('region', { name: /Saludar hoy/ })).toHaveCount(0)

  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)
})

test('Propósito en grande y objetivos configurables (1 a 4, con beneficio si aplica)', async ({ page }) => {
  await page.goto('/')
  const obj = page.getByRole('region', { name: /Objetivo de/ })
  await expect(obj.getByRole('button', { name: /Escribe tu propósito/ })).toBeVisible()
  await obj.getByRole('button', { name: /Escribe tu propósito/ }).click()

  await campo(page, 'Propósito').fill('Darle a mi familia una vida tranquila')
  const sec = page.getByRole('region', { name: '🎯 Objetivos del mes' })
  // Hay dos por defecto: $750 → 90% y $1100 → 120%
  await expect(sec.getByLabel('Objetivo 1 (USD)')).toHaveValue('750')
  await expect(sec.getByLabel('Objetivo 2 (USD)')).toHaveValue('1100')
  // Agregar uno sin beneficio, de $500 (se ordena primero)
  await sec.getByRole('button', { name: '+ Agregar objetivo' }).click()
  await sec.getByLabel('Objetivo 3 (USD)').fill('500')
  // Uno con beneficio sin detalle no se guarda
  await sec.getByRole('button', { name: '+ Agregar objetivo' }).click()
  await sec.getByLabel('Objetivo 4 (USD)').fill('1.500')
  await sec.getByRole('group', { name: 'Beneficio del objetivo 4' }).getByRole('button', { name: 'Sí' }).click()
  await expect(sec.getByRole('button', { name: '+ Agregar objetivo' })).toHaveCount(0) // máximo 4
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Escribe el beneficio del objetivo 4')).toBeVisible()
  await sec.getByLabel('Detalle').nth(2).fill('Bono de viaje')
  await page.getByRole('button', { name: 'Guardar y actualizar' }).click()
  await expect(page.getByText('Configuración guardada y actualizada')).toBeVisible()
  // Quedaron ordenados
  await expect(sec.getByLabel('Objetivo 1 (USD)')).toHaveValue('500')
  await expect(sec.getByLabel('Objetivo 4 (USD)')).toHaveValue('1500')

  await page.getByRole('navigation').getByRole('button', { name: 'Inicio' }).click()
  await expect(obj.getByLabel('Mi propósito')).toContainText('Darle a mi familia una vida tranquila')
  await expect(obj).toContainText('$0 de $500 en prima mensual')
  const lista = obj.locator('.obj-escalones li')
  await expect(lista).toHaveCount(4)
  await expect(lista.nth(0)).toContainText('$500')
  await expect(lista.nth(0)).not.toContainText('→')
  await expect(lista.nth(1)).toContainText('$750 → 90% de comisión')
  await expect(lista.nth(3)).toContainText('$1500 → Bono de viaje')
})
