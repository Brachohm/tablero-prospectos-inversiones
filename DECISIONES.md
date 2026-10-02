# Decisiones del proyecto

Registro de lo decidido después de la Fase 0. Cuando difiera de `CLAUDE.md` o del prototipo, manda este archivo.

## Confirmadas por Bracho

| Tema | Decisión |
|---|---|
| Edad | Se escribe a mano, en años (`edad`, número 0-120). Ya no es un rango. Los recordatorios de "edad mayor" aplican desde `EDAD_MAYOR` (56, en `src/config/ficha.ts`). La edad del titular en la declaración de preexistencias sale de este mismo campo. |
| Repositorio | Nuevo y privado, separado del Master Brain. |
| Datos | Se empieza limpio: no hay fichas reales que migrar, así que no se implementa la compatibilidad con fichas antiguas (`situacion`, `motivoTipo`). |
| Consentimiento | Casilla obligatoria con fecha (`consentimiento: { ts }`). Sin consentimiento, la ficha no guarda datos personales ni de salud. El CSV incluye la fecha del consentimiento. |
| Usuarios | Solo Bracho, uso personal. No hay multiusuario. |
| Dispositivos | Celular y computadora, **cada uno con sus propias fichas**. |
| Uso local | **Sin nube, sin cuentas y sin servidor.** Las fichas viven solo en cada dispositivo. Se pasan de uno a otro con la copia de seguridad ("Enviar a mi otro dispositivo" abre el menú de compartir del celular; "Restaurar copia" junta las fichas y de cada una queda la versión más reciente). |
| Análisis con IA | **Quitado.** Sin servidor, la llave de la API quedaría dentro de la app. Queda el análisis local (recomendación sincera, causa, costo de oportunidad, comparativo, recordatorios), que funciona sin conexión. |
| Publicación | La app compilada (sin datos ni documentos) se publica como página estática en un repo **público** aparte, con GitHub Pages, para poder instalarla en el celular. Ver `PUBLICAR.md`. |
| CRM | La app también es el CRM personal: **historial de contactos** (fecha, canal y nota; reemplaza el contador de 0 a 5, que ahora se calcula del historial), **agenda del día** (vencidos, hoy, esta semana y renovaciones próximas) y **cartera de clientes** (las fichas en "Cerrado": inicio de vigencia, renovación escrita o estimada a un año, checklist de posventa y referidos). La configuración está en `src/config/crm.ts`. El historial no se envía a la IA (solo el número de contactos). |

## Tomadas por defecto (se pueden revertir)

| Tema | Prototipo | Ahora | Por qué |
|---|---|---|---|
| IA y análisis local | Las listas de la IA reemplazaban a las locales, aunque vinieran vacías. | La IA **suma**: se muestra lo local y se agrega lo de la IA sin duplicados. Veredicto y causa: si la IA los trae, se usan los suyos. | El brief dice "suma a lo local"; lo local tiene las cifras calculadas. |
| Máximo de ítems de la IA | 6 | 5 | Lo que dice el brief y el propio prompt. |
| Análisis desactualizado | Solo un aviso fijo. | Se guarda una firma de los datos enviados; si la ficha cambia, el análisis se marca como desactualizado. | Evita decidir con un análisis viejo. |
| Contacto vencido | Fecha de hoy o pasada, salvo Cerrado o Perdido. | Igual. | Sin respuesta; se conserva. |
| Nombres de servicios de SaludSA | "DrSalud" y "HomeService" fijos en el texto. | En `src/config/saludsa.ts` y el texto dice "validar con SaludSA qué incluye su plan". | Criterio de aceptación: nada de SaludSA como hecho sin material oficial. |
| Detalles de motivos no elegidos | Algunos seguían contando en el diagnóstico y el costo de oportunidad (p. ej. `ate_asesor`, `cob_pendiente`, `ded_anual`). | Un detalle solo cuenta si su motivo está elegido. | Regla del brief: los campos inactivos no cuentan. |
| Datos mínimos para opinar | La etapa (siempre llena) contaba como un dato. | La etapa no cuenta. | No es un dato recabado del cliente. |
| Borrados entre dispositivos | Se recordaban solo en memoria. | La fusión también descarta una ficha que ya existió en el servidor y desapareció (borrada en otro dispositivo), salvo que tenga cambios locales pendientes. En la Fase 4 se usarán lápidas en la base. | Criterio de aceptación: eliminar no revive la ficha. |

## Fase 2 · Interfaz

| Tema | Decisión |
|---|---|
| Ficha nueva | Vive solo en memoria hasta marcar el consentimiento; si sales antes, no queda nada guardado. El consentimiento no se puede desmarcar: si la persona lo retira, se elimina la ficha. |
| Navegación | Rutas por `#` para que el botón "atrás" del celular funcione (`#/`, `#/clientes`, `#/ficha/:id`, `#/nueva/:tipo`). |
| Clientes | Las fichas en "Cerrado" salen de la lista de prospectos y pasan a la pestaña Clientes. |
| Referidos | Desde un cliente se crea la ficha del referido (contratar o cambiarse), con "¿De dónde llegó?" = Referido y enlazada al cliente. |
| Análisis | El botón "Analizar ficha" muestra el análisis local. |

## Fase 3 · PWA y local-first

| Tema | Decisión |
|---|---|
| Almacenamiento | IndexedDB con Dexie. Cada cambio escribe solo esa ficha, de inmediato y en orden. Al borrar queda una lápida (id + momento) para la sincronización de la Fase 4. Lo que había en localStorage (Fase 2) se migra una vez y se borra de ahí. |
| Persistencia | Se pide al navegador almacenamiento persistente para que no borre los datos si le falta espacio; la app dice si lo concedió. |
| Varias pestañas | Se avisan por BroadcastChannel y se quedan con la versión más reciente de cada ficha. |
| Errores al guardar | Si falla la escritura, aparece un aviso rojo arriba (los datos siguen en pantalla) y se sugiere descargar una copia. |
| Copia de seguridad | Descargar todas las fichas en JSON y restaurarlas (en este u otro dispositivo); al restaurar gana la versión más reciente de cada ficha. La app recuerda la fecha de la última copia y la sugiere si pasaron 7 días. |
| Sin conexión | Service worker (vite-plugin-pwa / Workbox) que guarda toda la app, incluidas las fuentes. Las fuentes ya no vienen de Google Fonts: van dentro de la app. |
| Actualizaciones | Cuando hay versión nueva, aparece "Hay una versión nueva · Actualizar"; se actualiza cuando tú decides. |
| Ícono | Anillo de avance (la gamificación) alrededor de una cruz médica, en la paleta de la app. `scripts/iconos.mjs` genera los PNG. |

