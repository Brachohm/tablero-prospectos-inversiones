/**
 * Definición de la ficha: tipos, etapas, motivos y misiones con sus campos.
 *
 * Los pesos de XP y las etapas son PROPUESTAS del asesor, no datos de ninguna aseguradora:
 * ajustarlos aquí. No cambiar la clave `k` de un campo existente: es la que
 * se guarda en las fichas.
 */
import type { Campo, Mision, MotivoId, Tipo } from "../domain/tipos";
import { RELACIONES } from "./referidos";

/**
 * Etapas: Primer contacto > Cuadrar cita > Primera reunión > Segunda reunión
 * > Pre-cierre > Venta exitosa > Cerrado. Avanzan solas con la gestión:
 * tras el primer contacto, "Cuadrar cita"; con la reunión agendada, "Primera
 * reunión"; con la primera hecha, "Segunda reunión". "Pre-cierre" (ya va a
 * contratar), "Venta exitosa" y "Perdido" se marcan con un botón. La venta
 * pasa sola a "Cerrado" cuando tiene número de contrato, emisión y documentos.
 */
export const ETAPAS = [
  "Primer contacto",
  "Cuadrar cita",
  "Primera reunión",
  "Segunda reunión",
  "Pre-cierre",
  "Venta exitosa",
  "Cerrado",
  "Perdido",
] as const;

export const ETAPA_INICIAL = "Primer contacto";
export const ETAPA_VENTA = "Venta exitosa";
export const ETAPA_CERRADO = "Cerrado";
export const ETAPA_PRECIERRE = "Pre-cierre";

/** Etapas de versiones anteriores → etapa actual. */
export const ETAPAS_ANTERIORES: Readonly<Record<string, string>> = {
  Nuevo: "Primer contacto",
  Descubrimiento: "Primera reunión",
  Presentado: "Segunda reunión",
  Objeción: "Segunda reunión",
  Seguimiento: "Segunda reunión",
};

/** Reuniones por cliente: 1ª recolección de información, 2ª presentación de propuestas. Más, solo en casos especiales. */
export const REUNIONES_NORMALES = 2;
export const REUNIONES: readonly { n: number; l: string; corto: string }[] = [
  { n: 1, l: "Primera reunión: recolección de información", corto: "1ª reunión" },
  { n: 2, l: "Segunda reunión: presentación de propuestas", corto: "2ª reunión" },
];

/** Referidos que se piden en la primera reunión (o en la segunda, si faltan). */
export const REFERIDOS_PEDIR = 3;

/** Documentos del cierre (se cargan en JPEG o PDF). */
export const DOCS_CIERRE: readonly { id: string; l: string }[] = [
  { id: "pago", l: "Comprobante de pago" },
  { id: "contrato", l: "Solicitud o contrato del plan" },
  { id: "pre", l: "Formulario KYC y perfil de riesgo" },
];
export const TIPOS_DOC_CIERRE = ["image/jpeg", "application/pdf"] as const;
export const MAX_MB_DOC_CIERRE = 15;

/** De dónde llegó un contacto o prospecto (para filtrar en el Centro de Gestión). */
export const ORIGENES = ["Referido", "Redes sociales", "Contacto en frío", "Evento", "Base de datos", "Otro"] as const;

/**
 * Etapas en las que el nuevo prospecto ya va a contratar: desde aquí se
 * despliega el cierre. Antes, la ficha muestra solo
 * la venta consultiva.
 */
export const ETAPAS_COTIZACION = ["Pre-cierre", "Venta exitosa", "Cerrado"] as const;
export const ETAPA_PERDIDO = "Perdido";

export const TIPOS: Record<Tipo, { n: string; ic: string; desc: string }> = {
  nuevo: { n: "Primera inversión", ic: "🌱", desc: "Quiere empezar a ahorrar o invertir con un plan." },
  cambio: {
    n: "Ya invierte",
    ic: "🔄",
    desc: "Tiene ahorros o inversiones y no está conforme con su resultado.",
  },
};

export const MOTIVOS: readonly { id: MotivoId; ic: string; l: string }[] = [
  { id: "rendimiento", ic: "📉", l: "Rendimiento bajo" },
  { id: "costos", ic: "💲", l: "Comisiones y costos" },
  { id: "liquidez", ic: "🔒", l: "Liquidez o penalidades" },
  { id: "transparencia", ic: "🧾", l: "Poca transparencia" },
  { id: "riesgo", ic: "🎢", l: "Riesgo o volatilidad" },
  { id: "atencion", ic: "📞", l: "Atención y asesoría" },
  { id: "otro", ic: "💬", l: "Otro" },
];

/** Tipos de plan que ofrece el asesor (unit linked). */
export const TIPOS_PLAN = ["Contribución regular", "Contribución única"] as const;

/** Metas de inversión. */
export const METAS = [
  "Retiro o jubilación",
  "Educación de los hijos",
  "Comprar vivienda",
  "Crear patrimonio",
  "Fondo de emergencia",
  "Otro",
] as const;

