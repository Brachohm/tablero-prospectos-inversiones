/**
 * Definición de la ficha: tipos, etapas, motivos y misiones con sus campos.
 *
 * Los pesos de XP y las etapas son PROPUESTAS del asesor, no datos de ninguna aseguradora:
 * ajustarlos aquí. No cambiar la clave `k` de un campo existente: es la que
 * se guarda en las fichas.
 */
import type { Campo, Mision, MotivoId, Tipo } from "../domain/tipos";
import { RELACIONES } from "./referidos";
import { RANGOS_INGRESO } from "./finanzas";

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

/** Checklist de conocimiento del cliente (KYC) antes de emitir (booleanos `kyc_*`). Editable. */
export const KYC: readonly { k: string; l: string }[] = [
  { k: "kyc_cedula", l: "Copia de cédula vigente" },
  { k: "kyc_formulario", l: "Formulario de conocimiento del cliente lleno y firmado" },
  { k: "kyc_fondos", l: "Origen de los fondos declarado (y respaldo si el monto lo pide)" },
  { k: "kyc_perfil", l: "Cuestionario de perfil de riesgo firmado" },
  { k: "kyc_pep", l: "Preguntó si es persona expuesta políticamente (PEP)" },
  { k: "kyc_beneficiarios", l: "Beneficiarios definidos" },
  { k: "kyc_servicio", l: "Planilla de servicio básico (dirección)" },
];

/** Metas de inversión. */
export const METAS = [
  "Retiro o jubilación",
  "Educación de los hijos",
  "Comprar vivienda",
  "Crear patrimonio",
  "Fondo de emergencia",
  "Otro",
] as const;