## Fase 4 · Uso local

Se construyó y probó una versión con nube (Cloudflare Pages + D1 + Access) y análisis con IA, y luego Bracho decidió **uso solo local**. Ese código se retiró de la app; quedó en el historial de git (commit `67adef8`, "Fase 4: sincronización en la nube…") por si algún día se retoma.

| Tema | Decisión |
|---|---|
| Base local | IndexedDB versión 3: al actualizar se eliminan las tablas de sincronización (pendientes, lápidas, meta). Las fichas no se tocan. |
| Pasar fichas | "Enviar a mi otro dispositivo" (Web Share con el archivo, si el navegador lo permite) o "Descargar copia"; en el otro, "Restaurar copia". Una ficha eliminada en un dispositivo reaparece si se restaura una copia hecha antes de eliminarla (no hay lápidas); la app lo explica. |
| Publicación | `npm run build:pages` compila para `/prospectos/`; el contenido de `dist/` se sube al repo público `Brachohm/prospectos` (solo la app, sin datos), servido en https://brachohm.github.io/prospectos/. Cada actualización: compilar, copiar `dist/` a ese repo y subir. |

## Venta consultiva primero y Biblioteca SaludSA

| Tema | Decisión |
|---|---|
| Preexistencias | En nuevos prospectos, la declaración se oculta hasta que la ficha llega a Presentado, Objeción, Seguimiento o Cerrado (`ETAPAS_COTIZACION`), se abre con "Declarar preexistencias" o ya tiene algo declarado. Nada se borra al ocultarla. |
| Documentos | PDF de condiciones generales y anexos: el texto se extrae en el dispositivo con pdf.js (sin internet, sin IA) y se guarda por página en IndexedDB (v4) junto al PDF. Búsqueda sin tildes ni mayúsculas, todas las palabras. Los PDF escaneados no tienen texto: se puede pegar el texto a mano. |
| Planes y argumentos | Los carga Bracho desde el material oficial; se muestran con "validar con SaludSA". Los argumentos se etiquetan (objeción, motivo, familia, edad mayor, emergencia) y cada ficha muestra los que le sirven. |
| Oferta | Ecuación de valor de Hormozi (resultado soñado, probabilidad, tiempo, esfuerzo), bonos con valor en USD, garantía y urgencia. La app solo propone ideas reales: datos de la ficha, beneficios y garantías del plan cargado, y compromisos del propio asesor (`BONOS_ASESOR`). No inventa escasez ni garantías de SaludSA. Visible desde "Descubrimiento". |
| Copia de seguridad | Versión 2: incluye planes y argumentos. Los PDF no viajan en la copia (pesan); se cargan en cada dispositivo. Las copias versión 1 se siguen aceptando. |

## Objetivo mensual y contactos nuevos

| Tema | Decisión |
|---|---|
| Objetivo | Meta de $750 en prima mensual; escalones de comisión 90% ($750) y 120% ($1100), en `src/config/objetivos.ts`. La prima es el "Precio mensual" de cada ficha cerrada en el mes. |
| Mes del cierre | Se guarda `cerradoEn` cada vez que una ficha entra a "Cerrado". Fichas cerradas antes de este cambio usan el inicio de vigencia o, si no hay, la fecha de su última edición. |
| Clientes que faltan | Estimado: lo que falta ÷ prima promedio de los cierres (o de las propuestas con precio, si aún no hay cierres), redondeado hacia arriba. |
| Contactos nuevos | Nombre, edad, género, celular y correo. Se guardan en IndexedDB (v5) y viajan en la copia de seguridad (v3). Aparecen cada día en "Saludar hoy" hasta que se pasan a prospecto; escribir por WhatsApp (con saludo listo) o llamar marca el saludo del día, con "Deshacer". Al pasar a prospecto se copian sus datos a la ficha al registrar el consentimiento. |

## Mensajes de seguimiento y reuniones

| Tema | Decisión |
|---|---|
| Mensajes | Plantillas por etapa en `src/config/mensajes.ts` (editables), rellenadas con datos de la ficha. Se omite una plantilla si falta el dato que necesita; la objeción principal elige su mensaje. Se pueden editar antes de enviar. Ninguna promete coberturas. |
| Reunión | Campos "Próxima reunión (fecha y hora)" y "¿Dónde?" en Seguimiento y cierre; no suman XP ni avance. Las reuniones de hoy en adelante salen en la agenda con botones de recordatorio. |
| Envío | WhatsApp (`wa.me/?text=`) y SMS (`sms:número?body=`): el teléfono abre la app con el texto listo y el asesor toca enviar (una página web no puede enviar sola). Cada envío queda en el historial con su canal (se agregó "SMS"). |

## Referidos

| Tema | Decisión |
|---|---|
| Datos | En contactos nuevos: "¿Quién te lo refirió?" y "Relación" (obligatoria si hay referidor). En la ficha: los mismos campos cuando el origen es "Referido" (suman 5 XP cada uno). Al pasar un contacto a prospecto se copian, con la cadena. |
| Cadena | `src/config/referidos.ts`: 1) presentación y confirmar que sea la persona, mencionando a quien lo refirió; 2) la asesoría de regalo de parte del referidor (optimizar finanzas y proteger su patrimonio), sin vender, preguntando día y hora; 3) opcional, si no responde. Se activan en orden; cada paso guarda el día en que se envió (WhatsApp, SMS o "Ya lo envié"), con "Deshacer". |
| Saludo diario | Un contacto referido no entra al saludo diario hasta enviar los mensajes 1 y 2; mientras tanto aparece en "Referidos por contactar". |

## Configuración del asesor

| Tema | Decisión |
|---|---|
| Perfil | Nombre completo, cómo le gusta que le llamen ({asesor}) y rol ({rol}). Reemplaza al nombre fijo en todos los mensajes (seguimiento por fase, referidos, recordatorios). |
| Mensajes editables | Seguimiento 1-2-3, saludos (texto, texto + video ≤ 30 MB, texto + foto) e invitación. Se editan con emojis y variables, y se guardan con "Guardar y actualizar" (IndexedDB v6; los adjuntos en la tabla `archivos`). La copia de seguridad v4 lleva los textos, no los adjuntos. |
| Seguimiento 1-2-3 | Encadenado por ficha: el siguiente se habilita al día siguiente del anterior, saltando el domingo; nunca dos el mismo día ni en domingo. "Ya respondió" lo detiene. Sale en la agenda cuando toca. |
| Adjuntos | Un enlace de WhatsApp solo lleva texto. Con adjunto se usa el menú de compartir del teléfono: se elige WhatsApp y el chat; el texto también se copia. Si el navegador no puede compartir archivos, se copia el texto y se descarga el archivo. Por correo (mailto) solo va el texto. |
| Saludos | Para contactos que no son referidos. Si hay saludo con foto o video, 💬 deja elegir. |

