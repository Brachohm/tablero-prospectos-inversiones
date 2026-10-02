# CLAUDE.md · App "Tablero de prospectos SaludSA"

Este archivo es el brief del proyecto. Léelo completo antes de escribir código. Las decisiones tomadas después de la Fase 0 están en `DECISIONES.md` y mandan sobre este archivo cuando difieran. El prototipo funcional está en `prototipo/ficha-prospectos-saludsa.html` (un solo archivo HTML+JS, sin dependencias) y es la **referencia de comportamiento**: cuando este documento y el prototipo difieran, pregunta antes de decidir.

---

## 1. Qué es y para quién

Una app para **Bracho**, asesor comercial de medicina prepagada en SaludSA (Ecuador), para registrar y analizar prospectos **desde el celular**, en medio del día de ventas.

Tiene tres trabajos:
1. **Levantar información completa** de cada prospecto con una ficha guiada y gamificada.
2. **Analizar** lo recabado para saber qué busca el cliente, qué quiere evitar y qué considerar al armar la propuesta.
3. **Dar una recomendación sincera**: si el paso (contratar o cambiarse) es viable, y si el problema real es del producto, del uso o de la contratación.

### Filosofía del producto (no negociable)
- Ayudar a la gente a **elegir un seguro con criterio, no por precio**. El objetivo es que, eligiendo bien, el costo de no tener el seguro correcto sea el mínimo.
- **Costo de oportunidad** en ambos casos: para el nuevo prospecto, lo que arriesga por no tenerlo; para la persona asegurada, lo que está en riesgo si no se ajusta y lo que puede perder si cambia solo por precio.
- **La app puede decir "aún no conviene cambiar" o "no elijas solo por precio".** Nunca empuja una venta.
- Sin urgencia falsa, sin promesas irreales. Todo lo que dependa de SaludSA (tarifas por edad, carencias, preexistencias, continuidad de antigüedad, garantías, bonos) se marca **"validar con SaludSA"** y no se hardcodea como hecho.

### Contexto adicional
La carpeta `docs/` tiene tres documentos del proyecto (ruta a Director Comercial, técnicas de venta y guion, posicionamiento personal). Las técnicas de venta vienen de Alex Dey (La Biblia del Vendedor), Alex Hormozi ($100M Offers) y Grant Cardone (Vendes o Vendes). El checklist de presentación de la ficha sale de ahí.

---

## 2. Dos tipos de ficha (menú principal)

| Tipo | Clave | Quién es |
|---|---|---|
| 🚀 Nuevo prospecto | `nuevo` | Quiere contratar su seguro de salud |
| 🔄 Persona asegurada | `cambio` | Está inconforme con su seguro actual y quiere cambiarse |

Las fichas antiguas sin `tipo` se clasifican como `cambio` si `situacion === "Tiene seguro y quiere cambiarse"`, y como `nuevo` en otro caso.

## 3. Pantallas

1. **Tablero (inicio)**: encabezado de jugador (nivel, barra de XP, prospectos, cierres, tasa de cierre), menú "Elige tu misión" con dos botones grandes (uno por tipo, con conteo de fichas), insignias, filtros por tipo y por etapa, lista de prospectos, exportar CSV.
2. **Ficha** (pantalla completa, 4 misiones con barra de progreso y XP): datos, descubrimiento, presentación, seguimiento y cierre. Barra superior fija con volver, nombre, XP y anillo de avance.
3. **Panel de análisis** (al final de la ficha, botón "Analizar ficha").

Orden de la lista: primero por fecha de próximo contacto (la más cercana arriba; vencidas en rojo), luego por creación descendente.

## 4. Modelo de datos

Un `Prospecto` es un objeto plano: `id`, `creado` (ms), `mod` (ms, última edición), `tipo`, `etapa`, `contactos` (0-5), `rec` (mapa id→bool de recordatorios marcados), `analisis` (`{ts, ia}` o ausente), `personas`, `pre` y `preIA` (declaración de preexistencias, ver más abajo) y los campos de las tablas siguientes (la clave es el nombre del campo).

Etapas: Nuevo, Descubrimiento, Presentado, Objeción, Seguimiento, Cerrado, Perdido.

### Campos
Los checks de la misión 3 son booleanos. `contactos` es un contador de 0 a 5. La etapa no suma XP ni cuenta en el avance.

**Misión 1 · Datos del prospecto** (`datos`)

| Clave | Etiqueta | Tipo | Opciones | XP | Aplica a |
|---|---|---|---|---|---|
| `nombre` | Nombre | text |  | 10 | Ambos |
| `whatsapp` | WhatsApp | tel |  | 10 | Ambos |
| `edad` | Edad (años) | number | (se escribe a mano) | 5 | Ambos |
| `origen` | ¿De dónde llegó? | select | Referido / Redes sociales / Contacto en frío / Evento / Otro | 5 | Ambos |
| `depende` | ¿Quién depende de esta persona? | text |  | 10 | Ambos |

