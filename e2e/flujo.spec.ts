import { expect, test } from '@playwright/test'
import { abrir, accion, campo, precierre } from './util'

test('crear ficha → llenar → analizar → guardar → reabrir', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /Centro de Gestión/ })).toBeVisible()

  // Nueva ficha de persona asegurada: sin consentimiento no hay misiones
  await page.goto('/#/nueva/cambio')
  await expect(page.getByText('Antes de empezar')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Datos del prospecto' })).toHaveCount(0)
  await page.getByLabel(/La persona aceptó/).click()
  await expect(page.getByRole('heading', { name: 'Datos del prospecto' })).toBeVisible()
  await expect(page.getByText(/Consentimiento registrado el/)).toBeVisible()

  // Misión 1
  await campo(page, 'Nombre').fill('Luis Andrade')
  await campo(page, 'WhatsApp').fill('0991234567')
  await campo(page, 'Edad (años)').fill('45')
  // Las secciones son desplegables: Descubrimiento se abre con su título
  await abrir(page, 'Descubrimiento')
  await campo(page, '¿Dónde invierte hoy?').fill('Banco X')
  await campo(page, 'Saldo acumulado hoy (USD)').fill('20000')

  // Motivos: al elegir "Comisiones y costos" aparecen sus campos; al quitarlo se ocultan sin borrar
  await expect(campo(page, 'Costos que conoce (administración, entrada, salida…)')).toHaveCount(0)
  await page.getByRole('button', { name: /Comisiones y costos/ }).click()
  await campo(page, 'Costos que conoce (administración, entrada, salida…)').fill('2 % anual')
  await campo(page, '¿Sabe cuánto paga en comisiones y costos?').selectOption('No')
  await page.getByRole('button', { name: /Comisiones y costos/ }).click()
  await expect(campo(page, 'Costos que conoce (administración, entrada, salida…)')).toHaveCount(0)
  await page.getByRole('button', { name: /Comisiones y costos/ }).click()
  await expect(campo(page, 'Costos que conoce (administración, entrada, salida…)')).toHaveValue('2 % anual')

  await campo(page, '¿Para qué quiere invertir?').selectOption('Retiro o jubilación')
  await campo(page, '¿En cuánto tiempo necesitará ese dinero?').selectOption('10 a 20 años')

  // Ya va a contratar: pre-cierre con tipo de plan, plazo y aporte (sin tabla de comisiones, avisa dónde escribirla)
  await precierre(page, 'Plan Futuro', '100', '12')
  await expect(page.getByText(/Escribe tu tabla de comisiones en Configuración/)).toBeVisible()

  // Historial de contactos (desde + acciones)
  await accion(page, 'Registrar contacto')
  await page.getByLabel('¿Qué pasó? (opcional)').fill('Primera llamada')
  await page.getByRole('button', { name: '+ Registrar contacto' }).click()
  await expect(page.getByRole('list', { name: 'Contactos registrados' }).getByText('Primera llamada')).toBeVisible()
  await campo(page, 'Próximo contacto').fill('2030-01-15')

  // Analizar: veredicto sincero, calculado en el dispositivo
  await accion(page, 'Analizar ficha')
  const an = page.getByRole('region', { name: 'Análisis para la propuesta' })
  await expect(an.getByText('Aún no conviene mover su dinero')).toBeVisible()

  // Guardar y volver: aparece en la lista
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  await expect(page.getByRole('button', { name: /Luis Andrade/ })).toBeVisible()

  // Recargar la página (reabrir la app) y abrir la ficha: nada se perdió
  await page.reload()
  await page.getByRole('button', { name: /Luis Andrade/ }).click()
  await abrir(page, 'Datos del prospecto')
  await abrir(page, 'Descubrimiento')
  await expect(campo(page, 'Edad (años)')).toHaveValue('45')
  await expect(campo(page, 'Costos que conoce (administración, entrada, salida…)')).toHaveValue('2 % anual')
  await expect(campo(page, 'Aporte mensual (USD)')).toHaveValue('100')
  await expect(campo(page, 'Plazo (años)')).toHaveValue('12')
})

test('eliminar pide un segundo toque y la ficha no revive', async ({ page }) => {
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Para borrar')
  const borrar = page.getByRole('button', { name: 'Eliminar' })
  await borrar.click()
  await expect(page.getByRole('button', { name: 'Toca otra vez para eliminar' })).toBeVisible()
  await page.getByRole('button', { name: 'Toca otra vez para eliminar' }).click()
  await expect(page.getByRole('button', { name: /Centro de Gestión/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Para borrar/ })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: /Para borrar/ })).toHaveCount(0)
})