## Organización: Inicio, Gestión, Base de datos y Configuración

| Tema | Decisión |
|---|---|
| Navegación | Barra inferior con Inicio, Gestión, Base de datos y Configuración. Fichas y Biblioteca se abren encima, con "atrás". |
| Inicio | Saludo según la hora con tu nombre, fecha larga, frase del día (`src/config/frases.ts`), nivel, acceso al Centro de Gestión, objetivo, agenda, saludos y tus fichas. |
| Centro de Gestión | Junta contactos activos y prospectos abiertos (no soltados). Filtro por origen y por tipo. Orden: reunión hoy o mañana, seguimiento o próximo contacto que toca, nunca gestionados, el resto por antigüedad. Los gestionados hoy salen de la cola. |
| Gestión | Acciones: llamar, saludo, seguimiento 1-2-3 (con su regla), invitación, recordatorio, agendar reunión, abrir ficha o pasar a prospecto. Para seguir: elegir el resultado y escribir un resumen (10 caracteres o más). En fichas, la gestión queda también en el historial. |
| Recomendación | Reglas locales con el resultado, el resumen (palabras como "caro", "ya tiene seguro", "más adelante", "no me interesa") y la historia: inicio, continuar, ir al cierre o dar fin (5 intentos sin respuesta, dos "no interesado" o rechazo firme). |
| Pasar a reunión | En la gestión (y en la lista de contactos) despliega "Nuevo cliente" o "Cambio de seguro". En la gestión guarda primero la gestión (resumen obligatorio; si no se eligió resultado, cuenta como "Agendó reunión") y abre la ficha de ese tipo con los datos del contacto. En un prospecto existente, cambia su tipo si se elige el otro y abre su ficha. |
| Soltar | Termina la gestión sin borrar: queda en la Base de datos como "Soltado" y se puede recuperar. Sale de la agenda y del saludo diario. |
| Base de datos | Excel (.xlsx, con `read-excel-file`, en el dispositivo) o CSV. Reconoce nombre, edad (o fecha de nacimiento), ciudad, contacto y correo aunque el encabezado no esté en la primera fila; se pueden corregir las columnas. Filtros por texto, ciudad, edad y datos. No repite números ni correos que ya están. Los importados no entran al saludo diario: se trabajan en el Centro de Gestión. |
| Configuración → Datos | Copias de seguridad, restaurar y exportar CSV. |
| Configuración → Biblioteca | La Biblioteca (documentos, planes con su tabla de coberturas y argumentos) se entra desde Configuración: de ella se alimentan los análisis, la comparación, las ofertas y los informes. Se llama solo "Biblioteca". |

## Cambio de seguro: comparar con el plan actual

| Tema | Decisión |
|---|---|
| Tabla de coberturas | 16 conceptos en `src/config/coberturas.ts` (prima, deducible, copago, cobertura máxima, hospitalización, ambulatorio, medicinas, exámenes, maternidad, emergencias, odontología, preexistencias, exterior, días de reembolso, telemedicina, red). Cada uno dice si "más" o "menos" es mejor. |
| Cargar | Plan actual (en la ficha de cambio) y planes de la Biblioteca: Excel, CSV, PDF con texto, texto pegado o un documento ya cargado en la Biblioteca. Lo reconocido llena solo los campos vacíos; se revisa a mano. Las fotos no se leen (sin OCR). |
| Comparar | Montos, porcentajes, días, "No incluye", "Ilimitado" y "Sí". Si no son comparables (p. ej. % contra $), no se juzga. |
| Recomendar | Puntos por mejoras menos 1,5 × lo que empeora; los conceptos de sus motivos de inconformidad pesan el doble; cada 10% más caro resta medio punto (el doble si su motivo es el precio). Los que superan "Máximo que podría pagar" van al final. |
| Realzar beneficios | Primero lo que resuelve sus motivos, luego el resto de mejoras, lo que hoy no tiene y los beneficios del plan. También se muestra lo que empeora, carencias y exclusiones, y "validar con SaludSA". "Usar en la propuesta" lleva el plan a la propuesta y al pre-cierre, el precio a Presentación y los beneficios a "¿Qué gana?". |

## Post reunión

| Tema | Decisión |
|---|---|
| Informe | PDF generado en el dispositivo (jsPDF, se carga al usarlo): resumen, lo que nos contó, análisis de su situación, estrategia recomendada y próximos pasos. Sin productos ni tarifas: compromiso para la segunda reunión. No detalla datos de salud (solo "registramos tu declaración de salud"). |
| Estrategia | Reglas locales: un plan (individual o familiar), dos planes (padres a cargo, o mayores y jóvenes en el mismo grupo) o plan + complemento (alto costo si menciona emergencias o es sensible al precio, complemento al IESS, lo que su plan actual no incluye, preexistencias). Costo-beneficio: deducible, no pagar lo que no usa, presupuesto, lo que paga hoy, familiar vs. separados. |
| Envío | WhatsApp con el PDF por el menú de compartir (el texto también se copia); correo con asunto y cuerpo listos, y el PDF se descarga para adjuntarlo (mailto no adjunta). También "solo el mensaje" por WhatsApp. Requiere la segunda reunión agendada. Queda en el historial. |
| Mensaje | Agradece, anuncia el informe y que se trabaja en la mejor propuesta, confirma la segunda reunión y el recordatorio, pide la calificación del 1 al 5 y, en cambio de seguro, el PDF de la tabla de coberturas y la sábana de reclamos. La calificación recibida se registra con estrellas. |

## Perfil y herramientas de envío

| Tema | Decisión |
|---|---|
| Perfil | Se agregan celular (WhatsApp) y correo del asesor. Van en la firma de los correos y en el encabezado del informe PDF. |
| Sincronizar | Activa las herramientas con las que salen todos los envíos: WhatsApp (automático: WhatsApp Web en computadora, la app en el celular; o fijo) y el correo según el dominio (Gmail, Outlook.com, Yahoo; para dominios de empresa se elige Microsoft 365, Google Workspace o la app de correo). Abre cada herramienta para iniciar sesión y deja la pestaña con nombre ("whatsapp", "correo") para reutilizarla. La app no entra a ninguna cuenta: arma los enlaces con el mensaje listo. |
| Inicio | Si falta sincronizar, aparece un aviso que lleva a Configuración → Perfil. |