**Misión 2 · Descubrimiento** (`desc`)

| Clave | Etiqueta | Tipo | Opciones | XP | Aplica a |
|---|---|---|---|---|---|
| `cobertura` | ¿Qué cobertura tiene hoy, si alguna? | text |  | 10 | Nuevo prospecto |
| `porque` | ¿Qué lo hizo pensar en contratar ahora? | text |  | 15 | Nuevo prospecto |
| `aseguradora` | Aseguradora actual | text |  | 10 | Persona asegurada |
| `tiempoCon` | ¿Cuánto tiempo lleva con ella? | text |  | 5 | Persona asegurada |
| `primaActual` | Lo que paga hoy (USD al mes) | number |  | 10 | Persona asegurada |
| `motivos` | Motivos de inconformidad | motivos |  | 10 | Persona asegurada |
| `cob_que` | ¿Qué le faltó o no le cubrieron? | select | Una cirugía o procedimiento / Medicamentos / Maternidad o pediatría / Exámenes y diagnóstico por imagen / Tratamiento crónico / Otro | 5 | Persona asegurada, si eligió «Cobertura» |
| `cob_porque` | ¿Por qué no se lo cubrieron? | select | Exclusión de la póliza / Preexistencia / Período de carencia / Tope o límite agotado / Nunca supo si estaba cubierto / Otro | 10 | Persona asegurada, si eligió «Cobertura» |
| `cob_monto` | ¿Cuánto pagó de su bolsillo? (USD) | number |  | 5 | Persona asegurada, si eligió «Cobertura» |
| `cob_pendiente` | ¿Tiene un procedimiento o tratamiento pendiente? | select | No / Sí | 10 | Persona asegurada, si eligió «Cobertura» |
| `reem_dias` | ¿Cuánto tarda en recibir un reembolso? | select | Menos de 15 días / 15 a 30 días / 30 a 60 días / Más de 60 días | 5 | Persona asegurada, si eligió «Reembolsos» |
| `reem_rech` | ¿Le han rechazado reembolsos? | select | Nunca / A veces / Seguido | 5 | Persona asegurada, si eligió «Reembolsos» |
| `reem_porque` | ¿Por qué suelen rechazarlos o demorarlos? | select | Falta de documentos / Exclusión o no cobertura / Monto menor al esperado / Sin explicación clara / No sabe | 10 | Persona asegurada, si eligió «Reembolsos» |
| `reem_proceso` | ¿Conoce el proceso y qué documentos pedir? | select | Sí / Más o menos / No | 5 | Persona asegurada, si eligió «Reembolsos» |
| `pre_alza` | Alza en su última renovación (%) | number |  | 5 | Persona asegurada, si eligió «Precio o alzas» |
| `pre_freq` | ¿Con qué frecuencia sube? | select | Cada año / Solo al cambiar de rango de edad / De forma imprevista / No sabe | 5 | Persona asegurada, si eligió «Precio o alzas» |
| `pre_expl` | ¿Le explicaron por qué sube? | select | Sí / Parcialmente / No | 10 | Persona asegurada, si eligió «Precio o alzas» |
| `pre_limite` | Máximo que podría pagar al mes (USD) | number |  | 10 | Persona asegurada, si eligió «Precio o alzas» |
| `ded_monto` | Deducible que paga por evento (USD) | number |  | 5 | Persona asegurada, si eligió «Deducibles y copagos» |
| `ded_copago` | Copago (porcentaje o monto) | text |  | 5 | Persona asegurada, si eligió «Deducibles y copagos» |
| `ded_sorpresa` | ¿Sabía de deducibles y copagos al contratar? | select | Sí / No / No recuerda | 10 | Persona asegurada, si eligió «Deducibles y copagos» |
| `ded_tope` | ¿Se le han agotado topes anuales o por evento? | select | Nunca / Una vez / Varias veces | 5 | Persona asegurada, si eligió «Deducibles y copagos» |
| `ded_anual` | Pagado en deducibles y copagos el último año (USD) | number |  | 10 | Persona asegurada, si eligió «Deducibles y copagos» |
| `red_falta` | Médicos, clínicas o especialidades que no encuentra | text |  | 10 | Persona asegurada, si eligió «Red de médicos y clínicas» |
| `red_medico` | ¿Tiene un médico o clínica de confianza que no quiere dejar? | select | Sí / No | 10 | Persona asegurada, si eligió «Red de médicos y clínicas» |
| `red_fuera` | ¿Ha tenido que pagar fuera de la red? | select | Nunca / A veces / Seguido | 5 | Persona asegurada, si eligió «Red de médicos y clínicas» |
| `ate_canal` | ¿Dónde falla la atención? | select | Autorizaciones / Línea de atención / Emergencias / Su asesor / Trámites administrativos / Otro | 10 | Persona asegurada, si eligió «Atención y servicio» |
| `ate_frec` | ¿Con qué frecuencia? | select | Una vez / A veces / Siempre | 5 | Persona asegurada, si eligió «Atención y servicio» |
| `ate_asesor` | ¿Su asesor actual lo acompaña? | select | Sí, me acompaña / Responde poco / No tengo uno | 10 | Persona asegurada, si eligió «Atención y servicio» |
| `ate_ejemplo` | Último caso concreto | text |  | 5 | Persona asegurada, si eligió «Atención y servicio» |
| `otro_desc` | Descríbelo con sus palabras | text |  | 10 | Persona asegurada, si eligió «Otro» |
| `grieta` | ¿Qué le falla, con sus palabras? | text |  | 15 | Persona asegurada |
| `renovacion` | Fecha de renovación o vencimiento de su póliza | date |  | 10 | Persona asegurada |
| `exclus` | Exclusiones, carencias y preexistencias de su póliza actual | textarea |  | 15 | Persona asegurada |
| `criterio` | ¿Con qué criterio piensa elegir su seguro? | select | Precio / Cobertura / Red de médicos / Recomendación / Aún no sabe | 10 | Nuevo prospecto |
| `contrato` | ¿Cómo lo eligió cuando lo contrató? | select | Por precio / Por recomendación de un asesor / Por su empresa / Por cobertura, comparando opciones / No recuerda | 10 | Persona asegurada |
| `uso` | ¿Cómo lo ha usado? | select | Casi no lo usa / Lo usa seguido y le responde / Lo usa seguido y le falla / Lo usó en un evento grande | 10 | Persona asegurada |
| `conoce` | ¿Conoce su cobertura y su proceso de reembolso? | select | Sí / Más o menos / No | 10 | Persona asegurada |
| `declaro` | ¿Declaró sus condiciones médicas al contratar? | select | Sí / No estoy seguro / No | 10 | Persona asegurada |
| `noPerder` | ¿Qué no querría perder si cambia? | text |  | 15 | Persona asegurada |
| `ultimavez` | ¿Qué pasó la última vez que usó un médico? | text |  | 10 | Ambos |
| `emergencia` | ¿Qué haría si mañana hay una cirugía o emergencia? | text |  | 15 | Ambos |
| `costoEvento` | Si hoy hubiera una hospitalización o cirugía, ¿cuánto estima que costaría y quién lo pagaría? | text |  | 15 | Ambos |
| `objecion` | Objeción principal | select | Ninguna / Precio / Ya tengo seguro / Lo tengo que pensar / Perder antigüedad o carencias / Otra | 10 | Ambos |

