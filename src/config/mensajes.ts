/**
 * Mensajes de seguimiento por fase del prospecto y recordatorios de reunión.
 * Trato de usted: cálido, profesional y respetuoso.
 * Editables. Variables disponibles (si falta el dato, quedan vacías):
 *   {nombre}     primer nombre del prospecto
 *   {asesor}     cómo te gusta que te llamen (Configuración → Perfil)
 *   {rol}        tu rol (Configuración → Perfil)
 *   {referente}  quien lo refirió
 *   {porque}     lo que lo hizo pensar en contratar / lo que le falla hoy
 *   {plan}       " (plan Familiar)" o vacío
 *   {precio}     " por $95 al mes" o vacío
 *   {aporte}     lo que le aportas en el próximo contacto
 *   {cuando}     "hoy", "mañana" o "el jueves 9 de octubre"
 *   {hora}       "10:30"
 *   {lugar}      " en su oficina" o vacío
 *   {renovacion} fecha de renovación del cliente
 *   {saludo}     "buenos días", "buenas tardes" o "buenas noches" (según la hora)
 *   {deseo}      "un excelente día", "una excelente tarde" o "una linda noche"
 * Nada de esto promete coberturas: lo que dependa de la aseguradora se valida antes.
 */
export interface Plantilla {
  id: string;
  /** Nombre corto del mensaje. */
  l: string;
  t: string;
  /** Solo si la ficha cumple esta condición (ver `CONDICIONES` en domain/mensajes.ts). */
  si?: "referido" | "porque" | "aporte" | "insistente" | "renovacion" | "hoy";
  /** Solo para esta objeción principal. */
  objecion?: string;
}

/** Recordatorio 2: se envía con máximo una hora de anticipación (el Inicio avisa cuándo). */
export const RECORDATORIO_2: Plantilla = {
  id: "r-ahora",
  l: "Recordatorio 2 (1 hora antes)",
  t: "Hola {nombre}, {saludo}. Le recuerdo que en un momento, a las {hora}, nos vemos{lugar}. Será un gusto atenderle.",
};

/** Recordatorio 1 (lo envías tú): aparecen cuando hay una próxima reunión agendada. */
export const RECORDATORIOS_REUNION: readonly Plantilla[] = [
  {
    id: "r-confirmar",
    l: "Confirmar reunión",
    t: "Hola {nombre}, {saludo}. Soy {asesor}. Le escribo para confirmar nuestra reunión {cuando} a las {hora}{lugar}. ¿Le sigue quedando bien?",
  },
  {
    id: "r-hoy",
    l: "Recordatorio de hoy",
    t: "Hola {nombre}, {saludo}. Le recuerdo que hoy nos vemos a las {hora}{lugar}. Quedo atento.",
    si: "hoy",
  },
  {
    id: "r-mover",
    l: "Reprogramar",
    t: "Hola {nombre}, {saludo}. ¿Sería posible mover nuestra reunión de {cuando} a las {hora}? Por favor, indíqueme qué día y hora le quedan mejor.",
  },
];