## Jornada y modo sin conexión

| Tema | Decisión |
|---|---|
| Fin de gestión | Botón en el Inicio. Muestra el resumen del día (gestiones, contactos en el historial, nuevos, cierres, prima, reuniones de mañana, pendientes), el estado de la conexión y la copia de seguridad (enviar o descargar). Sin copia, finalizar pide confirmación. Registra la jornada en la Configuración (últimos 90 días; viaja en la copia). |
| Inicio de jornada | Al abrir la app en un día nuevo, antes de todo, recomienda cargar la copia más reciente (la de ayer o la del otro dispositivo), con el último fin de gestión. Se descarta con "Ya está al día" o al cargarla. |
| Modo sin conexión | Interruptor en Configuración → Perfil → Herramientas. Usa la app de WhatsApp y la app de correo (no las versiones web). Al finalizar la gestión recuerda conectarse a WiFi o datos para la copia. |
| Celular | En el celular, WhatsApp y el correo se abren siempre en sus apps, con el contacto, el asunto y el mensaje listos: solo falta tocar "Enviar". |

## Argumentos del sistema y "validar con la aseguradora"

| Tema | Decisión |
|---|---|
| Etiqueta | Todo lo que depende de la compañía se marca "validar con la aseguradora" (antes "validar con SaludSA"). |
| Argumentos del sistema | Se crean solos y se recalculan con la Biblioteca y las fichas: beneficios que solo un plan incluye, el plan con el mejor valor en cada concepto de las tablas, lo que se repite en las comparaciones con planes actuales de clientes (lo que les falta, lo que el plan recomendado mejora) y frases positivas de los documentos (nunca exclusiones). Honestos: solo dicen lo que está en el material, citan la fuente y "validar con la aseguradora". Se usan en la oferta junto a los del asesor; se pueden guardar como propios (para editarlos) u ocultar. |

## Propósito y objetivos configurables

| Tema | Decisión |
|---|---|
| Propósito | Campo del perfil ("el para qué"). Se muestra en grande en el Inicio, arriba de la barra de progreso del objetivo del mes. Si está vacío, un enlace invita a escribirlo. |
| Objetivos | De 1 a 4 en Configuración → Perfil: monto (USD de prima mensual cerrada), beneficio Sí/No y su detalle. Se guardan ordenados de menor a mayor y sin repetir; el primero es la meta. Por defecto: $750 → 90% de comisión y $1100 → 120% de comisión. Al llegar a uno, aviso con su beneficio. |

## Nuevo contacto desde el Inicio

| Tema | Decisión |
|---|---|
| Dónde | Botón "Nuevo contacto" en el Inicio (arriba de Fin de gestión). Abre el mismo formulario de contactos en una hoja. |
| Sincronía | Se guarda en la misma tabla de contactos: aparece al instante en la Base de datos (con su ciudad y origen) y entra a la cola del Centro de Gestión. |
| Repetidos | Si el celular o el correo ya están en un contacto o en una ficha, no se guarda y avisa "Ya está en tu base: (nombre)". Aplica también al formulario de la Base de datos. |

## Ficha: acciones, etapas automáticas, dos reuniones y cierre

| Tema | Decisión |
|---|---|
| Secciones | Se quitan "Presentación" y "Seguimiento y cierre". Quedan Datos, Descubrimiento, Referidos y (al ir a contratar) la declaración de preexistencias. Lo de esas secciones vive ahora en "+ acciones" o en el pre-cierre. |
| + acciones | Botón debajo de los datos que despliega: agendar/realizar reunión, informe post reunión, mensajes y recordatorios, invitación, seguimiento 1-2-3, cadena de referido, registrar contacto, plan recomendado, comparar plan actual, analizar, notas, "Ya va a contratar" y "No contrató". |
| Etapas | Nuevo → Primera reunión → Segunda reunión → Seguimiento → Pre-cierre → Cerrado (y Perdido). Avanzan solas: con la reunión agendada o al pasar a reunión, Primera; con la primera realizada, Segunda; con la segunda, Seguimiento. Pre-cierre, Cerrado y Perdido se marcan con botón. Las etapas viejas se traducen (Descubrimiento → Primera reunión, Presentado → Segunda reunión, Objeción → Seguimiento). |
| Reuniones | Dos por cliente: 1ª recolección de información, 2ª presentación de propuestas. Una 3ª o más solo como caso especial, con motivo obligatorio (también en el Centro de Gestión). |
| Referidos | Sección con 3 referidos (nombre, celular, relación) a los que la persona quiere obsequiar la asesoría. Se piden en la 1ª reunión; si no, la ficha avisa que se pidan en la 2ª. Cada uno se guarda en la Base de datos como referido de la persona (activa su cadena de mensajes), sin repetir celulares. |
| Pre-cierre | "Ya va a contratar" abre el pre-cierre: producto seleccionado (de la Biblioteca u otro), monto de deducible y valor mensual; uno o más productos. El total queda como precio de la ficha. Simulación en la barra del objetivo (rayada), en la ficha y en el Inicio. |
| Venta exitosa | Pasa a Cerrado (pestaña "Cerrado" en el Inicio) y pide plan contratado (propuesto desde el pre-cierre), fecha de emisión, fecha de renovación, y comprobante de pago, contrato y ficha de preexistencias en JPEG o PDF (hasta 15 MB). Los archivos quedan solo en este navegador; no van en la copia de seguridad. |

## Flujo de etapas, seguimiento 1-3-5, ocupación e informes post reunión