test('nada es más ancho que la pantalla del celular', async ({ page }) => {
  for (const ruta of ['/', '/#/clientes', '/#/nueva/nuevo']) {
    await page.goto(ruta)
    const { vw, sw } = await page.evaluate(() => ({
      vw: document.documentElement.clientWidth,
      sw: document.documentElement.scrollWidth,
    }))
    expect(sw, ruta).toBeLessThanOrEqual(vw)
  }
})

test('agenda: un contacto vencido aparece arriba', async ({ page }) => {
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Vencida')
  await accion(page, 'Registrar contacto')
  await campo(page, 'Próximo contacto').fill('2020-01-01')
  await campo(page, '¿Qué le aportas en ese contacto?').fill('mandarle un caso real')
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  const agenda = page.getByRole('region', { name: 'Agenda' })
  await expect(agenda.getByText('Vencidos')).toBeVisible()
  await expect(agenda.getByRole('button', { name: /Ana Vencida.*mandarle un caso real/ })).toBeVisible()
})

test('se pueden escribir espacios en los campos de texto (tecleando como en el celular)', async ({ page }) => {
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').pressSequentially('Luis Andrade Pérez')
  await expect(campo(page, 'Nombre')).toHaveValue('Luis Andrade Pérez')
  await campo(page, '¿Quién depende de esta persona?').pressSequentially('esposa y 2 hijos')
  await expect(campo(page, '¿Quién depende de esta persona?')).toHaveValue('esposa y 2 hijos')
  await accion(page, 'Notas')
  await campo(page, 'Notas').pressSequentially('Llamar en la tarde ')
  await expect(campo(page, 'Notas')).toHaveValue('Llamar en la tarde ')
  // Se guarda con sus espacios
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  await expect(page.getByRole('button', { name: /Luis Andrade Pérez/ })).toBeVisible()
})

test('Llamar con saldo y WhatsApp: el contacto se registra solo (con Deshacer)', async ({ page, context }) => {
  // En el navegador de pruebas no hay teléfono: se evita navegar a tel: (el clic igual se procesa).
  await page.addInitScript(() => {
    document.addEventListener(
      'click',
      (e) => {
        const a = (e.target as Element).closest('a[href^="tel:"]')
        if (a) e.preventDefault()
      },
      true,
    )
  })
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Carla Ruiz')
  // Sin número todavía: no hay botones
  await expect(page.getByRole('link', { name: 'Llamar a Carla Ruiz' })).toHaveCount(0)
  await campo(page, 'WhatsApp').fill('099 123-4567')

  // 📞 llama directo con saldo (sin menú) y registra
  const llamar = page.getByRole('link', { name: 'Llamar a Carla Ruiz' })
  await expect(llamar).toHaveAttribute('href', 'tel:0991234567')
  await llamar.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await accion(page, 'Registrar contacto')
  await expect(page.getByText(/En el historial: Llamada · \+10 XP/)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Contactos registrados' }).getByText('· Llamada')).toBeVisible()

  // Deshacer lo quita
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByRole('list', { name: 'Contactos registrados' })).toHaveCount(0)

  // 💬 abre WhatsApp (pestaña nueva) y registra el mensaje
  const escribir = page.getByRole('link', { name: 'Escribir por WhatsApp a Carla Ruiz' })
  await expect(escribir).toHaveAttribute('href', 'https://wa.me/593991234567')
  const [popup] = await Promise.all([context.waitForEvent('page'), escribir.click()])
  await popup.close()
  await expect(page.getByRole('list', { name: 'Contactos registrados' }).getByText('· WhatsApp')).toBeVisible()

  // En la agenda también están los dos botones
  await campo(page, 'Próximo contacto').fill('2020-01-01')
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  const agenda = page.getByRole('region', { name: 'Agenda' })
  await expect(agenda.getByRole('link', { name: 'Llamar a Carla Ruiz' })).toHaveAttribute('href', 'tel:0991234567')
  await expect(agenda.getByRole('link', { name: 'Escribir por WhatsApp a Carla Ruiz' })).toBeVisible()
})

