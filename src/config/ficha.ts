/**
 * Definición de la ficha: tipos, etapas, motivos y misiones con sus campos.
 *
 * Los pesos de XP y las etapas son PROPUESTAS del asesor, no datos de SaludSA:
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
  { id: "contrato", l: "Contrato" },
  { id: "pre", l: "Ficha de preexistencias" },
];
export const TIPOS_DOC_CIERRE = ["image/jpeg", "application/pdf"] as const;
export const MAX_MB_DOC_CIERRE = 15;

/** De dónde llegó un contacto o prospecto (para filtrar en el Centro de Gestión). */
export const ORIGENES = ["Referido", "Redes sociales", "Contacto en frío", "Evento", "Base de datos", "Otro"] as const;

/**
 * Etapas en las que el nuevo prospecto ya va a contratar: desde aquí se
 * despliega la declaración de preexistencias. Antes, la ficha muestra solo
 * la venta consultiva.
 */
export const ETAPAS_COTIZACION = ["Pre-cierre", "Venta exitosa", "Cerrado"] as const;
export const ETAPA_PERDIDO = "Perdido";

export const TIPOS: Record<Tipo, { n: string; ic: string; desc: string }> = {
  nuevo: { n: "Nuevo prospecto", ic: "🚀", desc: "Quiere contratar su seguro de salud." },
  cambio: {
    n: "Persona asegurada",
    ic: "🔄",
    desc: "Está inconforme con su seguro actual y quiere cambiarse.",
  },
};

export const MOTIVOS: readonly { id: MotivoId; ic: string; l: string }[] = [
  { id: "cobertura", ic: "🛡️", l: "Cobertura" },
  { id: "reembolsos", ic: "🧾", l: "Reembolsos" },
  { id: "precio", ic: "💲", l: "Precio o alzas" },
  { id: "deducibles", ic: "📉", l: "Deducibles y copagos" },
  { id: "red", ic: "🏥", l: "Red de médicos y clínicas" },
  { id: "atencion", ic: "📞", l: "Atención y servicio" },
  { id: "otro", ic: "💬", l: "Otro" },
];

/** Tipo de póliza actual (cambio de seguro). Corporativo: de su empresa o de donde estudia. */
export const TIPOS_POLIZA = ["Individual", "Masivo", "Corporativo"] as const;