**Misión 3 · Declaración de preexistencias** (`pre`)

| Clave | Etiqueta | Tipo | Opciones | XP | Aplica a |
|---|---|---|---|---|---|

**Misión 4 · Presentación** (`pres`)

| Clave | Etiqueta | Tipo | Opciones | XP | Aplica a |
|---|---|---|---|---|---|
| `c_permiso` | Abrí pidiendo permiso y marcando el rumbo | check |  | 10 | Ambos |
| `c_desc` | El cliente dijo su problema con sus palabras | check |  | 10 | Ambos |
| `c_amarre` | Resumí y obtuve micro-acuerdos (“¿cierto?”) | check |  | 10 | Ambos |
| `c_valor` | Presenté el plan como respuesta a lo que dijo | check |  | 15 | Ambos |
| `c_ancla` | Mostré el costo de no tenerlo antes del precio | check |  | 10 | Ambos |
| `c_riesgo` | Nombré garantías y exclusiones que sí puedo sostener | check |  | 10 | Ambos |
| `c_cierre` | Cerré con alternativa (individual o familiar) | check |  | 15 | Ambos |
| `cambio1` | Revisé exclusiones, preexistencias y carencias de su póliza actual | check |  | 10 | Persona asegurada |
| `cambio2` | Acordamos no cancelar la actual hasta que la nueva esté vigente | check |  | 10 | Persona asegurada |
| `cambio3` | Validé con SaludSA cómo se tratan preexistencias y antigüedad | check |  | 10 | Persona asegurada |
| `gana` | ¿Qué gana frente a su póliza actual? | text |  | 15 | Persona asegurada |
| `plan` | Plan propuesto | select | Individual / Familiar / Otro | 5 | Ambos |
| `precio` | Precio mensual (USD) | number |  | 5 | Ambos |

**Misión 5 · Seguimiento y cierre** (`seg`)