/** Mensajes por etapa de la ficha. */
export const MENSAJES_ETAPA: Readonly<Record<string, readonly Plantilla[]>> = {
  "Primer contacto": [
    {
      id: "n-referido",
      l: "Primer contacto (referido)",
      t: "Hola {nombre}, {saludo}. Soy {asesor}, {rol}. {referente} me compartió su contacto. Me gustaría conocer qué necesita en salud para ver cómo puedo ayudarle. ¿Cuándo le queda bien conversar 15 minutos?",
      si: "referido",
    },
    {
      id: "n-primero",
      l: "Primer contacto",
      t: "Hola {nombre}, {saludo}. Soy {asesor}, {rol}. Me gustaría hacerle un par de preguntas para entender qué necesita en salud y ver cómo puedo ayudarle. ¿Cuándo le queda bien conversar 15 minutos?",
    },
  ],
  "Cuadrar cita": [
    {
      id: "n-agendar",
      l: "Agendar reunión",
      t: "Hola {nombre}, {saludo}. ¿Le parece si nos reunimos esta semana para conversar sobre su seguro de salud? Por favor, indíqueme qué día y hora le quedan mejor.",
    },
    {
      id: "c-opciones",
      l: "Proponer dos horarios",
      t: "Hola {nombre}, {saludo}. Para no quitarle mucho tiempo, le propongo dos opciones para conversar: ¿le queda mejor entre semana en la mañana o en la tarde? Son unos 30 minutos.",
    },
  ],
  "Primera reunión": [
    {
      id: "m1-preparar",
      l: "Antes de la primera reunión",
      t: "Hola {nombre}, {saludo}. Soy {asesor}. En nuestra reunión la idea es conocer bien su situación y la de su familia: todavía no vamos a hablar de productos. Si tiene un seguro actual, le agradecería tener a mano su póliza o su tabla de coberturas.",
    },
  ],
  "Segunda reunión": [
    {
      id: "d-gracias",
      l: "Gracias por la conversación",
      t: "Hola {nombre}, {saludo}. Muchas gracias por su tiempo. Me quedo con lo que me contó: {porque}. Estoy preparando una propuesta pensada en eso y se la presento pronto.",
      si: "porque",
    },
    {
      id: "d-gracias2",
      l: "Gracias por la conversación",
      t: "Hola {nombre}, {saludo}. Muchas gracias por su tiempo. Con lo que conversamos estoy preparando una propuesta a su medida. ¿Qué día le queda bien para presentársela?",
    },
    {
      id: "d-dato",
      l: "Pedir un dato pendiente",
      t: "Hola {nombre}, {saludo}. Para preparar bien su propuesta me falta un dato: ",
    },
  ],
  Seguimiento: [
    {
      id: "p-revisaste",
      l: "¿Revisó la propuesta?",
      t: "Hola {nombre}, {saludo}. ¿Pudo revisar la propuesta{plan}? Si le queda alguna duda sobre coberturas, carencias o el precio, con gusto se la aclaro.",
    },
    {
      id: "p-resumen",
      l: "Resumen de la propuesta",
      t: "Hola {nombre}, {saludo}. Le resumo lo que conversamos: lo que más le importaba era {porque}, y la propuesta{plan}{precio} está pensada para eso. ¿Le parece si avanzamos?",
      si: "porque",
    },
    {
      id: "o-precio",
      l: "Objeción: precio",
      objecion: "Precio",
      t: "Hola {nombre}, {saludo}. Estuve pensando en lo que me comentó sobre el precio. Si le parece, revisamos juntos otra opción de plan o de deducible para que se ajuste mejor a su presupuesto, sin perder lo que más le importa.",
    },
    {
      id: "o-tengo",
      l: "Objeción: ya tengo seguro",
      objecion: "Ya tengo seguro",
      t: "Hola {nombre}, {saludo}. No se trata de cambiar por cambiar. Si me comparte su póliza actual, le preparo una comparación honesta: si la suya le conviene más, se lo voy a decir.",
    },
    {
      id: "o-pensar",
      l: "Objeción: lo tengo que pensar",
      objecion: "Lo tengo que pensar",
      t: "Hola {nombre}, {saludo}. Por supuesto, es una decisión importante. ¿Hay algo puntual que le genere duda? Con gusto se lo aclaro para que decida con toda la información.",
    },
    {
      id: "o-antiguedad",
      l: "Objeción: antigüedad o carencias",
      objecion: "Perder antigüedad o carencias",
      t: "Hola {nombre}, {saludo}. Entiendo su preocupación por la antigüedad y las carencias. Antes de que decida lo validamos con la aseguradora para su caso, y su póliza actual se mantiene hasta que la nueva esté vigente.",
    },
    {
      id: "o-general",
      l: "Resolver dudas",
      t: "Hola {nombre}, {saludo}. Me quedé pensando en sus dudas sobre la propuesta. ¿Le parece si las revisamos juntos en una llamada corta?",
    },
    {
      id: "s-aporte",
      l: "Aportar valor",
      t: "Hola {nombre}, {saludo}. ¿Cómo está? Le escribo porque quería compartirle algo que le puede servir: {aporte}",
      si: "aporte",
    },
    {
      id: "s-retomar",
      l: "Retomar",
      t: "Hola {nombre}, {saludo}. ¿Cómo está? Quedamos en retomar el tema de su seguro de salud. ¿Le parece si conversamos esta semana?",
    },
    {
      id: "s-ultimo",
      l: "Sin presionar",
      t: "Hola {nombre}, {saludo}. No quiero ser insistente: si ahora no es el momento, lo entiendo perfectamente. ¿Prefiere que le escriba más adelante?",
      si: "insistente",
    },
  ],
  "Pre-cierre": [
    {
      id: "pc-confirmar",
      l: "Confirmar lo elegido",
      t: "Hola {nombre}, {saludo}. Le confirmo lo que eligió{plan}{precio}. Le envío los requisitos para la emisión y le acompaño en cada paso.",
    },
  ],
  Cerrado: [
    {
      id: "c-bienvenida",
      l: "Bienvenida",
      t: "Hola {nombre}, {saludo}. Le doy la más cordial bienvenida a SaludSA. Gracias por su confianza. Ante cualquier duda sobre cómo usar su plan o un reembolso, escríbame aquí y con gusto le acompaño.",
    },
    {
      id: "c-referidos",
      l: "Pedir referidos",
      t: "Hola {nombre}, {saludo}. Me alegra mucho haberle ayudado con su plan. Si conoce a alguien a quien le pueda servir una asesoría como la suya, ¿me compartiría su contacto?",
    },
    {
      id: "c-renovacion",
      l: "Antes de la renovación",
      t: "Hola {nombre}, {saludo}. Su plan renueva el {renovacion}. Antes de esa fecha me gustaría revisar con usted si sigue siendo el más adecuado. ¿Cuándo le queda bien?",
      si: "renovacion",
    },
  ],
  Perdido: [
    {
      id: "x-reactivar",
      l: "Reactivar",
      t: "Hola {nombre}, {saludo}. ¿Cómo está? Hace un tiempo conversamos sobre su seguro de salud. Si en algún momento desea revisarlo de nuevo, quedo a sus órdenes.",
    },
  ],
};
