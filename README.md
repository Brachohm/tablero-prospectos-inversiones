# Tablero de prospectos SaludSA

App mobile-first para registrar y analizar prospectos de medicina prepagada. **Uso 100 % local:** las fichas viven solo en cada dispositivo (IndexedDB) y nunca salen a internet; se pasan entre dispositivos con la copia de seguridad. El brief está en `CLAUDE.md`, las decisiones tomadas en `DECISIONES.md` y el prototipo de referencia en `prototipo/`.

## Comandos

```bash
npm install
npm test          # pruebas unitarias (Vitest)
npm run e2e       # pruebas de extremo a extremo en Chromium (Playwright)
npm run typecheck # TypeScript estricto
npm run lint      # oxlint
npm run dev       # servidor de desarrollo
npm run build
node scripts/iconos.mjs  # regenera los PNG del ícono desde public/*.svg
npm run build:pages      # compila para GitHub Pages (en /prospectos/)
```

Para instalarla en el celular y la computadora: **[PUBLICAR.md](PUBLICAR.md)**.

## Estructura

```
src/
  config/           Lo editable sin tocar la lógica
    ficha.ts        Tipos, etapas, motivos, misiones y campos (con su XP)
    juego.ts        Niveles, bonus de cierre, XP de preexistencias
    zonas.ts        Zonas del cuerpo y condiciones (propuesta, no formulario oficial)
    saludsa.ts      Referencias a servicios de SaludSA (siempre "validar")
    crm.ts          Canales de contacto, campos de cliente, posventa, agenda
    objetivos.ts    Meta mensual de prima y escalones de comisión
    frases.ts       Frases del día del Inicio
    coberturas.ts   Conceptos de la tabla de coberturas y su peso por motivo
    ajustes.ts      Textos iniciales de la Configuración y el máximo de adjuntos (30 MB)
    referidos.ts    Relaciones con quien refiere y la cadena de mensajes para referidos
    mensajes.ts     Mensajes de seguimiento por etapa y recordatorios de reunión (tu nombre: NOMBRE_ASESOR)
    biblioteca.ts   Tipos de documento, etiquetas de argumentos, bonos del asesor, palancas de valor
  domain/           Lógica pura, con pruebas
    ficha.ts        Acceso a campos, campo activo, consentimiento
    xp.ts           XP, avance, niveles, insignias, tablero
    pre.ts          Declaración de preexistencias
    analisis.ts     Análisis local, diagnóstico, veredicto, comparativo, resumen
    datos.ts        Datos recabados (mínimos para opinar)
    crm.ts          Historial de contactos, cartera de clientes y agenda
    lista.ts        Orden y filtros
    csv.ts          Exportar CSV
    pre-ops.ts      Operaciones del escáner (agregar personas, marcar zonas…)
    respaldo.ts     Copia de seguridad (crear y combinar; la validación se carga aparte)
    biblioteca.ts   Documentos, planes y argumentos; búsqueda sin conexión; argumentos por ficha
    objetivos.ts    Prima cerrada del mes, escalones y clientes que faltan
    contactos.ts    Contactos nuevos y saludo diario
    comparar.ts     Cambio de seguro: tablas de coberturas, comparación y recomendación
    informe.ts      Informe post reunión: resumen, análisis, estrategia y mensaje
    jornada.ts      Resumen del día, fin de gestión e inicio de jornada
    gestion.ts      Centro de Gestión: cola, gestiones, recomendación
    importar.ts     Base de datos: columnas, edad, CSV, filtros y duplicados
    inicio.ts       Saludo, fecha y frase del día
    mensajes.ts     Elige y rellena mensajes; reunión; enlace SMS
    ajustes.ts      Perfil y mensajes editables (guardados o iniciales), adjuntos
    seguimiento.ts  Seguimiento 1-2-3: un mensaje por día, sin domingos
    referidos.ts    Pasos de la cadena de referido (texto, orden, fecha de envío)
    oferta.ts       Oferta tipo Hormozi: ecuación de valor, bonos, garantía, urgencia, mensaje
  store/            Estado de la app y guardado en IndexedDB (fichas y Biblioteca)
  ui/               Pantallas: Tablero (agenda, lista, clientes), Ficha, Escaner, Analisis, Historial, Cliente,
                    Biblioteca, Oferta; pdf.ts lee el texto de los PDF en el dispositivo (pdf.js)
  styles/           Tokens de diseño y estilos
e2e/                Flujos completos en el navegador
```

## Estado

- [x] Fase 1 · Núcleo: modelo de datos, configuración, lógica pura con pruebas, tokens de diseño, lógica del CRM.
- [x] Fase 2 · Interfaz: tablero con agenda, prospectos y clientes; ficha con consentimiento, misiones, historial, escáner del cuerpo, sección de cliente y referidos; panel de análisis; exportar CSV. Datos en localStorage (pasan a IndexedDB en la Fase 3).
- [x] Fase 3 · PWA y local-first: IndexedDB (Dexie) con escritura inmediata por ficha, lápidas al borrar, migración desde localStorage, pestañas sincronizadas, almacenamiento persistente, instalable y sin conexión (service worker, fuentes locales), copia de seguridad JSON (descargar y restaurar).
- [x] Fase 4 · Uso local (decisión de Bracho): sin nube, sin cuentas y sin IA. Pasar fichas entre dispositivos con "Enviar a mi otro dispositivo" / "Restaurar copia". Publicación como página estática (solo la app, sin datos) en GitHub Pages. La versión con nube e IA quedó en el historial de git (commit 67adef8) por si algún día se quiere.
- [x] Preexistencias solo cerca de contratar: el nuevo prospecto ve solo la venta consultiva hasta "Presentado" (o el botón "Declarar preexistencias").
- [x] Biblioteca SaludSA (PDF con búsqueda sin conexión, catálogo de planes, argumentos) y armador de ofertas tipo Hormozi en la ficha.
- [x] Objetivo del mes ($750 → 90% de comisión, $1100 → 120%) y contactos nuevos con recordatorio diario de saludo.
- [x] Mensajes de seguimiento por fase, próxima reunión y recordatorios por WhatsApp y SMS.
- [x] Referidos: quién refiere y su relación; cadena de mensajes que el asesor activa paso a paso.
- [x] Configuración: perfil del agente, seguimiento 1-2-3 (un mensaje por día, sin domingos), saludos (texto, video, foto) e invitación (WhatsApp o correo), con emojis y adjuntos.
- [x] Reorganización: Inicio (saludo, fecha y frase del día), Centro de Gestión (uno por uno, resumen obligatorio y recomendación), Base de datos (Excel/CSV con filtros) y Configuración (incluye Datos: copias y exportar). Navegación inferior.
- [x] Cambio de seguro: tabla de coberturas del plan actual, comparación con los planes de la Biblioteca y plan recomendado con sus beneficios.
- [x] Post reunión: informe PDF con resumen, análisis y estrategia (un plan, dos o complemento), por WhatsApp o correo, con segunda reunión, calificación y pedidos para cambio de seguro.
- [x] Fin de gestión con copia de seguridad, inicio de jornada (cargar la copia) y modo sin conexión.
- [ ] Fase 5 · Pulido
