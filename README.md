# Tablero de prospectos · Asesoría de inversiones

App mobile-first para registrar y analizar prospectos de **asesoría de inversiones** (planes unit linked de contribución regular y de contribución única) en Ecuador. Nace como copia de [tablero-prospectos-saludsa](https://github.com/Brachohm/tablero-prospectos-saludsa) y comparte su núcleo (etapas, gamificación, CRM, mensajes, copias de seguridad). **Uso 100 % local:** las fichas viven solo en cada dispositivo (IndexedDB) y nunca salen a internet; se pasan entre dispositivos con la copia de seguridad. El brief está en `CLAUDE.md` y las decisiones heredadas en `DECISIONES.md`.

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
npm run build:pages      # compila para GitHub Pages (en /tablero-prospectos-inversiones/)
```

Para instalarla en el celular y la computadora: **[PUBLICAR.md](PUBLICAR.md)**.

## Estructura

```
src/
  config/           Lo editable sin tocar la lógica
    ficha.ts        Tipos, etapas, motivos, misiones y campos (con su XP)
    juego.ts        Niveles, bonus de cierre, XP de preexistencias
    comisiones.ts   Forma de la tabla de comisiones (la escribes en Configuración → Perfil → Comisiones)
    saludsa.ts      Texto "validar con la aseguradora" (nombre heredado)
    crm.ts          Canales de contacto, campos de cliente, posventa, agenda
    objetivos.ts    Meta mensual de aportes cerrados y sus escalones
    frases.ts       Frases del día del Inicio
    coberturas.ts   Conceptos de la tabla de coberturas y su peso por motivo
    ajustes.ts      Textos iniciales de la Configuración y el máximo de adjuntos (30 MB)
    referidos.ts    Relaciones con quien refiere y la cadena de mensajes para referidos
    mensajes.ts     Mensajes de seguimiento por etapa y recordatorios de reunión (tu nombre: NOMBRE_ASESOR)
    biblioteca.ts   Tipos de documento, etiquetas de argumentos, bonos del asesor, palancas de valor
  domain/           Lógica pura, con pruebas
    ficha.ts        Acceso a campos, campo activo, consentimiento
    xp.ts           XP, avance, niveles, insignias, tablero
    analisis.ts     Análisis local, diagnóstico, veredicto, comparativo, resumen
    datos.ts        Datos recabados (mínimos para opinar)
    crm.ts          Historial de contactos, cartera de clientes y agenda
    lista.ts        Orden y filtros
    csv.ts          Exportar CSV
    respaldo.ts     Copia de seguridad (crear y combinar; la validación se carga aparte)
    biblioteca.ts   Documentos, planes y argumentos; búsqueda sin conexión; argumentos por ficha
    objetivos.ts    Aportes cerrados del mes, comisión estimada, escalones y clientes que faltan
    comisiones.ts   Comisión estimada de un cierre (tipo de plan, plazo y aporte)
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
  ui/               Pantallas: Tablero (agenda, lista, clientes), Ficha, Analisis, Historial, Cliente,
                    Biblioteca, Oferta; pdf.ts lee el texto de los PDF en el dispositivo (pdf.js)
  styles/           Tokens de diseño y estilos
e2e/                Flujos completos en el navegador
```

## Qué cambió frente a la app de SaludSA

- **Tipos de ficha:** 🌱 Primera inversión (quiere empezar a invertir) y 🔄 Ya invierte (tiene ahorros o inversiones y no está conforme).
- **Descubrimiento:** meta y monto, plazo, aporte mensual, capital para aporte único, perfil de riesgo (con la pregunta de qué haría ante una caída), fondo de emergencia y deudas. Para quien ya invierte: dónde, saldo, aporte, vencimiento y motivos (rendimiento, costos, liquidez, transparencia, riesgo, asesoría).
- **Análisis:** veredicto honesto (por ejemplo, "primero un fondo de emergencia", "horizonte corto: un plan de largo plazo aún no conviene", "aún no conviene mover su dinero"), costo de oportunidad, comparativo y recordatorios (perfil de riesgo, rendimientos no garantizados, costos, rescates y KYC).
- **Pre-cierre:** tipo de plan, plazo y aporte; muestra la **comisión estimada** según tu tabla de Configuración → Perfil → Comisiones.
- **Objetivo del mes:** suma los aportes cerrados y muestra la comisión estimada del mes.
- **Informe de primera reunión (PDF):** perfil, situación financiera hoy, lo que vemos en su caso y estrategia (regular, única o regular + aporte único).
- **Se quitó:** declaración de preexistencias, escáner del cuerpo, IMC, médico de cabecera y riesgos laborales de salud. Las acciones "Plan recomendado" y "Comparar plan actual" están ocultas hasta adaptarlas.
- **Datos separados:** base local, copias de seguridad y canales propios, así las fichas no se mezclan con las de SaludSA aunque las dos apps estén en el mismo dominio.

## Pendiente (siguiente fase)

- Adaptar la Biblioteca y el informe de la segunda reunión (propuesta): hoy siguen pensados en tablas de coberturas de salud.
- Proyección de valor del plan (escenarios conservador, moderado y optimista, sin garantizar rendimientos).
- Cuestionario de perfil de riesgo completo y checklist de KYC en el cierre.