test('ficha: sin presentación ni seguimiento; + acciones; etapas solas; dos reuniones y tres referidos', async ({ page }) => {
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'Ciudad').fill('Quito')
  // Ocupación: riesgos de su trabajo
  await campo(page, 'Ocupación').fill('Chofer de taxi')
  await expect(page.getByLabel('Riesgos de su trabajo')).toContainText('accidentes de tránsito')
  await expect(page.getByRole('heading', { name: 'Presentación' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Seguimiento y cierre' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Declaración de preexistencias' })).toHaveCount(0)
  await expect(page.getByText('Etapa: Primer contacto')).toBeVisible()
  // Las acciones están en el desplegable, debajo de los datos
  await expect(page.getByRole('group', { name: 'Acciones con el prospecto' })).toHaveCount(0)

  // Primer contacto registrado → "Cuadrar cita"
  await accion(page, 'Registrar contacto')
  await page.getByRole('button', { name: '+ Registrar contacto' }).click()
  await expect(page.getByText('Etapa: Cuadrar cita')).toBeVisible()

  // 1ª reunión agendada → etapa "Primera reunión"
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill('2030-10-09T10:30')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await expect(page.getByText('Etapa: Primera reunión')).toBeVisible()

  // 1ª realizada sin referidos → "Segunda reunión" y pedirlos en la segunda
  await accion(page, '1ª reunión realizada')
  await expect(page.getByText(/pide los 3 referidos en la segunda reunión/)).toBeVisible()
  await expect(page.getByText('Etapa: Segunda reunión')).toBeVisible()
  const refs = page.getByRole('region', { name: 'Referidos' })
  await expect(refs).toContainText('pídelos en la segunda')
  await refs.getByLabel('Nombre del referido 1').fill('Luis Paz')
  await refs.getByLabel('Celular del referido 1').fill('0991112233')
  await refs.getByLabel('Relación del referido 1').selectOption('Compañero de trabajo')
  await refs.getByRole('button', { name: 'Guardar en Base de datos' }).first().click()
  await expect(page.getByText('Luis Paz quedó en tu Base de datos como referido de Ana')).toBeVisible()
  await expect(refs).toContainText('1/3')

  // 2ª reunión → "Seguimiento"; una 3ª solo como caso especial
  await accion(page, 'Agendar 2ª reunión')
  await page.getByLabel('Fecha y hora').fill('2030-10-16T10:30')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await accion(page, '2ª reunión realizada')
  await expect(page.getByText('Etapa: Segunda reunión')).toBeVisible()

  // Informe de la segunda reunión: la propuesta con las objeciones que planteó
  const post = page.getByRole('region', { name: 'Post reunión' })
  await expect(post.getByRole('button', { name: '2ª reunión: propuesta' })).toHaveAttribute('aria-pressed', 'true')
  await expect(post.getByText(/Aún no hay propuesta/)).toBeVisible()
  await post.getByRole('button', { name: 'No tengo dinero ahora / no me alcanza' }).click()
  await post.getByLabel('Otra objeción (con sus palabras)').fill('¿Y si me mudo?')
  await expect(post.getByLabel('Vista previa del informe')).toContainText('2 preguntas frecuentes')
  const [pdf] = await Promise.all([page.waitForEvent('download'), post.getByRole('button', { name: '📄 Descargar PDF' }).click()])
  expect(pdf.suggestedFilename()).toMatch(/^propuesta-Ana-Torres-/)
  await post.getByRole('button', { name: '1ª reunión: resumen' }).click()
  await accion(page, 'Reunión extra')
  await expect(page.getByText(/Agenda otra solo en un caso extremo/)).toBeVisible()
  await page.getByLabel('Fecha y hora').fill('2030-10-20T10:30')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await expect(page.getByText('Anota por qué es un caso especial')).toBeVisible()

  // Ya va a contratar → pre-cierre con tipo de plan y plazo
  await accion(page, 'Ya va a contratar')
  await expect(page.getByText('Etapa: Pre-cierre')).toBeVisible()
  await expect(campo(page, 'Tipo de plan')).toBeVisible()

  // El referido quedó en la Base de datos
  await page.getByRole('button', { name: 'Guardar y volver' }).click()
  await page.goto('/#/base')
  await expect(page.getByText('Luis Paz')).toBeVisible()
})

