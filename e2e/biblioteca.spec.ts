import { expect, test } from '@playwright/test'
import { accion, campo } from './util'

/** PDF mínimo con una línea de texto por página (con su tabla xref correcta). */
function pdf(paginas: (string | string[])[]): Buffer {
  const objs: string[] = []
  const n = paginas.length
  // 1: catálogo, 2: páginas, 3: fuente, luego por página: página + contenido
  objs.push('<< /Type /Catalog /Pages 2 0 R >>')
  const kids = paginas.map((_, i) => `${4 + i * 2} 0 R`).join(' ')
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`)
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  paginas.forEach((t, i) => {
    const ls = Array.isArray(t) ? t : [t]
    const stream = `BT /F1 12 Tf 16 TL 40 750 Td ${ls.map((l) => `(${l}) Tj T*`).join(' ')} ET`
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
    )
    objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  let out = '%PDF-1.4\n'
  const offs: number[] = []
  objs.forEach((o, i) => {
    offs.push(out.length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  out += offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

test('Biblioteca: cargar PDF, buscar, guardar argumento, plan y la oferta del informe', async ({ page }) => {
  await page.goto('/')
  // La Biblioteca está en Configuración (ya no en el Inicio)
  await expect(page.getByRole('button', { name: /Biblioteca/ })).toHaveCount(0)
  await page.getByRole('navigation').getByRole('button', { name: 'Configuración' }).click()
  await page.getByRole('tab', { name: 'Biblioteca' }).click()
  await expect(page.getByRole('region', { name: '📚 Biblioteca' })).toContainText('De aquí se alimenta el sistema')
  await page.getByRole('button', { name: /Documentos \(0\)/ }).click()
  await expect(page.locator('.top .who b')).toHaveText('Biblioteca')
  await expect(page.getByText('Aún no hay documentos')).toBeVisible()

  // Cargar un PDF: el texto se lee en el dispositivo
  await page.getByRole('button', { name: '+ Cargar documento' }).click()
  await page.getByLabel('Plan (si es un anexo)').fill('Plan Familia')
  await campo(page, 'Nombre').fill('Condiciones generales')
  await page
    .getByLabel('Archivo PDF')
    .setInputFiles({
      name: 'condiciones.pdf',
      mimeType: 'application/pdf',
      buffer: pdf(['Coberturas generales del contrato', 'La maternidad tiene un periodo de carencia de diez meses']),
    })
  await expect(page.getByText(/Documento cargado: 2 páginas/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Condiciones generales' })).toBeVisible()

  // Buscar (sin importar tildes) y guardar el fragmento como argumento
  await page.getByLabel('Buscar en tus documentos').fill('período MATERNIDAD')
  const res = page.getByRole('region', { name: 'Resultados' })
  await expect(res.getByText('pág. 2')).toBeVisible()
  await expect(res.locator('mark').first()).toHaveText('maternidad')
  await res.getByRole('button', { name: 'Guardar como argumento' }).click()
  await expect(page.getByRole('heading', { name: 'Nuevo argumento' })).toBeVisible()
  await expect(page.getByLabel('Fuente')).toHaveValue('Condiciones generales, pág. 2')
  await page.getByLabel('Idea en una línea').fill('Contratar antes: la maternidad tiene carencia')
  await page.getByRole('button', { name: 'Familia y dependientes' }).click()
  await page.getByRole('button', { name: 'Guardar argumento' }).click()
  await expect(page.getByText('Contratar antes: la maternidad tiene carencia')).toBeVisible()

  // Plan del catálogo
  await page.getByRole('tab', { name: /Planes/ }).click()
  await page.getByRole('button', { name: '+ Nuevo plan' }).click()
  await campo(page, 'Nombre del plan').fill('Plan Familia')
  await campo(page, 'Beneficios y servicios incluidos').fill('Telemedicina 24/7\nChequeo preventivo anual')
  await campo(page, 'Carencias (tiempos de espera)').fill('Maternidad: 10 meses')
  await page.getByRole('button', { name: 'Guardar plan' }).click()
  const plan = page.locator('article.plan')
  await expect(plan.getByRole('heading', { name: 'Plan Familia' })).toBeVisible()
  await expect(plan.getByText('validar con la aseguradora')).toBeVisible()

  // Sin ancho de más en el teléfono
  const ancho = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(ancho).toBeLessThanOrEqual(0)

  // Ficha nueva: el precio sale del pre-cierre (con los planes de la Biblioteca)
  await page.goto('/')
  await page.goto('/#/nueva/nuevo')
  await page.getByLabel(/La persona aceptó/).click()
  await campo(page, 'Nombre').fill('Ana Torres')
  await campo(page, 'WhatsApp').fill('0991234567')
  await campo(page, '¿Quién depende de esta persona?').fill('su hija')
  await accion(page, 'Ya va a contratar')
  await campo(page, 'Producto seleccionado').selectOption({ label: 'Plan Familia' })
  await campo(page, 'Valor a pagar mensual (USD)').fill('90')
  // La oferta ya no se llena a mano: no está en "+ acciones"
  await expect(page.getByRole('group', { name: 'Acciones con el prospecto' }).getByRole('button', { name: /Oferta irresistible/ })).toHaveCount(0)

  // Va en grande al final de los informes, armada sola con la ficha, el plan y los argumentos
  await accion(page, 'Agendar 1ª reunión')
  await page.getByLabel('Fecha y hora').fill('2026-10-07T09:00')
  await page.getByRole('button', { name: 'Guardar reunión' }).click()
  await accion(page, '1ª reunión realizada')
  const post = page.getByRole('region', { name: 'Post reunión' })
  const oferta = post.getByLabel('Nuestra oferta para usted')
  await expect(oferta).toContainText('Nuestra oferta para usted · al final del informe, en grande')
  await expect(oferta).toContainText('Familia protegida')
  await expect(oferta).toContainText('Que su hija esté protegido si algo pasa')
  await expect(oferta).toContainText('4 bonos')
  await expect(oferta.getByText(/Sin plan de la Biblioteca/)).toHaveCount(0)
  await post.getByRole('button', { name: '2ª reunión: propuesta' }).click()
  await expect(oferta).toContainText('$90 al mes')

  // El PDF de la propuesta la lleva
  const descarga = page.waitForEvent('download')
  await post.getByRole('button', { name: '📄 Descargar PDF' }).click()
  const d = await descarga
  expect(d.suggestedFilename()).toMatch(/^propuesta-Ana-Torres-.*\.pdf$/)
})

test('Biblioteca: el plan se precarga desde el PDF, solo con lo que dice el documento', async ({ page }) => {
  await page.goto('/#/biblioteca')
  await page.getByRole('button', { name: '+ Cargar documento' }).click()
  await page.getByLabel('Tipo').selectOption('anexo')
  await page.getByLabel('Plan (si es un anexo)').fill('Plan Salud Total')
  await campo(page, 'Nombre').fill('Anexo Salud Total')
  await page.getByLabel('Archivo PDF').setInputFiles({
    name: 'anexo.pdf',
    mimeType: 'application/pdf',
    buffer: pdf([
      ['COBERTURAS', '- Hospitalizacion y cirugia al 100%', '- Emergencias 24/7', '', '', 'Prima mensual: $120', 'Deducible anual: $300'],
      ['CARENCIAS', '- Maternidad: 10 meses', '', '', 'EXCLUSIONES', '- Tratamientos esteticos'],
    ]),
  })
  // Se abre el plan precargado para revisarlo
  const ed = page.getByRole('region', { name: 'Editar plan' })
  await expect(ed.getByRole('status')).toContainText('Precargado del PDF: Anexo Salud Total')
  await expect(ed.getByRole('status')).toContainText('Solo copié lo que está escrito en el documento')
  await expect(campo(page, 'Nombre del plan')).toHaveValue('Plan Salud Total')
  await expect(campo(page, 'Coberturas principales')).toHaveValue('Hospitalizacion y cirugia al 100%\nEmergencias 24/7')
  await expect(campo(page, 'Carencias (tiempos de espera)')).toHaveValue('Maternidad: 10 meses')
  await expect(campo(page, 'Exclusiones')).toHaveValue('Tratamientos esteticos')
  await expect(campo(page, 'Precio de referencia')).toHaveValue('$120')
  await expect(campo(page, 'Fuente')).toHaveValue('Anexo Salud Total, págs. 1, 2')
  await page.getByRole('button', { name: 'Guardar plan' }).click()
  const plan = page.locator('article.plan')
  await expect(plan.getByRole('heading', { name: 'Plan Salud Total' })).toBeVisible()
  await expect(plan).toContainText('Tabla de coberturas: 3 conceptos')
  await expect(plan).toContainText('Fuente: Anexo Salud Total, págs. 1, 2')

  // Desde la lista de documentos también se puede volver a precargar
  await page.getByRole('tab', { name: /Documentos/ }).click()
  await page.getByRole('button', { name: 'Precargar plan' }).click()
  await expect(page.getByRole('heading', { name: 'Actualizar plan desde el PDF' })).toBeVisible()
})