| Clave | Etiqueta | Tipo | Opciones | XP | Aplica a |
|---|---|---|---|---|---|
| `etapa` | Etapa | select | Nuevo / Descubrimiento / Presentado / Objeción / Seguimiento / Cerrado / Perdido | — | Ambos |
| `contactos` | Contactos realizados (mínimo 5 antes de dar por perdido) | contactos |  | 10 por contacto (máx. 5) | Ambos |
| `prox` | Próximo contacto | date |  | 10 | Ambos |
| `proxTxt` | ¿Qué le aportas en ese contacto? | text |  | 10 | Ambos |
| `notas` | Notas | textarea |  | 5 | Ambos |

### Campos condicionales por motivo de inconformidad (solo `cambio`)
El campo `motivos` es una **selección múltiple** (chips): cobertura, reembolsos, precio o alzas, deducibles y copagos, red de médicos y clínicas, atención y servicio, otro. **Cada motivo elegido despliega solo sus campos de detalle** (en un bloque con su nombre). Reglas:
- Un campo condicional está **activo** solo si su motivo está elegido. Los campos inactivos **no cuentan** para el avance ni el XP, **no se envían a la IA** y salen **en blanco** en el CSV.
- Al quitar un motivo, **no se borran los datos ya escritos**: si se vuelve a marcar, reaparecen.
- Compatibilidad: las fichas antiguas con `motivoTipo` (Alza de tarifa, Reembolsos lentos, Red limitada, Mala atención, Otro) se convierten a `motivos` al leerlas.
- Estos detalles **alimentan el informe**: lo que quiere evitar, el costo de oportunidad (p. ej. lo pagado en deducibles y copagos el último año, el monto de bolsillo por algo no cubierto, la última alza), las señales para no cambiar (p. ej. procedimiento pendiente; propuesta por encima del máximo que puede pagar), el comparativo (una fila por motivo), los recordatorios y el **diagnóstico producto / uso / contratación** (p. ej. deducibles que no conocía → contratación; reembolsos rechazados por documentos o por no conocer el proceso → uso; red, atención y alzas → producto). Ver `diagLocal`, `analisisLocal` y `comparativo` en el prototipo.

### Declaración de preexistencias (solo `nuevo`): escáner del cuerpo
Misión 3 de la ficha del nuevo prospecto. Es un componente propio (no una lista de campos). Sirve para **levantar, persona por persona, los antecedentes médicos antes de cotizar**, recorriendo el cuerpo de cabeza a pies.

**Flujo**
1. **¿Cuántas personas se van a asegurar?** (selector de 1 a 10). La declaración se despliega **una vez por persona**; la primera es el titular (la persona de la ficha). Cada persona tiene edad y sexo (el sexo solo decide qué grupos se ven en Pelvis y Mamas; si no se indica, se ven todos), y las demás también rol y nombre. Reducir el número pide confirmación con un segundo toque si la persona ya tenía respuesta o datos.
2. **Por persona, una pregunta de entrada:** "¿Tiene alguna condición médica previa que declarar?" con **No, ninguna** / **Sí, declarar**.
   - **No** → la persona queda como **sin preexistencias ✓** (cuenta como completa, +10 XP, sin bonus de escaneo), no se abre el mapa y **la app salta a la siguiente persona sin responder**; cuando todas están respondidas avisa "Declaración completa ✓" y baja a la misión siguiente (Presentación). "No" se bloquea si la persona ya tiene condiciones declaradas.
   - **Sí** → se abre el escáner de esa persona. Al terminar, o con **"El resto sin antecedentes"** (confirmación en dos toques, disponible cuando ya declaró algo y quedan zonas pendientes), salta a la siguiente persona.
3. Los chips de persona muestran su estado: ○ sin responder, … escaneando, N cond. con condiciones, ✓ completa o sin preexistencias.

**Interfaz del escáner**
- **Mapa tipo escáner:** silueta del cuerpo en un panel oscuro con cuadrícula, una pasada de línea de escaneo al cargar (respetar `prefers-reduced-motion`) y 16 zonas táctiles, más una tira para la columna y un marco para "Todo el cuerpo". Cada zona tiene estado: **sin revisar** (punteado), **sin antecedentes** (verde) y **con antecedentes** (coral). Los mismos 16 botones existen como chips y cada zona del mapa es enfocable con teclado (Enter o Espacio). **El mapa nunca es la única vía**.
- **Panel de zona:** checklist de condiciones por grupos. Al marcar una condición se despliega **Año**, **Estado** (En tratamiento / En estudio / Controlado / Resuelto) y **Tratamiento o medicación**. Campo libre "otra condición en esta zona". Botones "Sin antecedentes en esta zona" (confirma la zona limpia y salta a la siguiente pendiente), Anterior y Siguiente.
- **Resumen** por persona: conteos, condiciones declaradas con año y estado, y atajos a las zonas que faltan por revisar.
- Interruptor **"Incluir las preexistencias en el análisis con IA"** (apagado por defecto; se envían sin nombres).