| Tema | Decisión |
|---|---|
| Etapas | Primer contacto → Cuadrar cita → Primera reunión → Segunda reunión → Pre-cierre → Venta exitosa → Cerrado (y Perdido). Tras el primer contacto (historial, gestión o seguimiento) pasa sola a "Cuadrar cita"; con la reunión agendada, a "Primera reunión"; con la primera hecha, a "Segunda reunión" (y ahí sigue tras la segunda hasta que decide). "Venta exitosa" cuenta para el objetivo y es cliente; pasa sola a "Cerrado" al tener número de contrato, fecha de emisión y los tres documentos. La pestaña del Inicio se llama "Cerrados". Etapas viejas: Nuevo → Primer contacto; Presentado, Objeción y Seguimiento → Segunda reunión. Reemplaza lo dicho antes sobre "Seguimiento" como etapa. |
| Número de contrato | Campo de texto libre (letras y números) en la sección Cerrado. |
| Seguimiento 1-2-3 | Los mensajes van el día 1, el 3 y el 5, contando días laborables de lunes a sábado (el domingo no cuenta ni se envía). Si contesta, se detiene y aparece "Enviar de nuevo el mensaje 1" (la vuelta anterior queda guardada). También en el Centro de Gestión. |
| Ocupación | Campo en los datos del prospecto. Por palabras clave se asigna un grupo (conducción, construcción y oficios, salud, docencia, comercio, seguridad, oficina o "día a día") con riesgos laborales y ergonómicos (nivel bajo/medio/alto) y la atención que podría necesitar. Son orientaciones generales, no diagnósticos; editables en config/ocupaciones.ts. Refuerzan los argumentos (uno automático por su trabajo), la oferta, el análisis y los informes. |
| Informe 1ª reunión | Su perfil, lo que contó, su protección hoy (lo esencial: hospitalización, emergencias, consultas, medicinas, exámenes; con un nivel estimado), riesgos de su trabajo, lo que vemos, estrategia recomendada y próximos pasos. Sin productos ni tarifas. |
| Informe 2ª reunión | La propuesta trabajada (productos del pre-cierre o el plan elegido al comparar, cuota, deducible, coberturas principales), lo que gana, preguntas frecuentes, riesgos de su trabajo y, al final, la oferta irresistible con la inversión. |
| Objeciones | En Post reunión (2ª) el asesor marca las objeciones que planteó. En el informe no se nombran: salen como preguntas frecuentes pensadas para resolverlas (config/objeciones.ts), reforzadas con un argumento de la Biblioteca y, si aplica, con los riesgos de su trabajo. |
| Diseño del PDF | Estilo de la app: Sora y Plus Jakarta Sans (convertidas a TTF y guardadas para usar sin conexión), tarjetas, línea de pasos (paso 1 o 2 de 3), batería de nivel, medidores de riesgo y barras de valor. Poco texto. Si las fuentes no cargan, usa Helvetica. |

## Informe: dos botones; Recordatorio aparte; Zoom/Meet y Google Calendar