/** Edad (años) desde la que aplican los recordatorios de "edad mayor" (cercanía al retiro). */
export const EDAD_MAYOR = 50;

/** Contactos mínimos antes de dar un prospecto por perdido. */
export const CONTACTOS_MAX = 5;

export const MISIONES: readonly Mision[] = [
  {
    id: "datos",
    titulo: "Datos del prospecto",
    campos: [
      { k: "nombre", l: "Nombre", t: "text", xp: 10 },
      { k: "whatsapp", l: "WhatsApp", t: "tel", xp: 10 },
      { k: "correo", l: "Correo", t: "email", xp: 0, noCount: true },
      { k: "edad", l: "Edad (años)", t: "number", xp: 5, min: 0, max: 120 },
      { k: "ciudad", l: "Ciudad", t: "text", xp: 0, noCount: true },
      { k: "ocupacion", l: "Ocupación", t: "text", xp: 10, ph: "Contador, médico, comerciante, docente…" },
      {
        k: "origen",
        l: "¿De dónde llegó?",
        t: "select",
        o: ORIGENES,
        xp: 5,
      },
      { k: "referidor", l: "¿Quién lo refirió?", t: "text", xp: 5, cuando: { k: "origen", v: "Referido" } },
      {
        k: "relacion",
        l: "Relación con quien lo refirió",
        t: "select",
        o: RELACIONES.map((r) => r.l),
        xp: 5,
        cuando: { k: "origen", v: "Referido" },
      },
      {
        k: "depende",
        l: "¿Quién depende de esta persona?",
        t: "text",
        xp: 10,
        ph: "Hijos, pareja, padres…",
      },
    ],
  },
  {
    id: "desc",
    titulo: "Descubrimiento",
    campos: [
      {
        k: "ahorroHoy",
        l: "¿Dónde guarda hoy su dinero?",
        t: "select",
        o: ["Cuenta de ahorros", "Depósito a plazo fijo", "Efectivo", "No logra ahorrar", "Otro"],
        xp: 10,
        solo: "nuevo",
      },
      { k: "porque", l: "¿Qué lo hizo pensar en invertir ahora?", t: "text", xp: 15, solo: "nuevo", ph: "Con sus palabras" },
      { k: "institucion", l: "¿Dónde invierte hoy?", t: "text", xp: 10, solo: "cambio", ph: "Banco, aseguradora, fondo, casa de valores…" },
      { k: "producto", l: "¿Qué producto tiene?", t: "text", xp: 5, solo: "cambio", ph: "Plazo fijo, fondo, unit linked…" },
      { k: "tiempoCon", l: "¿Cuánto tiempo lleva con esa inversión?", t: "text", xp: 5, solo: "cambio" },
      { k: "saldoActual", l: "Saldo acumulado hoy (USD)", t: "number", xp: 10, solo: "cambio", min: 0 },
      { k: "aporteActual", l: "Lo que aporta hoy (USD al mes)", t: "number", xp: 5, solo: "cambio", min: 0 },
      { k: "motivos", l: "Motivos de inconformidad", t: "motivos", xp: 10, solo: "cambio" },
      { k: "ren_tasa", l: "Rendimiento anual que recibe (%)", t: "number", xp: 10, solo: "cambio", motivo: "rendimiento" },
      { k: "ren_esperado", l: "Rendimiento anual que esperaba (%)", t: "number", xp: 5, solo: "cambio", motivo: "rendimiento" },
      {
        k: "cos_sabe",
        l: "¿Sabe cuánto paga en comisiones y costos?",
        t: "select",
        o: ["Sí", "Más o menos", "No"],
        xp: 10,
        solo: "cambio",
        motivo: "costos",
      },
      { k: "cos_detalle", l: "Costos que conoce (administración, entrada, salida…)", t: "text", xp: 5, solo: "cambio", motivo: "costos" },
      {
        k: "liq_necesita",
        l: "¿Ha necesitado retirar dinero antes de tiempo?",
        t: "select",
        o: ["Nunca", "Una vez", "Varias veces"],
        xp: 10,
        solo: "cambio",
        motivo: "liquidez",
      },
      { k: "liq_penal", l: "Penalidad o recargo por retiro anticipado", t: "text", xp: 5, solo: "cambio", motivo: "liquidez" },
      {
        k: "tra_informe",
        l: "¿Cada cuánto recibe un estado de cuenta claro?",
        t: "select",
        o: ["Cada mes", "Cada trimestre", "Una vez al año", "Nunca"],
        xp: 10,
        solo: "cambio",
        motivo: "transparencia",
      },
      {
        k: "rie_caida",
        l: "¿Ha visto caídas en su saldo que no esperaba?",
        t: "select",
        o: ["Nunca", "Alguna vez", "Seguido"],
        xp: 10,
        solo: "cambio",
        motivo: "riesgo",
      },
      {
        k: "ate_asesor",
        l: "¿Su asesor actual le da seguimiento?",
        t: "select",
        o: ["Sí, me acompaña", "Responde poco", "No tengo uno"],
        xp: 10,
        solo: "cambio",
        motivo: "atencion",
      },
      { k: "ate_ejemplo", l: "Último caso concreto", t: "text", xp: 5, solo: "cambio", motivo: "atencion" },
      { k: "otro_desc", l: "Descríbelo con sus palabras", t: "text", xp: 10, solo: "cambio", motivo: "otro" },
      { k: "grieta", l: "¿Qué le falla, con sus palabras?", t: "text", xp: 15, solo: "cambio" },
      { k: "vencimiento", l: "Fecha de vencimiento o fin del plazo actual", t: "date", xp: 10, solo: "cambio" },
      {
        k: "conoce",
        l: "¿Sabe en qué está invertido su dinero?",
        t: "select",
        o: ["Sí", "Más o menos", "No"],
        xp: 10,
        solo: "cambio",
      },
      {
        k: "noPerder",
        l: "¿Qué no querría perder si cambia?",
        t: "text",
        xp: 15,
        solo: "cambio",
        ph: "Bonos de permanencia, aportes hechos, liquidez…",
      },
      { k: "meta", l: "¿Para qué quiere invertir?", t: "select", o: METAS, xp: 15 },
      { k: "metaMonto", l: "¿Cuánto necesita para esa meta? (USD)", t: "number", xp: 10, min: 0 },
      {
        k: "horizonte",
        l: "¿En cuánto tiempo necesitará ese dinero?",
        t: "select",
        o: ["Menos de 3 años", "3 a 5 años", "5 a 10 años", "10 a 20 años", "Más de 20 años"],
        xp: 10,
      },
      { k: "aporte", l: "¿Cuánto puede invertir al mes? (USD)", t: "number", xp: 10, min: 0 },
      { k: "capital", l: "Capital disponible para un aporte único (USD)", t: "number", xp: 10, min: 0 },
      {
        k: "perfil",
        l: "¿Cómo se describe al invertir?",
        t: "select",
        o: ["Conservador", "Moderado", "Arriesgado", "No sabe"],
        xp: 10,
      },
      {
        k: "reaccion",
        l: "Si su inversión baja 15 % en un año, ¿qué haría?",
        t: "select",
        o: ["Retiraría todo", "Esperaría a que se recupere", "Aportaría más", "No sabe"],
        xp: 10,
      },
      {
        k: "emergencia",
        l: "¿Tiene un fondo de emergencia de 3 a 6 meses de gastos?",
        t: "select",
        o: ["Sí", "Parcial", "No"],
        xp: 10,
      },
      { k: "deudas", l: "Deudas que paga hoy (tarjetas, préstamos…)", t: "text", xp: 5 },
      {
        k: "costoEvento",
        l: "Si no empieza a invertir hoy, ¿cómo cubriría esa meta?",
        t: "text",
        xp: 15,
      },
      {
        k: "objecion",
        l: "Objeción principal",
        t: "select",
        o: ["Ninguna", "No tengo dinero ahora", "Lo tengo que pensar", "Desconfío de las inversiones", "Ya tengo ahorros", "Otra"],
        xp: 10,
      },
    ],
  },
];