**Modelo de datos:** `personas: [{id, rol, nombre, edad, sexo}]` (la primera, `id:"t"`, es el titular), `preSN[personaId]` (`"no"` o `"si"`) y `pre[personaId][zonaId] = { ok: bool, it: { condicionId: {a: año, e: estado, t: tratamiento} }, otra: texto }`. Estado de una zona: `hit` si tiene condiciones u "otra", `clear` si `ok` y nada marcado, `pend` en otro caso. Marcar una condición apaga `ok`.

**Gamificación:** por persona escaneada, 4 XP por zona revisada, 2 XP por condición documentada y 30 XP de bonus por escaneo completo; por persona que responde "No", 10 XP. El avance de la misión es zonas revisadas / zonas totales (una persona con "No" cuenta como completa). Insignia "Escaneo de cuerpo completo" (solo por escaneos reales, no por responder "No").

**Conexión con el informe:** recordatorios ("Preexistencias declaradas (N)", "Condiciones en tratamiento o en estudio"), "Información que falta" (zonas pendientes), "Lo que quiere evitar" y el veredicto (si era "viable" pasa a "Viable, con preexistencias por validar"). **La app no decide cobertura, exclusión ni carencia: eso lo define SaludSA.** El prompt de la IA prohíbe diagnosticar, dar consejo médico o afirmar que algo quedará cubierto o excluido. El CSV agrega la columna "Preexistencias declaradas".

**Datos sensibles:** son datos de salud de terceros (incluidos menores). Ver sección 10: consentimiento, cifrado, acceso restringido, exportar y eliminar, y revisión legal antes de usarlo con clientes reales. El listado de condiciones es una **propuesta editable** (idealmente reemplazable por el formulario oficial de declaración de SaludSA cuando se tenga); debe vivir en un archivo de datos separado de la interfaz.

**Zonas y condiciones del prototipo**

