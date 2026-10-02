/**
 * Referidos: relación con quien refiere y la cadena de mensajes que el
 * asesor activa paso a paso. Editables.
 *
 * `frase` se usa en el mensaje: "{referidor}, su amiga, me compartió su contacto".
 * Vacía = no se menciona la relación.
 */
export const RELACIONES: readonly { l: string; frase: string }[] = [
  { l: "Amigo", frase: "su amigo" },
  { l: "Amiga", frase: "su amiga" },
  { l: "Familiar", frase: "su familiar" },
  { l: "Pareja", frase: "su pareja" },
  { l: "Compañero de trabajo", frase: "su compañero de trabajo" },
  { l: "Compañera de trabajo", frase: "su compañera de trabajo" },
  { l: "Jefe", frase: "su jefe" },
  { l: "Jefa", frase: "su jefa" },
  { l: "Vecino o vecina", frase: "" },
  { l: "Cliente mío", frase: "" },
  { l: "Otro", frase: "" },
];

/**
 * Cadena de mensajes para un referido. Variables:
 *   {nombre} primer nombre del referido · {asesor} tu nombre
 *   {referidor} primer nombre de quien lo refirió · {relacion} ", su amiga," o vacío
 * La asesoría de la primera reunión NO es para vender: es para conocer su situación.
 */
export const CADENA_REFERIDO: readonly { l: string; t: string; opcional?: boolean }[] = [
  {
    l: "Presentación",
    t: "¡Hola, {saludo}! ¿Tengo el gusto de hablar con {nombre}? Soy {asesor}, {rol}. {referidor}{relacion} me compartió su contacto y me pidió que le escribiera. ¿Es usted?",
  },
  {
    l: "La asesoría de regalo",
    t: "¡Qué gusto saludarle, {nombre}! Le cuento: con {referidor} hemos estado trabajando en opciones para optimizar sus finanzas y proteger su patrimonio, y quiso regalarle una asesoría personalizada con nosotros. No es para venderle nada: en esta primera reunión solo quiero conocer a fondo su situación y lo que es importante para usted. ¿Qué día y a qué hora tendría disponibilidad?",
  },
  {
    l: "Si no responde",
    t: "Hola {nombre}, {saludo}. Le escribo nuevamente de parte de {referidor}. ¿Le queda bien algún día de esta semana para la asesoría? Son unos 30 minutos y es sin ningún compromiso.",
    opcional: true,
  },
];