/** Plazos para las metas. */
export const HORIZONTES = ["Menos de 3 años", "3 a 5 años", "5 a 10 años", "10 a 20 años", "Más de 20 años"] as const;

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
      {
        k: "estadoCivil",
        l: "Estado civil",
        t: "select",
        o: ["Soltero(a)", "Casado(a)", "Unión de hecho", "Divorciado(a)", "Viudo(a)"],
        xp: 5,
        grupo: "Su situación de vida",
      },
      { k: "hijosEdades", l: "Edades de los hijos", t: "text", xp: 5, ph: "3 y 7 años (vacío si no tiene)", noCount: true, grupo: "Su situación de vida" },
      {
        k: "tipoIngreso",
        l: "¿Cómo genera sus ingresos?",
        t: "select",
        o: ["Relación de dependencia", "Independiente o profesional", "Negocio propio", "Jubilado(a)", "Otro"],
        xp: 10,
        grupo: "Su situación de vida",
      },
      {
        k: "ingresoEstable",
        l: "Su ingreso es…",
        t: "select",
        o: ["Estable", "Variable", "Muy variable"],
        xp: 5,
        grupo: "Su situación de vida",
      },
      { k: "iess", l: "¿Aporta al IESS?", t: "select", o: ["Sí", "Voluntario", "No"], xp: 5, grupo: "Su situación de vida" },
      { k: "iessAnios", l: "Años de aportes al IESS", t: "number", xp: 5, min: 0, max: 60, cuando: { k: "iess", v: "Sí" }, grupo: "Su situación de vida" },
      { k: "fechaCobro", l: "¿Qué días cobra? (sueldo, décimos, utilidades)", t: "text", xp: 5, ph: "Quincenal; décimos en agosto y diciembre", noCount: true, grupo: "Su situación de vida" },
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
        grupo: "Hoy",
      },
      { k: "porque", l: "¿Qué lo hizo pensar en invertir ahora?", t: "text", xp: 15, solo: "nuevo", ph: "Con sus palabras", grupo: "Hoy" },
      { k: "institucion", l: "¿Dónde invierte hoy?", t: "text", xp: 10, solo: "cambio", grupo: "Su inversión actual", ph: "Banco, aseguradora, fondo, casa de valores…" },
      { k: "producto", l: "¿Qué producto tiene?", t: "text", xp: 5, solo: "cambio", grupo: "Su inversión actual", ph: "Plazo fijo, fondo, unit linked…" },
      { k: "tiempoCon", l: "¿Cuánto tiempo lleva con esa inversión?", t: "text", xp: 5, solo: "cambio", grupo: "Su inversión actual" },
      { k: "saldoActual", l: "Saldo acumulado hoy (USD)", t: "number", xp: 10, solo: "cambio", grupo: "Su inversión actual", min: 0 },
      { k: "aporteActual", l: "Lo que aporta hoy (USD al mes)", t: "number", xp: 5, solo: "cambio", grupo: "Su inversión actual", min: 0 },
      { k: "motivos", l: "Motivos de inconformidad", t: "motivos", xp: 10, solo: "cambio", grupo: "Su inversión actual" },
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
      { k: "meta", l: "¿Para qué quiere invertir? (meta principal)", t: "select", o: METAS, xp: 15, grupo: "Sus metas" },
      { k: "edadRetiro", l: "¿A qué edad quiere retirarse?", t: "number", xp: 10, min: 40, max: 90, cuando: { k: "meta", v: "Retiro o jubilación" }, grupo: "Sus metas" },
      { k: "rentaRetiro", l: "¿Con cuánto al mes quiere vivir en su retiro? (USD de hoy)", t: "number", xp: 10, min: 0, cuando: { k: "meta", v: "Retiro o jubilación" }, grupo: "Sus metas" },
      { k: "metaMonto", l: "¿Cuánto necesita para esa meta? (USD)", t: "number", xp: 10, min: 0, ph: "En retiro, vacío = se calcula con la renta", grupo: "Sus metas" },
      {
        k: "horizonte",
        l: "¿En cuánto tiempo necesitará ese dinero?",
        t: "select",
        o: HORIZONTES,
        xp: 10,
        grupo: "Sus metas",
      },
      {
        k: "metaFlex",
        l: "Si la meta llega tarde o con menos, ¿qué pasa?",
        t: "select",
        o: ["Es indispensable: tiene que llegar", "Puede esperar un poco", "Es un deseo, no una necesidad"],
        xp: 10,
        grupo: "Sus metas",
      },
      { k: "meta2", l: "Segunda meta (opcional)", t: "select", o: METAS, xp: 0, noCount: true, grupo: "Sus metas" },
      { k: "meta2Monto", l: "Monto de la segunda meta (USD)", t: "number", xp: 0, noCount: true, min: 0, cuando: { k: "meta2", v: "*" }, grupo: "Sus metas" },
      { k: "meta2Plazo", l: "Plazo de la segunda meta", t: "select", o: HORIZONTES, xp: 0, noCount: true, cuando: { k: "meta2", v: "*" }, grupo: "Sus metas" },
      { k: "meta3", l: "Tercera meta (opcional)", t: "select", o: METAS, xp: 0, noCount: true, cuando: { k: "meta2", v: "*" }, grupo: "Sus metas" },
      { k: "meta3Monto", l: "Monto de la tercera meta (USD)", t: "number", xp: 0, noCount: true, min: 0, cuando: { k: "meta3", v: "*" }, grupo: "Sus metas" },
      { k: "meta3Plazo", l: "Plazo de la tercera meta", t: "select", o: HORIZONTES, xp: 0, noCount: true, cuando: { k: "meta3", v: "*" }, grupo: "Sus metas" },
      { k: "aporte", l: "¿Cuánto puede invertir al mes? (USD)", t: "number", xp: 10, min: 0, grupo: "Sus metas" },
      { k: "capital", l: "Capital disponible para un aporte único (USD)", t: "number", xp: 10, min: 0, grupo: "Sus metas" },
      {
        k: "fuenteUnico",
        l: "¿De dónde saldría ese capital?",
        t: "select",
        o: ["Ahorros", "Liquidación o jubilación", "Herencia", "Venta de un bien", "Utilidades o negocio", "Otro"],
        xp: 5,
        cuando: { k: "capital", v: "*" },
        grupo: "Sus metas",
      },
      {
        k: "costoEvento",
        l: "Si no empieza a invertir hoy, ¿cómo cubriría esa meta?",
        t: "text",
        xp: 15,
        grupo: "Sus metas",
      },
      { k: "decideCon", l: "¿Quién más decide con usted?", t: "text", xp: 10, ph: "Nadie, su pareja, un hijo…", grupo: "Decisión y confianza" },
      {
        k: "confianza",
        l: "¿Qué le haría confiar en un plan?",
        t: "select",
        o: ["Saber quién lo emite y cómo está regulado", "Ver su estado de cuenta cuando quiera", "Que su asesor le dé seguimiento", "La recomendación de alguien de confianza", "Otro"],
        xp: 10,
        grupo: "Decisión y confianza",
      },
      {
        k: "malaExp",
        l: "¿Ha tenido una mala experiencia con una inversión o un asesor?",
        t: "select",
        o: ["No", "Sí, con una inversión", "Sí, con un asesor"],
        xp: 10,
        grupo: "Decisión y confianza",
      },
      { k: "malaExpDetalle", l: "¿Qué pasó?", t: "text", xp: 5, cuando: { k: "malaExp", v: "Sí, con una inversión" }, grupo: "Decisión y confianza" },
      { k: "malaExpDetalle2", l: "¿Qué pasó con ese asesor?", t: "text", xp: 5, cuando: { k: "malaExp", v: "Sí, con un asesor" }, grupo: "Decisión y confianza" },
      {
        k: "objecion",
        l: "Objeción principal",
        t: "select",
        o: ["Ninguna", "No tengo dinero ahora", "Lo tengo que pensar", "Desconfío de las inversiones", "Ya tengo ahorros", "Otra"],
        xp: 10,
        grupo: "Decisión y confianza",
      },
    ],
  },
  {
    id: "fin",
    titulo: "Flujo y patrimonio",
    campos: [
      { k: "ingresoRango", l: "Ingreso mensual neto del hogar", t: "select", o: RANGOS_INGRESO.map((r) => r.l), xp: 10, grupo: "Flujo del mes" },
      { k: "ingreso", l: "Ingreso exacto, si lo sabe (USD al mes)", t: "number", xp: 0, noCount: true, min: 0, grupo: "Flujo del mes" },
      { k: "gastos", l: "Gastos fijos del hogar (USD al mes, aproximado)", t: "number", xp: 10, min: 0, ph: "Vivienda, comida, colegios, servicios…", grupo: "Flujo del mes" },
      { k: "deudaCuota", l: "Cuotas de deudas que paga al mes (USD)", t: "number", xp: 10, min: 0, ph: "0 si no tiene", grupo: "Flujo del mes" },
      { k: "deudas", l: "¿Qué deudas son?", t: "text", xp: 5, ph: "Tarjeta, préstamo de auto, hipoteca…", cuando: { k: "deudaCuota", v: "*" }, grupo: "Flujo del mes" },
      {
        k: "deudaTasa",
        l: "Tasa de interés de su deuda más cara",
        t: "select",
        o: ["Menos de 10 %", "10 a 15 %", "Más de 15 % (como una tarjeta)", "No sabe"],
        xp: 5,
        cuando: { k: "deudaCuota", v: "*" },
        grupo: "Flujo del mes",
      },
      {
        k: "emergencia",
        l: "¿Tiene un fondo de emergencia de 3 a 6 meses de gastos?",
        t: "select",
        o: ["Sí", "Parcial", "No"],
        xp: 10,
        grupo: "Lo que tiene y lo que debe",
      },
      { k: "ahorros", l: "Ahorros e inversiones que tiene hoy (USD)", t: "number", xp: 10, min: 0, grupo: "Lo que tiene y lo que debe" },
      { k: "vivienda", l: "Su vivienda", t: "select", o: ["Propia, pagada", "Propia, con hipoteca", "Arrienda", "Vive con familia"], xp: 5, grupo: "Lo que tiene y lo que debe" },
      {
        k: "seguroVida",
        l: "¿Tiene seguro de vida?",
        t: "select",
        o: ["Sí, propio", "Solo el de su trabajo", "No"],
        xp: 10,
        grupo: "Lo que tiene y lo que debe",
      },
    ],
  },
  {
    id: "riesgo",
    titulo: "Perfil de riesgo",
    campos: [
      {
        k: "perfil",
        l: "¿Cómo se describe al invertir?",
        t: "select",
        o: ["Conservador", "Moderado", "Arriesgado", "No sabe"],
        xp: 10,
      },
      {
        k: "rq_experiencia",
        l: "¿En qué ha invertido antes?",
        t: "select",
        o: ["Nunca he invertido", "Pólizas o depósitos a plazo", "Fondos, acciones o bonos"],
        xp: 10,
      },
      { k: "rq_resultado", l: "¿Cómo le fue?", t: "select", o: ["Bien", "Regular", "Mal"], xp: 5, cuando: { k: "rq_experiencia", v: "Fondos, acciones o bonos" } },
      {
        k: "reaccion",
        l: "Si su inversión baja 15 % en un año, ¿qué haría?",
        t: "select",
        o: ["Retiraría todo", "Esperaría a que se recupere", "Aportaría más", "No sabe"],
        xp: 10,
      },
      {
        k: "rq_prioridad",
        l: "¿Qué valora más de su inversión?",
        t: "select",
        o: ["Que no baje nunca", "Poder sacarlo cuando quiera", "Un equilibrio entre crecer y no bajar", "Que crezca lo más posible"],
        xp: 10,
      },
      {
        k: "rq_peso",
        l: "¿Qué parte de todos sus ahorros sería esta inversión?",
        t: "select",
        o: ["Menos del 25 %", "Entre 25 y 50 %", "Más del 50 %"],
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