test('cada fase tiene su botón para pasar a la siguiente', async ({ page }) => {
  await page.addInitScript(() => {
    window.open = (() => null) as typeof window.open
  })
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Rosa Mena')
  await campo(page, 'WhatsApp').fill('0991112233')
  // Invitación sin reunión agendada: pregunta qué día y a qué hora puede
  await accion(page, 'Invitación')
  const inv = page.getByRole('region', { name: 'Invitación a la reunión' })
  await expect(inv).toContainText('¿Qué día y a qué hora podría disponer de 30 minutos para tener la reunión?')
  await expect(inv).not.toContainText('¿Te queda bien?')
  await expect(inv.getByRole('link', { name: '💬 WhatsApp' })).toHaveAttribute('href', /disponer%20de%2030%20minutos/)
  await page.getByRole('button', { name: '− acciones' }).click()
  const fase = (a: string) => page.getByRole('button', { name: new RegExp(`^Pasar a ${a} →`) })
  await expect(page.getByText('Etapa: Primer contacto')).toBeVisible()
  // Secciones desplegables: solo la de la etapa está abierta
  const titulo = (t: string) => page.getByRole('heading', { name: t }).getByRole('button')
  await expect(titulo('Datos del prospecto')).toHaveAttribute('aria-expanded', 'true')
  await expect(titulo('Descubrimiento')).toHaveAttribute('aria-expanded', 'false')
  await expect(campo(page, '¿Dónde guarda hoy su dinero?')).toBeHidden()
  await titulo('Descubrimiento').click()
  await expect(campo(page, '¿Dónde guarda hoy su dinero?')).toBeVisible()
  await titulo('Descubrimiento').click()
  await expect(campo(page, '¿Dónde guarda hoy su dinero?')).toBeHidden()
  await page.locator('.wrap').screenshot({ path: test.info().outputPath('plegado.png') })
  await fase('Cuadrar cita').click()
  await expect(page.getByText('Etapa: Cuadrar cita')).toBeVisible()
  await fase('Primera reunión').click()
  await expect(page.getByText('Etapa: Primera reunión')).toBeVisible()
  // Al cambiar de etapa se abre la sección que toca y se pliega la anterior
  await expect(titulo('Descubrimiento')).toHaveAttribute('aria-expanded', 'true')
  await expect(titulo('Datos del prospecto')).toHaveAttribute('aria-expanded', 'false')
  // Abre "Agendar" para la primera reunión
  await expect(page.getByRole('button', { name: 'Guardar reunión' })).toBeVisible()
  await fase('Segunda reunión').click()
  await expect(page.getByText('Etapa: Segunda reunión')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Post reunión' })).toBeVisible()
  await fase('Pre-cierre').click()
  await expect(page.getByText('Etapa: Pre-cierre')).toBeVisible()
  // Sin producto no pasa a venta exitosa
  await fase('Venta exitosa').click()
  await expect(page.getByText('Elige al menos un producto')).toBeVisible()
  await campo(page, 'Producto seleccionado').fill('Plan Salud')
  await campo(page, 'Aporte mensual (USD)').fill('90')
  await fase('Venta exitosa').click()
  await expect(page.getByText('Etapa: Venta exitosa')).toBeVisible()
  await expect(fase('Cerrado')).toContainText('falta: número de contrato')
  // Las acciones llevan íconos (solo decoración)
  await page.getByRole('button', { name: '+ acciones' }).click()
  await expect(page.getByRole('button', { name: 'Mensajes', exact: true }).locator('.accion-ic')).toHaveText('💬')
})

test('Pre-cierre: identificación de cada asegurado (número, emisión y expiración)', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-02T10:00:00-05:00'))
  await page.goto('/')
  await page.goto('/#/nueva/cambio')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Luis Paz')
  await accion(page, 'Ya va a contratar')
  const ident = page.getByRole('region', { name: /Identificación de los asegurados/ })
  await expect(ident).toContainText('(0/1)')
  await ident.getByLabel('Número de identificación de Luis Paz').fill('1710034066')
  await expect(ident).toContainText('La cédula no es válida')
  await ident.getByLabel('Número de identificación de Luis Paz').fill('1710034065')
  await ident.getByLabel('Fecha de emisión del documento de Luis Paz').fill('2020-05-10')
  await ident.getByLabel('Fecha de expiración del documento de Luis Paz').fill('2030-05-10')
  await expect(ident).toContainText('(1/1)')
  await expect(ident).not.toContainText('no es válida')

  // Otro asegurado
  await ident.getByRole('button', { name: '+ Agregar asegurado' }).click()
  await ident.getByLabel('Nombre', { exact: true }).fill('Sofía Paz')
  await ident.getByLabel('Número de identificación de Sofía Paz').fill('AB123456')
  await ident.getByLabel('Fecha de emisión del documento de Sofía Paz').fill('2021-01-01')
  await ident.getByLabel('Fecha de expiración del documento de Sofía Paz').fill('2026-10-12')
  await expect(ident).toContainText('El documento vence en 10 días')
  await expect(ident).toContainText('(2/2)')

  // Se guarda (espera a que quede escrito en el dispositivo)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((ok) => {
            const r = indexedDB.open('tablero-prospectos-inversiones')
            r.onsuccess = () => {
              const q = r.result.transaction('fichas').objectStore('fichas').getAll()
              q.onsuccess = () => {
                const f = (q.result as { personas?: { identExpira?: string }[] }[]).find((x) => x.personas?.length === 2)
                ok(f?.personas?.[1]?.identExpira ?? '')
              }
            }
          }),
      ),
    )
    .toBe('2026-10-12')
  await page.reload()
  await expect(page.getByRole('region', { name: /Identificación de los asegurados/ }).getByLabel('Número de identificación de Sofía Paz')).toHaveValue('AB123456')
})