| # | Zona (`id`) | Grupos y condiciones |
|---|---|---|
| 1 | 🧠 Cabeza y mente (`cabeza`) | **Neurológico:** Migrañas o dolores de cabeza crónicos; Epilepsia o convulsiones; Traumatismo craneoencefálico; Derrame o accidente cerebrovascular (ACV); Tumor o quiste cerebral; Parkinson, Alzheimer u otra demencia; Esclerosis múltiple u otra enfermedad desmielinizante; Aneurisma o malformación vascular cerebral; Mareos o vértigo crónico · **Salud mental:** Depresión; Ansiedad o ataques de pánico; Trastorno bipolar; Esquizofrenia u otro trastorno psicótico; TDAH; Autismo (TEA) u otro trastorno del neurodesarrollo; Trastorno de la conducta alimentaria; Consumo problemático de alcohol o sustancias; Insomnio crónico |
| 2 | 👁️ Ojos, oídos, nariz y boca (`ojos_orl`) | **Ojos:** Miopía, astigmatismo o hipermetropía altas; Cataratas; Glaucoma; Desprendimiento o enfermedad de retina; Queratocono; Estrabismo; Cirugía refractiva (láser) · **Oídos:** Pérdida de audición; Otitis recurrente; Zumbidos (tinnitus); Cirugía de oído o tubos de ventilación · **Nariz y garganta:** Sinusitis crónica o pólipos; Desviación de tabique o cirugía nasal; Rinitis alérgica; Amigdalitis recurrente; Problemas de cuerdas vocales · **Boca y dientes:** Caries o tratamientos dentales extensos; Enfermedad de encías; Ortodoncia en curso; Problemas de mandíbula (ATM); Cirugía de muelas del juicio |
| 3 | 🦋 Cuello y tiroides (`cuello`) | Hipotiroidismo; Hipertiroidismo; Nódulos o bocio; Cáncer de tiroides; Hernia discal o dolor cervical crónico; Ganglios inflamados recurrentes; Enfermedad de paratiroides |
| 4 | 🫁 Pulmones (`pulmones`) | Asma; EPOC o enfisema; Bronquitis crónica; Neumonías recurrentes; Tuberculosis (actual o previa); Fibrosis pulmonar; Bronquiectasias; Apnea del sueño; Neumotórax previo; Secuelas de COVID-19; Cáncer de pulmón |
| 5 | 🫀 Corazón y circulación (`corazon`) | Hipertensión arterial; Arritmias o palpitaciones; Infarto o enfermedad coronaria; Insuficiencia cardíaca; Soplo o enfermedad de válvulas; Cardiopatía congénita; Marcapasos, stent o cirugía cardíaca; Miocardiopatía; Aneurisma de aorta |
| 6 | 🎀 Mamas (`mamas`) | Nódulos, quistes o fibroadenomas; Cáncer de mama; Mastectomía o biopsia; Implantes o cirugía estética de mamas; Mastitis recurrente · **Hombres (solo según sexo):** Ginecomastia |
| 7 | 🍽️ Estómago, hígado y vesícula (`abd_sup`) | Gastritis o úlcera; Reflujo (ERGE); Infección por H. pylori; Hernia hiatal; Cálculos de vesícula o colecistectomía; Hígado graso; Hepatitis (A, B o C); Cirrosis; Pancreatitis; Cirugía bariátrica; Cáncer de estómago, hígado o páncreas |
| 8 | 💧 Riñones y vías urinarias (`renal`) | Cálculos renales (piedras); Infecciones urinarias recurrentes; Insuficiencia renal o diálisis; Quistes renales; Reflujo vesicoureteral; Incontinencia urinaria; Sangre en la orina con estudio pendiente; Cáncer de riñón o vejiga; Trasplante renal |
| 9 | 🌀 Intestinos y abdomen (`abd_inf`) | Colon irritable; Colitis o enfermedad de Crohn; Divertículos; Apendicitis (apendicectomía); Hernias (inguinal, umbilical, etc.); Hemorroides o fisuras; Enfermedad celíaca; Pólipos de colon; Estreñimiento crónico severo; Cáncer colorrectal |
| 10 | ⚕️ Pelvis y aparato reproductor (`pelvis`) | **Mujeres (solo según sexo):** Endometriosis; Quistes de ovario o síndrome de ovario poliquístico; Miomas; Cesáreas o partos complicados; VPH o displasia cervical; Cáncer de útero, cuello uterino u ovario; Embarazo actual; Histerectomía o ligadura de trompas; Trastornos hormonales o menopausia · **Hombres (solo según sexo):** Próstata agrandada o prostatitis; Varicocele; Cáncer de próstata o testículo; Fimosis o circuncisión; Vasectomía · **Ambos:** Infertilidad; Infecciones de transmisión sexual; Disfunción sexual |
| 11 | 🦴 Columna y espalda (`columna`) | Hernia discal (lumbar o dorsal); Escoliosis; Dolor lumbar crónico; Cifosis; Artrosis o espondilitis; Fractura vertebral; Cirugía de columna; Estenosis de canal |
| 12 | 💪 Hombros, brazos y manos (`brazos`) | Lesión de hombro (manguito, luxación); Tendinitis o epicondilitis (codo); Síndrome del túnel carpiano; Fracturas de brazo, muñeca o mano; Artritis o artrosis en manos; Amputación o malformación |
| 13 | 🔩 Caderas (`caderas`) | Artrosis de cadera; Displasia de cadera; Prótesis de cadera; Fractura de cadera o pelvis; Bursitis o tendinitis de cadera |
| 14 | 🦵 Rodillas y piernas (`piernas`) | Lesión de ligamentos o menisco; Artrosis de rodilla; Prótesis de rodilla; Várices o insuficiencia venosa; Trombosis venosa profunda; Fracturas de pierna; Tendinitis; Úlceras en las piernas |
| 15 | 🦶 Tobillos y pies (`pies`) | Esguinces recurrentes; Fascitis plantar o espolón; Juanetes; Pie plano o cavo; Pie diabético o úlceras; Fracturas de tobillo o pie; Gota; Lesión del tendón de Aquiles |
| 16 | 🧬 Todo el cuerpo (`sistemico`) | **Metabólico y endocrino:** Diabetes; Colesterol o triglicéridos altos; Obesidad; Osteoporosis; Otro trastorno hormonal · **Cáncer y sangre:** Cáncer en cualquier localización (actual o previo); Trastornos de la sangre (anemia, hemofilia, etc.); Trombofilia o uso de anticoagulantes · **Inmunidad e infecciones:** Enfermedad autoinmune (lupus, artritis reumatoide, etc.); Alergias severas o anafilaxia; Infecciones crónicas (hepatitis, VIH, tuberculosis) · **Piel:** Psoriasis o dermatitis crónica; Lunares o lesiones en seguimiento; Cáncer de piel · **General:** Cirugías previas no mencionadas; Hospitalizaciones en los últimos 5 años; Medicación de uso permanente; Discapacidad o secuelas |


---

## 5. Gamificación

- **XP de una ficha** = suma de la columna XP de cada campo lleno (los que aplican al tipo) + **100 si la etapa es Cerrado**.
- **Avance de una ficha** = promedio del avance de las 4 misiones (campos llenos / campos aplicables; `contactos` cuenta como lleno con 5).
- **Nivel** según el XP total de todas las fichas: Aprendiz 0 · Explorador 150 · Cazador 500 · Estratega 1200 · Leyenda 2500.
- **Insignias**: Primer cierre · Cierre de nuevo afiliado · Cierre de cambio de seguro · 5 contactos en un prospecto · Presentación completa (los 7 checks base) · 10 prospectos.
- **Tasa de cierre** = cierres / total de prospectos.
- Los pesos de XP, los niveles y las etapas son **propuestas**, no datos de SaludSA: déjalos en un archivo de configuración fácil de ajustar.