/**
 * Campos de la gestión: ya no son una sección de la ficha, se llenan desde
 * "+ acciones" (registrar contacto, agendar reunión, notas) o en el pre-cierre.
 */
export const CAMPOS_GESTION: readonly Campo[] = [
  { k: "contactos", l: "Historial de contactos (mínimo 5 antes de dar por perdido)", t: "contactos", xp: 10 },
  { k: "prox", l: "Próximo contacto", t: "date", xp: 10 },
  { k: "proxTxt", l: "¿Qué le aportas en ese contacto?", t: "text", xp: 10, ph: "Un dato, un caso real, una novedad" },
  { k: "reunion", l: "Próxima reunión (fecha y hora)", t: "datetime-local", xp: 0, noCount: true },
  { k: "reunionModo", l: "Modalidad de la reunión", t: "select", o: ["presencial", "zoom", "meet"], xp: 0, noCount: true },
  { k: "reunionLugar", l: "¿Dónde? (lugar)", t: "text", xp: 0, noCount: true, ph: "Su oficina, cafetería…" },
  { k: "reunionLink", l: "Link de la reunión", t: "text", xp: 0, noCount: true, ph: "https://zoom.us/j/… o https://meet.google.com/…" },
  { k: "notas", l: "Notas", t: "textarea", xp: 5 },
  { k: "gana", l: "¿Qué gana frente a su inversión actual?", t: "textarea", xp: 0, solo: "cambio", noCount: true },
  { k: "tipoPlan", l: "Tipo de plan", t: "select", o: TIPOS_PLAN, xp: 0, noCount: true },
  { k: "plazo", l: "Plazo del plan (años)", t: "number", xp: 0, noCount: true, min: 1, max: 50 },
  { k: "precio", l: "Aporte del plan (USD; mensual si es regular, total si es único)", t: "number", xp: 0, noCount: true, min: 0 },
];

/** Todos los campos de la ficha (misiones + gestión). */
export const CAMPOS_FICHA: readonly Campo[] = [...MISIONES.flatMap((m) => m.campos), ...CAMPOS_GESTION];