/** Edad (años) desde la que aplican los recordatorios de "edad mayor". */
export const EDAD_MAYOR = 56;

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
      { k: "ocupacion", l: "Ocupación", t: "text", xp: 10, ph: "Contador, chofer, docente, enfermera…" },
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
      { k: "cobertura", l: "¿Qué cobertura tiene hoy, si alguna?", t: "text", xp: 10, solo: "nuevo", ph: "IESS, ninguna…" },
      { k: "porque", l: "¿Qué lo hizo pensar en contratar ahora?", t: "text", xp: 15, solo: "nuevo", ph: "Con sus palabras" },
      { k: "aseguradora", l: "Aseguradora actual", t: "text", xp: 10, solo: "cambio" },
      { k: "tiempoCon", l: "¿Cuánto tiempo lleva con ella?", t: "text", xp: 5, solo: "cambio" },
      {
        k: "tipoPoliza",
        l: "¿Su seguro actual es individual, masivo o corporativo?",
        t: "select",
        o: [...TIPOS_POLIZA],
        xp: 10,
        solo: "cambio",
      },
      { k: "primaActual", l: "Lo que paga hoy (USD al mes)", t: "number", xp: 10, solo: "cambio", min: 0 },
      { k: "motivos", l: "Motivos de inconformidad", t: "motivos", xp: 10, solo: "cambio" },
      {
        k: "cob_que",
        l: "¿Qué le faltó o no le cubrieron?",
        t: "select",
        o: [
          "Una cirugía o procedimiento",
          "Medicamentos",
          "Maternidad o pediatría",
          "Exámenes y diagnóstico por imagen",
          "Tratamiento crónico",
          "Otro",
        ],
        xp: 5,
        solo: "cambio",
        motivo: "cobertura",
      },
      {
        k: "cob_porque",
        l: "¿Por qué no se lo cubrieron?",
        t: "select",
        o: [
          "Exclusión de la póliza",
          "Preexistencia",
          "Período de carencia",
          "Tope o límite agotado",
          "Nunca supo si estaba cubierto",
          "Otro",
        ],
        xp: 10,
        solo: "cambio",
        motivo: "cobertura",
      },
      { k: "cob_monto", l: "¿Cuánto pagó de su bolsillo? (USD)", t: "number", xp: 5, solo: "cambio", motivo: "cobertura", min: 0 },
      {
        k: "cob_pendiente",
        l: "¿Tiene un procedimiento o tratamiento pendiente?",
        t: "select",
        o: ["No", "Sí"],
        xp: 10,
        solo: "cambio",
        motivo: "cobertura",
      },
      {
        k: "reem_dias",
        l: "¿Cuánto tarda en recibir un reembolso?",
        t: "select",
        o: ["Menos de 15 días", "15 a 30 días", "30 a 60 días", "Más de 60 días"],
        xp: 5,
        solo: "cambio",
        motivo: "reembolsos",
      },
      {
        k: "reem_rech",
        l: "¿Le han rechazado reembolsos?",
        t: "select",
        o: ["Nunca", "A veces", "Seguido"],
        xp: 5,
        solo: "cambio",
        motivo: "reembolsos",
      },
      {
        k: "reem_porque",
        l: "¿Por qué suelen rechazarlos o demorarlos?",
        t: "select",
        o: [
          "Falta de documentos",
          "Exclusión o no cobertura",
          "Monto menor al esperado",
          "Sin explicación clara",
          "No sabe",
        ],
        xp: 10,
        solo: "cambio",
        motivo: "reembolsos",
      },
      {
        k: "reem_proceso",
        l: "¿Conoce el proceso y qué documentos pedir?",
        t: "select",
        o: ["Sí", "Más o menos", "No"],
        xp: 5,
        solo: "cambio",
        motivo: "reembolsos",
      },
      { k: "pre_alza", l: "Alza en su última renovación (%)", t: "number", xp: 5, solo: "cambio", motivo: "precio" },
      {
        k: "pre_freq",
        l: "¿Con qué frecuencia sube?",
        t: "select",
        o: ["Cada año", "Solo al cambiar de rango de edad", "De forma imprevista", "No sabe"],
        xp: 5,
        solo: "cambio",
        motivo: "precio",
      },
      {
        k: "pre_expl",
        l: "¿Le explicaron por qué sube?",
        t: "select",
        o: ["Sí", "Parcialmente", "No"],
        xp: 10,
        solo: "cambio",
        motivo: "precio",
      },
      { k: "pre_limite", l: "Máximo que podría pagar al mes (USD)", t: "number", xp: 10, solo: "cambio", motivo: "precio", min: 0 },
      { k: "ded_monto", l: "Deducible que paga por evento (USD)", t: "number", xp: 5, solo: "cambio", motivo: "deducibles", min: 0 },
      { k: "ded_copago", l: "Copago (porcentaje o monto)", t: "text", xp: 5, solo: "cambio", motivo: "deducibles" },
      {
        k: "ded_sorpresa",
        l: "¿Sabía de deducibles y copagos al contratar?",
        t: "select",
        o: ["Sí", "No", "No recuerda"],
        xp: 10,
        solo: "cambio",
        motivo: "deducibles",
      },
      {
        k: "ded_tope",
        l: "¿Se le han agotado topes anuales o por evento?",
        t: "select",
        o: ["Nunca", "Una vez", "Varias veces"],
        xp: 5,
        solo: "cambio",
        motivo: "deducibles",
      },
      {
        k: "ded_anual",
        l: "Pagado en deducibles y copagos el último año (USD)",
        t: "number",
        xp: 10,
        solo: "cambio",
        motivo: "deducibles",
        min: 0,
      },
      { k: "red_falta", l: "Médicos, clínicas o especialidades que no encuentra", t: "text", xp: 10, solo: "cambio", motivo: "red" },
      {
        k: "red_medico",
        l: "¿Tiene un médico o clínica de confianza que no quiere dejar?",
        t: "select",
        o: ["Sí", "No"],
        xp: 10,
        solo: "cambio",
        motivo: "red",
      },
      {
        k: "red_fuera",
        l: "¿Ha tenido que pagar fuera de la red?",
        t: "select",
        o: ["Nunca", "A veces", "Seguido"],
        xp: 5,
        solo: "cambio",
        motivo: "red",
      },
      {
        k: "ate_canal",
        l: "¿Dónde falla la atención?",
        t: "select",
        o: ["Autorizaciones", "Línea de atención", "Emergencias", "Su asesor", "Trámites administrativos", "Otro"],
        xp: 10,
        solo: "cambio",
        motivo: "atencion",
      },
      {
        k: "ate_frec",
        l: "¿Con qué frecuencia?",
        t: "select",
        o: ["Una vez", "A veces", "Siempre"],
        xp: 5,
        solo: "cambio",
        motivo: "atencion",
      },
      {
        k: "ate_asesor",
        l: "¿Su asesor actual lo acompaña?",
        t: "select",
        o: ["Sí, me acompaña", "Responde poco", "No tengo uno"],
        xp: 10,
        solo: "cambio",
        motivo: "atencion",
      },
      { k: "ate_ejemplo", l: "Último caso concreto", t: "text", xp: 5, solo: "cambio", motivo: "atencion" },
      { k: "otro_desc", l: "Descríbelo con sus palabras", t: "text", xp: 10, solo: "cambio", motivo: "otro" },
      { k: "grieta", l: "¿Qué le falla, con sus palabras?", t: "text", xp: 15, solo: "cambio" },
      { k: "renovacion", l: "Fecha de renovación o vencimiento de su póliza", t: "date", xp: 10, solo: "cambio" },
      { k: "exclus", l: "Exclusiones, carencias y preexistencias de su póliza actual", t: "textarea", xp: 15, solo: "cambio" },
      {
        k: "criterio",
        l: "¿Con qué criterio piensa elegir su seguro?",
        t: "select",
        o: ["Precio", "Cobertura", "Red de médicos", "Recomendación", "Aún no sabe"],
        xp: 10,
        solo: "nuevo",
      },
      {
        k: "contrato",
        l: "¿Cómo lo eligió cuando lo contrató?",
        t: "select",
        o: [
          "Por precio",
          "Por recomendación de un asesor",
          "Por su empresa",
          "Por cobertura, comparando opciones",
          "No recuerda",
        ],
        xp: 10,
        solo: "cambio",
      },
      {
        k: "uso",
        l: "¿Cómo lo ha usado?",
        t: "select",
        o: ["Casi no lo usa", "Lo usa seguido y le responde", "Lo usa seguido y le falla", "Lo usó en un evento grande"],
        xp: 10,
        solo: "cambio",
      },
      {
        k: "conoce",
        l: "¿Conoce su cobertura y su proceso de reembolso?",
        t: "select",
        o: ["Sí", "Más o menos", "No"],
        xp: 10,
        solo: "cambio",
      },
      {
        k: "declaro",
        l: "¿Declaró sus condiciones médicas al contratar?",
        t: "select",
        o: ["Sí", "No estoy seguro", "No"],
        xp: 10,
        solo: "cambio",
      },
      {
        k: "noPerder",
        l: "¿Qué no querría perder si cambia?",
        t: "text",
        xp: 15,
        solo: "cambio",
        ph: "Antigüedad, un tratamiento, su médico…",
      },
      { k: "ultimavez", l: "¿Qué pasó la última vez que usó un médico?", t: "text", xp: 10 },
      { k: "emergencia", l: "¿Qué haría si mañana hay una cirugía o emergencia?", t: "text", xp: 15 },
      {
        k: "costoEvento",
        l: "Si hoy hubiera una hospitalización o cirugía, ¿cuánto estima que costaría y quién lo pagaría?",
        t: "text",
        xp: 15,
      },
      {
        k: "objecion",
        l: "Objeción principal",
        t: "select",
        o: ["Ninguna", "Precio", "Ya tengo seguro", "Lo tengo que pensar", "Perder antigüedad o carencias", "Otra"],
        xp: 10,
      },
    ],
  },
  { id: "pre", titulo: "Declaración de preexistencias", solo: "nuevo", custom: true, campos: [] },
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
  { k: "gana", l: "¿Qué gana frente a su póliza actual?", t: "textarea", xp: 0, solo: "cambio", noCount: true },
  { k: "precio", l: "Valor a pagar mensual (USD)", t: "number", xp: 0, noCount: true, min: 0 },
];

/** Todos los campos de la ficha (misiones + gestión). */
export const CAMPOS_FICHA: readonly Campo[] = [...MISIONES.flatMap((m) => m.campos), ...CAMPOS_GESTION];