## 6. Lógica del análisis

### 6.1 Análisis local (determinista, sin IA, siempre disponible)
Implementarlo como **funciones puras con pruebas unitarias** (es el núcleo del valor de la app).

- **Información que falta**: campos clave vacíos según el tipo.
- **Lo que busca / lo que quiere evitar**: se arma con lo que escribió la persona (por qué contrata, dependientes, su respuesta ante una emergencia, su "grieta") y mapas fijos: motivo de inconformidad → qué evita (alza de tarifa → "alzas de prima sin explicación ni control", etc.); objeción → qué evita.
- **No olvides considerar** (checklist marcable, guardado en `rec`):
  - Siempre: preexistencias, carencias y tiempos de espera, exclusiones y límites, tarifa por edad y reajustes, red de prestadores, reembolsos y atención.
  - `cambio`: beneficios de continuidad (antigüedad y carencias ya cumplidas), sin hueco de cobertura (no cancelar la póliza actual hasta que la nueva esté aprobada y vigente), tratamientos en curso, comparativo lado a lado, declaración de condiciones (si no declaró o no está seguro).
  - `nuevo`: inicio de vigencia.
  - Condicionales: edad 56+, hay dependientes, objeción de precio, objeción de perder antigüedad, menciona IESS, días a la renovación (vencida / ≤45 días / margen).
- **Diagnóstico de causa (solo `cambio`)**: puntaje con señales para distinguir **producto** (coberturas, tarifa, red, servicio), **uso** (casi no lo usa, no conoce su cobertura o su reembolso) o **contratación** (lo eligió por precio, no recuerda, lo recibió de la empresa, no sabe qué declaró). Resultado: producto / uso / contratación / mixta / indeterminada, con las señales que lo justifican. Ver `diagLocal` en el prototipo.
- **Veredicto** (recomendación sincera): `viable` ✅ · `condiciones` ⚠️ · `no_recomendable` ⛔ ("Aún no conviene") · `falta_informacion` ❔.
  - `cambio`: menos de 4 datos → falta información; causa uso o contratación sin señales de producto → **no recomendable cambiar aún**; causa mixta → corregir lo que no es del producto antes de cambiar; causa producto → viable con condiciones (continuidad y preexistencias confirmadas por escrito).
  - `nuevo`: menos de 3 datos → falta información; criterio "Precio" → viable con condiciones (elegir por cobertura); en otro caso viable, sin postergar.
- **Costo de oportunidad**: textos distintos por tipo. Incluye la diferencia de prima calculada (mensual y anual) cuando hay prima actual y precio propuesto, y la estimación propia de la persona sobre el costo de un evento grave. **Nunca inventar cifras.**
- **Señales para no cambiar** (solo `cambio`): cuatro condiciones fijas (ver prototipo).
- **Comparativo hoy vs propuesta** (solo `cambio`): prima, plan, lo que le falla y cómo lo resuelve, exclusiones/carencias/preexistencias, antigüedad y continuidad, red y reembolsos, vigencia. Las celdas que dependen de SaludSA dicen "validar".
- **Copiar resumen**: exporta todo el análisis como texto.

### 6.2 Análisis con IA (opcional, suma a lo local)
- Usa la **API de Claude**. **La llave de API jamás va en el frontend**: crea una función en servidor (serverless o backend propio) que reciba la ficha y llame a la API.
- **Privacidad**: enviar la ficha **sin `nombre` ni `whatsapp`**. No enviar nada más que identifique a la persona.
- Mínimo 3 datos llenos para activarlo.
- La respuesta debe ser **JSON** con esta forma (validar y limpiar en el servidor, máx. 5 ítems por lista):
  `{ veredicto:{nivel,titulo,razon}, causa:{tipo,explicacion}, costo_oportunidad:[], no_cambiar_si:[], busca:[], evita:[], puntos:[], preguntas:[] }`
- El prompt de sistema está en `analizar()` del prototipo: es sincero, puede recomendar no cambiar o no contratar todavía, no inventa datos, cifras ni condiciones de SaludSA y marca "validar con SaludSA" lo que dependa de la aseguradora. **Conservarlo casi literal.**
- Si falla o no está disponible, la app muestra el análisis local con un aviso; nunca se queda en blanco.
- Antes de fijar el modelo, consulta en la documentación de Anthropic cuál es el modelo vigente adecuado y su ID.

---

## 7. Diseño