| Tema | Decisión |
|---|---|
| Botones del informe | "Descargar PDF", "WhatsApp" (abre el chat con el mensaje listo; el PDF se adjunta a mano) y "Correo" (abre el correo con asunto y mensaje, y descarga el PDF para adjuntarlo). Se quitaron "WhatsApp con PDF" y "Ambos". |
| Mensajes y Recordatorio | Son dos acciones separadas. "Mensajes" trae solo los de la fase; "Recordatorio" trae confirmar, recordar hoy y reprogramar la reunión (WhatsApp, SMS o copiar) y el botón para Google Calendar. |
| Modalidad | Al agendar se elige Presencial (lugar), Zoom o Google Meet (link de la reunión, debe empezar con https://). El link también se puede pegar o cambiar en Recordatorio. Va en invitación, recordatorios, informe, agenda y calendario. Las reuniones de antes con un link en el lugar se reconocen solas. |
| Google Calendar | Al guardar la reunión se abre Google Calendar con el evento lleno (título, fecha, hora, una hora de duración, zona America/Guayaquil, lugar o link, y el correo del prospecto como invitado): solo falta tocar "Guardar". Se puede desmarcar ("Agendar en Google Calendar al guardar"); la preferencia se recuerda en ese navegador. Sin cuentas ni claves: es el enlace público de Google para crear eventos. |

## Siguiente fase y emojis en acciones

| Tema | Decisión |
|---|---|
| Botón de fase | Debajo de la línea de etapas, "Pasar a (siguiente) →". Primer contacto → Cuadrar cita (abre Mensajes); Cuadrar cita → Primera reunión (abre Agendar); Primera reunión → Segunda reunión (marca la primera como realizada y abre el informe); Segunda reunión → Pre-cierre (si la segunda no se marcó, queda realizada); Pre-cierre → Venta exitosa (pide producto y valor mensual); Venta exitosa → Cerrado (avisa lo que falta: contrato, emisión, documentos). |
| Emojis | Cada botón de "+ acciones" lleva un emoji decorativo. No forma parte del nombre del botón ni va en los mensajes. |

## Saludo según la hora

| Tema | Decisión |
|---|---|
| Variables | {saludo} = "buenos días" (5:00 a 11:59), "buenas tardes" (12:00 a 18:59) o "buenas noches" (19:00 a 4:59); {deseo} = "un excelente día", "una excelente tarde" o "una linda noche". Se calculan con la hora del celular al preparar el mensaje. |
| Mensajes | Los mensajes de fase, recordatorios, seguimiento 1-2-3, saludos, invitación, cadena de referidos e informes empiezan con el saludo de la hora ("Hola Ana, buenas tardes. ..."). |
| Mensajes guardados | Si un mensaje guardado en Configuración es igual al de fábrica anterior, se usa el nuevo con saludo. Si lo editaste, se respeta, pero "buenos días/buenas tardes/buenas noches" escritos a mano se ajustan solos a la hora. |

## Invitación sin reunión agendada

| Tema | Decisión |
|---|---|
| Invitación | Si no hay reunión agendada, la invitación (WhatsApp y correo, en la ficha y en el Centro de Gestión) quita la fecha, la hora y el "¿Te queda bien?" y pregunta: "¿Qué día y a qué hora puedes disponer de 30 minutos para tener la reunión?". Con la reunión agendada, sale con fecha, hora y lugar como antes. Funciona también con invitaciones editadas en Configuración. |

## Talla, peso e IMC en la declaración

| Tema | Decisión |
|---|---|
| Datos | Cada persona de la declaración (titular incluido) tiene talla (m o cm) y peso (kg o lb). Si en "m" escriben 170, se entiende cm. |
| IMC | Se calcula solo (peso en kg / talla en m²) con un decimal y rangos de la OMS para adultos: bajo peso (<18,5), adecuado (18,5 a 24,9), sobrepeso (25 a 29,9), obesidad I, II y III (30, 35 y 40 o más). En menores de 18 años no se clasifica (tablas de crecimiento por edad y sexo, con el pediatra). |
| Factor de riesgo | Solo si aplica (bajo peso, sobrepeso u obesidad), en tono neutral: qué conviene tener presente para la salud y la cobertura. Nota fija: "es un dato para ver el panorama, no un juicio"; el IMC no distingue músculo de grasa; la aseguradora puede considerarlo (validar con la aseguradora). |
| Dónde aparece | En la declaración (con escala de colores), en su resumen, en el CSV y en los recordatorios del análisis. No va en los informes para el cliente (no detallan datos de salud). |

## Dos recordatorios por reunión

| Tema | Decisión |
|---|---|
| Recordatorio 1 | Lo envías tú cuando quieras (confirmar, recordar hoy o reprogramar) desde "Recordatorio" en la ficha o desde el Centro de Gestión. Queda marcado con día y hora. |
| Recordatorio 2 | Se habilita con máximo una hora de anticipación (desde 60 minutos antes hasta que empieza la reunión). Texto: "Te recuerdo que en un momento, a las {hora}, nos vemos{lugar}. ¡Te espero!" (con el link si es virtual). |
| Aviso en el Inicio | Arriba del Centro de Gestión aparece "Recordatorio 2 de tus reuniones": las que toca enviar ya, con WhatsApp o SMS y los minutos que faltan, y las que se habilitan más tarde hoy. Se actualiza solo cada 30 segundos. Incluye fichas y contactos. |
| Registro | Los recordatorios se guardan por reunión: si la reunión se cambia de fecha u hora, los dos empiezan de cero. Sin hora de reunión no hay recordatorio 2. |
| Límite | Es un aviso dentro de la app (hay que tenerla abierta); no es una notificación del teléfono. |

## Precarga de planes desde los PDF

| Tema | Decisión |
|---|---|
| Cuándo | Al cargar un anexo, condiciones o tarifas (PDF o texto pegado), si el documento trae datos reconocibles, se abre el plan precargado para revisarlo. También con "Precargar plan" en cada documento y con "Precargar desde un documento…" dentro del editor del plan. |
| Qué copia | Solo líneas escritas en el documento, tal cual: coberturas, carencias, exclusiones, beneficios y garantías (por sus títulos de sección), líneas que dicen claramente "se excluye…" o "carencia de N meses", y la tabla de coberturas (valores junto a cada concepto; la prima va como precio). Las líneas de carencias y exclusiones no llenan la tabla. La fuente queda con el documento y sus páginas. |
| No inventa | Lo que no encuentra queda vacío. Si no encuentra nada, lo dice y no crea el plan. No pisa lo que ya escribiste: suma líneas que faltan y llena conceptos vacíos. Si el plan ya existe (mismo nombre), lo actualiza. Siempre se revisa y se guarda a mano. |
| Límite | Es lectura por reglas, sin IA: funciona mejor con anexos que tienen títulos ("Coberturas", "Carencias", "Exclusiones"…). Los PDF escaneados (fotos) no tienen texto. |

## Identificación de los asegurados (pre-cierre)

| Tema | Decisión |
|---|---|
| Datos | En "Ya va a contratar", por cada asegurado (titular y familiares de la declaración): número de identificación (cédula o pasaporte), fecha de emisión y fecha de expiración del documento. Se pueden agregar o quitar asegurados ahí mismo (nombre y parentesco). |
| Avisos | No bloquean la venta: cédula ecuatoriana con dígito verificador inválido, documento vencido o por vencer (60 días), emisión en el futuro o expiración antes de la emisión. Un pasaporte (letras y números) se acepta tal cual. |
| Dónde vive | En los datos de cada persona de la ficha (mismo lugar que la declaración). Va en la copia de seguridad; no va en los informes. |

## Secciones desplegables en la ficha

| Tema | Decisión |
|---|---|
| Qué | Datos, Descubrimiento, Referidos, Declaración de preexistencias, Pre-cierre y Cerrado son desplegables: el título abre o pliega la sección. Plegada, muestra solo el título, el avance (XP, barra o conteo) y la flecha. |
| Qué se abre | Solo lo de la etapa en curso: Primer contacto y Cuadrar cita → Datos; Primera reunión → Descubrimiento; Segunda reunión → Referidos (si faltan); Pre-cierre → Declaración y Pre-cierre; Venta exitosa y Cerrado → Cerrado. Al cambiar de etapa se abre la nueva y se pliegan las demás. |
| Lo que no cambia | La línea de etapas, "+ acciones" y los botones de guardar quedan siempre visibles. Lo escrito se conserva aunque la sección esté plegada. |

## Oferta irresistible en los informes

| Tema | Decisión |
| --- | --- |
| Sin llenado | La oferta ya no es un espacio para llenar ni está en "+ acciones". Se arma sola para cada cliente. |
| Dónde va | En grande al final de los dos informes (PDF), con el título "Nuestra oferta para usted": portada violeta con el nombre de la oferta, el plan y lo que va a lograr; "Por qué funciona" y "Lo que yo hago por ti"; "Además recibes" (bonos); "Desde cuándo", "Mi garantía" y "¿Por qué ahora?". En la propuesta cierra con la inversión mensual en grande (y las barras de valor si hay bonos con monto); en la primera reunión, con "La inversión, en nuestra segunda reunión". En Post reunión se ve un adelanto. |
| De dónde sale | Solo de lo que ya hay: la ficha (por qué ahora, quién depende, ocupación, renovación), el plan de la Biblioteca (el primero del pre-cierre o el elegido al comparar: coberturas, beneficios, garantías) y los argumentos que aplican. Bonos sin monto escrito no llevan valor (no se inventa). Lo que ya va como bono no se repite en "Lo que yo hago por ti". Lo escrito antes en una oferta a mano (fichas antiguas) manda. |
| Honestidad | "Desde cuándo" avisa que algunas coberturas tienen tiempos de espera y la inversión dice "Referencial (validar con la aseguradora)". |

## Plan recomendado (desde los PDF)

| Tema | Decisión |
| --- | --- |
| Dónde | "+ acciones" → 🧭 Plan recomendado. En el pre-cierre se ve también cuál es el recomendado. |
| Catálogo | Los planes guardados y, además, los que salen solos de los PDF cargados (anexos y tarifas con el nombre del plan; un anexo sin plan usa su nombre). No hace falta precargarlos a mano. |
| Necesidades | Se leen de la ficha: hospitalización y emergencias siempre; medicinas; accidentes por su ocupación; maternidad y niños por quién depende y la edad; crónicas y chequeos desde 56 años; complemento al IESS; preexistencias declaradas (se buscan por nombre en los PDF); exterior si lo mencionó; y en cambio de seguro, sus motivos (reembolsos, deducibles, red, atención). Cada una pesa 1, 2 o 3 (★ clave). Palabras editables en config/recomendar.ts. |
| Cómo revisa cada plan | Necesidad por necesidad: primero la tabla de coberturas del plan, luego sus coberturas, beneficios y garantías, y por último el texto de sus PDF. Una línea que dice "no cubre / excluye" cuenta en contra; una con meses o carencia es un aviso de tiempo de espera. Cada razón cita el documento y la página exacta. Lo que no aparece queda "por confirmar": nunca se supone. |
| Orden | Primero los que entran en su presupuesto (máximo al mes); luego el que respalda más de lo que necesita (lo clave pesa más, lo que no cubre resta); si elige por precio, el más económico suma. Se muestra el % de lo que necesita que está respaldado. |
| Usar en la propuesta | Cada plan elegido se suma al pre-cierre (con su precio) y a la propuesta, sin reemplazar a los anteriores ni duplicarse; se puede quitar con "Quitar". Arriba se ve "En la propuesta: A + B · total al mes". Si venía solo de los PDF, se guarda en Planes. Llena "¿Qué gana?" si está vacío. Lo mismo al comparar coberturas. |

## Médico de cabecera (pre-cierre)

| Tema | Decisión |
| --- | --- |
| Pregunta | En el pre-cierre: "¿Tiene médico de cabecera?" Sí / No. Solo con "Sí" se despliega: nombre del médico, especialidad, consultorio o clínica, y "¿Tiene problema en atenderse con la red de convenio?" (No tiene problema / Prefiere seguir con su médico). Con "No" se continúa con el producto. |
| Regla | Con médico de cabecera, lo más recomendable son los planes de modalidad Abierta o Mixta. Si no tiene problema con la red de convenio, también se recomiendan los de red cerrada. |
| En la recomendación | Si prefiere seguir con su médico se suma la necesidad clave "Seguir con su médico de cabecera": Abierta o Mixta la cumplen; la red cerrada no y va al final de la lista, salvo que su médico aparezca en los PDF de ese plan (se cita la página). Mixta lleva el aviso de confirmar cómo se cubre la atención fuera de la red. |
| Modalidad del plan | Según el producto, no por su nombre: campo "Modalidad" en cada plan (Abierta, Mixta o Red cerrada); si está vacío, se reconoce por lo que dicen sus PDF ("red cerrada", "red exclusiva", "solo en la red de convenio", "modalidad abierta/mixta", "libre elección"). Si no se encuentra: "Modalidad por confirmar". |

## Resumen gráfico y bondades de cada plan (propuesta)

| Tema | Decisión |
| --- | --- |
| Qué estudia | De cada plan de la propuesta: su tabla de coberturas, sus listas (coberturas, beneficios, garantías) y el texto completo de sus PDF (también de los planes que aún no se guardaron en Planes). |
| Resumen gráfico | En el PDF de la propuesta, "Lo más importante de <plan>": tarjetas de color con el dato en grande (cobertura máxima, hospitalización, emergencias, consultas, medicinas, exámenes, maternidad, deducible, copago, reembolso, telemedicina, exterior, odontología, preexistencias y la modalidad). Hasta 8, en orden de importancia. |
| Bondades | "Bondades y beneficios que recibes", agrupadas (protección ante lo grave, familia, servicios incluidos, tu dinero y trámites, fuera del país, día a día). Solo frases tangibles: con un dato concreto (%, $, días, 24/7, ilimitado, sin costo) o un servicio concreto. Las que traen un dato van en negrita y primero. Hasta 14 por plan, cada una con su documento y página. |
| Lo que nunca entra | Exclusiones ("no cubre"), carencias y tiempos de espera (también los de la sección de carencias del PDF), la prima, el deducible y el copago (salvo "sin deducible"), títulos y texto legal. Las frases se copian tal cual: no se reescriben ni se inventan. |
| En la app | En "Plan recomendado" cada plan muestra su resumen y "Bondades para el cierre" con la fuente; la vista previa de Post reunión avisa cuántas van en la propuesta. Palabras editables en config/bondades.ts. |

## Valor por recomendación y comparativo de pago (cambio de seguro)

| Tema | Decisión |
| --- | --- |
| Valor mensual por recomendación | En el pre-cierre, los 3 primeros planes recomendados (y los que ya están en la propuesta) con su campo "Valor mensual (USD)": precargado con el precio de sus documentos si lo traen, editable. "Sumar a la propuesta" lo lleva como producto con ese valor; si ya está, cambiarlo cambia el producto. Así la inversión ya va en el informe. |
| Comparativo | Solo en cambio de seguro, cuando se sabe lo que paga hoy (tabla de su plan actual o "Lo que paga hoy"). En la propuesta: barras "Pagas hoy" vs. "Con tu nueva protección" y una tarjeta grande con el encuadre de valor. |
| Si paga menos | "Pagas $X menos al mes" · "Son $Y al año a tu favor y, aun así, tienes N coberturas y beneficios concretos". |
| Si paga más | "Por $X más al mes: $Z al día" · "Esa diferencia, $Z al día, se convierte en N coberturas y beneficios concretos". |
| Si paga lo mismo | Diferencia menor a $1: "Por lo mismo que pagas hoy" · "Con el mismo pago tienes N coberturas y beneficios concretos". |
| Lo que gana (siempre real) | Primero lo que mejora frente a su plan actual según la comparación de coberturas (con "hoy …"), luego lo que anotaste en "¿Qué gana?", el resto de la comparación y las bondades con dato de los PDF. Hasta 6. Costos (deducible, copago) no cuentan como ganancia. Pastillas: al año a tu favor o al día, cuántas coberturas y beneficios, y cuánto cuesta cada una al mes. También una línea en el mensaje de WhatsApp/correo y en la vista previa. |

## Lo que debe saber de cada plan (propuesta, sin ocultar nada)

| Tema | Decisión |
| --- | --- |
| Deducible | Siempre aparece, aunque no se sepa el monto ("Por confirmar con la aseguradora"). Tarjeta "Tu deducible" con el valor (del pre-cierre o del PDF, p. ej. "$300 al año") y "¿Qué es el deducible?": lo que pagas tú primero antes de que el seguro cubra; un ejemplo con su propio monto (gastos de al menos $1.000: tú cubres el deducible y el seguro el resto según su porcentaje); y si se cuenta por año o por evento según lo que dice el PDF (si no lo dice: validar con la aseguradora). |
| Copago | Si el plan lo tiene: qué es y, si es un porcentaje, cuánto pagas de cada $100. |
| Carencias | Línea de tiempo desde el inicio de la póliza (marcas cada 6 meses): cada tiempo de espera en su mes, agrupando los iguales. Debajo, todas tal cual con su documento y página (también las que no dicen cuántos meses). Se leen meses, días o años. |
| Exclusiones | "Lo que no cubre": todas las de la sección de exclusiones del plan y sus PDF (hasta 8), tal cual y con su fuente. |
| Extractor | Corregido: una línea como "No cubre tratamientos estéticos" ya no se toma como título de sección (antes se perdía). Un título es corto (hasta 3 palabras antes de los dos puntos) o es todo el texto. |
| Orden de la propuesta | Productos → comparativo (cambio de seguro) → por cada plan: lo más importante, bondades y lo que debes saber → lo que ganas → preguntas frecuentes → riesgos → siguientes pasos → al final, siempre, la oferta irresistible ("Nuestra oferta para usted"). |

## Tipo de póliza actual y Vitality

| Tema | Decisión |
| --- | --- |
| Tipo de póliza | En cambio de seguro (Descubrimiento): "¿Su seguro actual es individual, masivo o corporativo?". Va al resumen del informe 1 ("Tipo de seguro") y a su análisis. |
| Masivo | Argumento de precio: cuesta poco porque está hecho para muchas personas con las mismas condiciones; conviene comparar lo que cubre de verdad (montos, topes, exclusiones). Un plan individual se arma a su medida. |
| Corporativo | Argumento de precio: lo negocia o lo paga en parte la empresa o institución. Continuidad: le cubre solo mientras esté vinculado a la empresa o mientras estudie; si cambia de trabajo, lo desvinculan o termina sus estudios, se acaba. Las condiciones las decide la empresa. Uno propio es suyo y la antigüedad se queda con él. Con una condición de salud, contratar después puede ser más difícil (validar con la aseguradora). |
| Dónde se usa | Propuesta: sección "Tu seguro actual es masivo/corporativo" (después del comparativo) y, si planteó el precio, en la respuesta de esa pregunta frecuente. Etiquetas de argumento "Su seguro actual es masivo / corporativo" para tus argumentos. Textos editables en config/poliza.ts. |
| Vitality | Si un plan lo tiene (en sus datos o en sus PDF), la propuesta suma "<plan> incluye Vitality": qué es (programa que premia los hábitos saludables) y sus beneficios Cada semana · Cada mes · Cada año, más "Además, con Vitality". Los beneficios salen tal cual de los documentos que hablan de Vitality (el de un documento de Vitality, todo; de otro, solo la parte donde lo menciona), con su fuente; nunca lo que "no aplica". Si un periodo no aparece: "Pide el detalle en el material de Vitality". En Plan recomendado, la etiqueta "Incluye Vitality". Palabras editables en config/vitality.ts. |
| Extractor de tabla | "Emergencias en el exterior" se guarda como cobertura en el exterior (antes como emergencias); igual con preexistencias. |

## Saludo de los referidos editable

| Tema | Decisión |
| --- | --- |
| Dónde | Configuración → pestaña "Referidos": los 3 mensajes de la cadena (1: presentación/saludo, 2: la asesoría de regalo, 3: si no responde), con la vista previa "Así lo verá…". |
| Variables | {nombre}, {saludo}, {deseo}, {asesor}, {rol}, {referidor} (primer nombre de quien lo refirió) y {relacion} (", tu amiga," según la relación; vacío si no aplica). Sin emojis. |
| Sin cambios | Si no se edita, se usa el texto de fábrica (config/referidos.ts). Se aplica en la cadena de la ficha y de los contactos. |

## Trato de usted en mensajes e informes

| Tema | Decisión |
| --- | --- |
| Tono | Todo lo que recibe el cliente usa "usted", sin importar la edad: cálido, profesional y respetuoso ("Muchas gracias por su tiempo", "Le comparto…", "Con gusto se lo aclaro", "Quedo a sus órdenes"). |
| Qué cambió | Mensajes por etapa y recordatorios, seguimiento 1-2-3, saludos, invitación, cadena de referidos (y la relación: "su amiga", "su jefe"), comparación de planes, informes 1 y 2 (PDF y mensajes), preguntas frecuentes, oferta ("Nuestra oferta para usted", "Lo que hago por usted"), deducible y copago, tipo de póliza, Vitality. |
| Lo del asesor | Las pantallas para el asesor (ayudas, avisos, frases del día) siguen en "tú": son para él, no para el cliente. |
| Textos guardados | Los mensajes de Configuración que no editaste pasan solos a la versión con "usted"; los que escribiste a mano se respetan tal cual. |

## Contacto registrado o sin registrar

| Tema | Decisión |
| --- | --- |
| Interruptor | En Nuevo contacto (y al editarlo): "Me tiene registrado" / "Sin registrar". Un contacto nuevo empieza en "Sin registrar"; los contactos de antes se toman como registrados. En la lista, "Sin registrar: el saludo lo presenta". |
| Saludo | Si no tiene tu número registrado, el saludo (texto, video o foto) lleva tu presentación breve justo después de la primera frase. Si el saludo ya te nombra, no se repite. También en el Centro de Gestión. |
| Presentación | Editable en Configuración → Saludos → "Presentación (si no le tiene registrado)". De fábrica: "Le saluda {asesor}, {rol}. Quedo a sus órdenes en todo lo relacionado con su salud y la de su familia." |

## Tu foto (perfil)

| Tema | Decisión |
| --- | --- |
| Dónde | Configuración → Perfil → "Tu foto": subir, cambiar o quitar (solo imágenes, hasta 5 MB). Se guarda en el dispositivo, como los demás adjuntos, y se aplica con "Guardar y actualizar". |
| Saludo | A quien no tiene tu número registrado, el saludo de texto se comparte con tu foto (menú de compartir del celular; el texto se copia también). En Contactos y en el Centro de Gestión. Los registrados reciben el saludo de siempre. |
| Membrete | En los informes en PDF: tu foto en un círculo con borde blanco y tu nombre en la portada, junto a tus datos (nombre, rol, WhatsApp, correo); y en la banda de cada página siguiente, tu nombre con la foto pequeña. Se ajusta sola a un cuadrado (recorte al centro). Sin foto, el PDF queda como antes. |

## Pendientes de decidir

- Revisión legal (LOPDP) y permiso de SaludSA para guardar datos de prospectos fuera de sus sistemas, antes de usarla con clientes reales.