- **Mobile-first** (el uso real es en celular, una mano). Áreas táctiles de 44 px o más. Funciona bien hasta 360 px de ancho y escala a escritorio con `max-width` de unos 720 px.
- **Tipografía**: Sora (títulos, números, botones) y Plus Jakarta Sans (texto). Cargar con fuentes locales o `font-display: swap`.
- **Paleta** (tokens, con modo claro y oscuro automático): fondo `#F1F3FB`, tarjeta `#FFFFFF`, tinta `#1B1F45`, violeta `#5B3DF5`, coral `#FF6B57`, menta `#12B886`, sol `#FFB020`. Ver las variables CSS del prototipo para el modo oscuro.
- **Estética gamificada**: anillos de progreso por ficha, barra de XP, insignias, botones con "profundidad", avisos breves al ganar XP. Movimiento solo como respuesta a una acción y respetando `prefers-reduced-motion`.
- Accesibilidad: foco visible, etiquetas en todos los campos, contraste suficiente, nada que dependa solo del color.

## 8. Stack sugerido (puedes proponer otro, explicando por qué)

- **Vite + React + TypeScript**, instalable como **PWA** (funciona sin conexión, se agrega a la pantalla de inicio).
- **Local-first**: IndexedDB (p. ej. Dexie) como fuente de verdad en el dispositivo.
- **Sincronización opcional** entre dispositivos con un backend gestionado (p. ej. Supabase o Firebase) con autenticación y **acceso solo a los datos propios** (cada usuario ve únicamente sus fichas).
- **Sincronización con "gana la edición más reciente"** por ficha, usando el campo `mod`.
- **Función en servidor** para el análisis con IA (sección 6.2).
- Pruebas unitarias (Vitest) para XP, niveles, avance, análisis local y el diagnóstico. Una prueba de extremo a extremo para el flujo crear ficha → llenar → analizar → guardar → reabrir.

## 9. Lecciones del prototipo (errores ya encontrados, no repetir)

1. **No usar `window.confirm` ni diálogos nativos**: se bloquearon en el entorno publicado y el botón Eliminar no hacía nada. La confirmación va dentro de la interfaz (en el prototipo: dos toques, con vencimiento de 4 s).
2. **Condición de carrera al sincronizar**: al tocar "Guardar y volver", una copia remota más antigua llegó y **pisó los cambios** recién hechos. Solución: `mod` en cada ficha, resolver por "la más reciente gana", no pisar una ficha con escritura pendiente, **escribir de inmediato** al guardar y al salir de la ficha, y escribir lo pendiente cuando la página se oculta.
3. Al borrar, recordar el `id` eliminado para que un eco del servidor no lo reviva.

## 10. Privacidad y cumplimiento

La app guarda datos personales de terceros (nombre, teléfono) y puede guardar información relacionada con su salud (preexistencias, tratamientos, eventos médicos).
- Pedir o registrar el consentimiento del prospecto antes de guardar sus datos, y minimizar lo que se guarda.
- Cifrado en tránsito y en reposo, acceso solo del propietario, y funciones de **exportar y eliminar** todo.
- Ecuador tiene una ley de protección de datos personales (LOPDP). **Verificar con asesoría legal** qué obligaciones aplican antes de usar la app con clientes reales; también confirmar qué permite o exige SaludSA sobre el manejo de datos de prospectos fuera de sus sistemas.

## 11. Fuera de alcance (v1)

Cotizador automático, tarifas de SaludSA dentro de la app, integración con los sistemas de SaludSA, envío automático de mensajes a clientes. Mensaje para WhatsApp con el resumen de la propuesta: idea para una versión posterior.

## 12. Plan de trabajo por fases

1. **Fase 0 · Entender**: lee este archivo, `docs/` y el prototipo. Devuelve un plan corto y tus preguntas antes de codificar.
2. **Fase 1 · Núcleo**: proyecto, tokens de diseño, modelo de datos, y la lógica pura (XP, niveles, avance, análisis local, diagnóstico) **con pruebas**.
3. **Fase 2 · Interfaz**: tablero, menú, ficha con las 4 misiones, panel de análisis, filtros, exportar CSV. Paridad con el prototipo.
4. **Fase 3 · PWA y local-first**: instalación, modo sin conexión, IndexedDB.
5. **Fase 4 · Nube e IA**: autenticación, sincronización, función de análisis con IA.
6. **Fase 5 · Pulido**: accesibilidad, rendimiento, revisión de privacidad.

## 13. Criterios de aceptación

- Todo lo que hace el prototipo funciona igual o mejor.
- Guardar, volver, reabrir y cambiar de dispositivo nunca pierde ni revierte una edición.
- Eliminar pide confirmación dentro de la interfaz y no revive la ficha.
- Con la IA apagada o caída, el análisis local sigue funcionando.
- Ninguna afirmación sobre SaludSA aparece como hecho si no viene de material oficial.
- La lógica pura tiene pruebas y pasan.

## 14. Primer mensaje sugerido para Claude Code

> Lee `CLAUDE.md`, la carpeta `docs/` y `prototipo/ficha-prospectos-saludsa.html`. Haz la Fase 0: dime en una página qué entendiste, qué stack propones y qué preguntas tienes. No escribas código todavía.
