/**
 * Configuración del asesor: su perfil y los mensajes editables (seguimiento
 * 1-2-3, saludos e invitación), con un adjunto opcional cada uno. Los
 * archivos se guardan aparte (tabla `archivos`, id `adj:<clave>`).
 */
import { ajustarSaludo, deseoHora, saludoMensaje } from "./inicio";
import { MENSAJES_CONFIG, PERFIL_INICIAL } from "../config/ajustes";
import { HERRAMIENTAS_INICIALES, type Herramientas } from "./herramientas";
import type { Jornada } from "./jornada";
import type { ObjetivoConfig } from "./objetivos";
import { sinEmojis } from "./texto";

export type ClaveMensaje =
  | "seg1"
  | "seg2"
  | "seg3"
  | "saludoTexto"
  | "saludoVideo"
  | "saludoFoto"
  | "presentacion"
  | "invitacion"
  | "ref1"
  | "ref2"
  | "ref3";

export interface Adjunto {
  nombre: string;
  tipo: string;
  bytes: number;
}

export interface Perfil {
  nombreCompleto: string;
  /** Cómo le gusta que le llamen: su nombre en los mensajes. */
  apodo: string;
  rol: string;
  /** Celular con WhatsApp del asesor. */
  celular?: string;
  correo?: string;
  /** Para qué hace este trabajo: se muestra en grande en el Inicio. */
  proposito?: string;
  /** Su foto (el archivo va aparte, id ID_FOTO): saludo a quien no le tiene registrado y membrete de los PDF. */
  foto?: Adjunto;
}

/** Id del archivo de la foto del asesor. */
export const ID_FOTO = "adj:fotoPerfil";

/** Tamaño máximo de la foto (5 MB). */
export const MAX_FOTO = 5 * 1024 * 1024;

export interface MensajeGuardado {
  texto: string;
  adjunto?: Adjunto;
}

/** Un solo documento con toda la configuración. */
export interface Ajustes {
  id: "ajustes";
  perfil: Perfil;
  mensajes: Partial<Record<ClaveMensaje, MensajeGuardado>>;
  /** WhatsApp y correo con los que se envía (ver domain/herramientas). */
  herramientas?: Herramientas;
  /** Fin de gestión de cada día. */
  jornadas?: Jornada[];
  /** Objetivos del mes (1 a 4) con su beneficio. */
  objetivos?: ObjetivoConfig[];
  /** Argumentos del sistema que el asesor ocultó (o guardó como suyos). */
  argumentosOcultos?: string[];
  creado: number;
  mod: number;
}

export function ajustesIniciales(ahora = 0): Ajustes {
  return { id: "ajustes", perfil: { ...PERFIL_INICIAL }, mensajes: {}, creado: ahora, mod: ahora };
}

export function perfilDe(a: Ajustes | undefined): Perfil {
  const p = a?.perfil;
  return {
    nombreCompleto: p?.nombreCompleto ?? "",
    apodo: p?.apodo?.trim() || PERFIL_INICIAL.apodo,
    rol: p?.rol?.trim() || PERFIL_INICIAL.rol,
    celular: p?.celular ?? "",
    correo: p?.correo ?? "",
    proposito: p?.proposito ?? "",
    ...(p?.foto ? { foto: p.foto } : {}),
  };
}

/**
 * Textos de fábrica de versiones anteriores (sin saludo según la hora). Si el
 * guardado es igual a uno de estos, se usa el texto nuevo: no se tocan los
 * que el asesor editó.
 */
const INICIALES_ANTERIORES: readonly string[] = [
  "Hola {nombre}, soy {asesor}. ¿Pudiste revisar lo que conversamos? Quedo atento a cualquier duda.",
  "Hola {nombre}, te comparto algo que te puede servir para cuidar tu salud y tu bolsillo. Si quieres, lo revisamos juntos en 15 minutos.",
  "Hola {nombre}, no quiero ser insistente. Si ahora no es el momento, lo entiendo. Cuando quieras retomar, aquí estoy. ¡Un abrazo!",
  "Hola {nombre}, ¡buenos días! Te escribo para saludarte y desearte un excelente día.",
  "Hola {nombre}, te comparto este video. ¡Que tengas un gran día!",
  "Hola {nombre}, ¡feliz día! Un saludo grande.",
  "Hola {nombre}, soy {asesor}, {rol}. Te invito a una reunión para conocer tu situación y lo que es importante para ti: {fecha} a las {hora}{lugar}. ¿Te queda bien?",
  // Con trato de tú (antes de pasar a usted)
  "Hola {nombre}, {saludo}. Soy {asesor}. ¿Pudiste revisar lo que conversamos? Quedo atento a cualquier duda.",
  "Hola {nombre}, {saludo}. Te comparto algo que te puede servir para cuidar tu salud y tu bolsillo. Si quieres, lo revisamos juntos en 15 minutos.",
  "Hola {nombre}, {saludo}. No quiero ser insistente: si ahora no es el momento, lo entiendo. Cuando quieras retomar, aquí estoy. ¡Un abrazo!",
  "Hola {nombre}, ¡{saludo}! Te escribo para saludarte y desearte {deseo}.",
  "Hola {nombre}, {saludo}. Te comparto este video. ¡Que tengas {deseo}!",
  "Hola {nombre}, ¡{saludo}! Un saludo grande y que tengas {deseo}.",
  "Hola {nombre}, {saludo}. Soy {asesor}, {rol}. Te invito a una reunión para conocer tu situación y lo que es importante para ti: {fecha} a las {hora}{lugar}. ¿Te queda bien?",
  "¡Hola, {saludo}! ¿Hablo con {nombre}? Soy {asesor}, {rol}. {referidor}{relacion} me compartió tu contacto y me pidió que te escribiera. ¿Eres tú?",
  "¡Qué gusto, {nombre}! Te cuento: con {referidor} hemos estado trabajando en opciones para optimizar sus finanzas y proteger su patrimonio, y quiso regalarte una asesoría personalizada con nosotros. No es para venderte nada: en esta primera reunión solo quiero conocer a fondo tu situación y lo que es importante para ti. ¿Qué día y a qué hora tienes disponibilidad?",
  "Hola {nombre}, {saludo}. Te escribo de nuevo de parte de {referidor}. ¿Te queda bien algún día de esta semana para la asesoría? Son unos 30 minutos y es sin ningún compromiso.",
];

export function mensajeDe(a: Ajustes | undefined, clave: ClaveMensaje): MensajeGuardado {
  const g = a?.mensajes?.[clave];
  const inicial = MENSAJES_CONFIG.find((m) => m.clave === clave)?.inicial ?? "";
  // Sin emojis (los guardados antes también): WhatsApp y el correo los muestran como signos raros.
  const guardado = g?.texto !== undefined ? sinEmojis(g.texto) : undefined;
  const texto = guardado === undefined || INICIALES_ANTERIORES.includes(guardado.trim()) ? sinEmojis(inicial) : guardado;
  return { texto, ...(g?.adjunto ? { adjunto: g.adjunto } : {}) };
}

/** Un saludo con video o foto solo se ofrece si tiene su archivo. */
export function saludoDisponible(a: Ajustes | undefined, clave: "saludoTexto" | "saludoVideo" | "saludoFoto"): boolean {
  return clave === "saludoTexto" || !!mensajeDe(a, clave).adjunto;
}

export function idArchivo(clave: ClaveMensaje): string {
  return "adj:" + clave;
}

/** Rellena {nombre}, {asesor}, {rol}, {fecha}, {hora}, {lugar}, {saludo} y {deseo}. Lo que falte queda vacío. */
export function rellenar(t: string, v: Record<string, string>): string {
  // {saludo} y {deseo} salen de la hora, y un saludo escrito a mano se ajusta a la hora.
  const hora = new Date().getHours();
  const vars: Record<string, string> = { saludo: saludoMensaje(hora), deseo: deseoHora(hora), ...v };
  return ajustarSaludo(t, hora)
    .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "")
    .replace(/Hola ,/g, "Hola,")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function primerNombre(s: string): string {
  return s.trim().split(/\s+/)[0] ?? "";
}

export function mb(bytes: number): string {
  return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + " MB";
}

/** Valida un archivo para un mensaje: tipo y tamaño. "" si está bien. */
export function errorAdjunto(f: { type: string; size: number }, acepta: "cualquiera" | "video" | "foto", max: number): string {
  if (acepta === "video" && !f.type.startsWith("video/")) return "Elige un video";
  if (acepta === "foto" && !f.type.startsWith("image/")) return "Elige una foto";
  if (f.size > max) return `El archivo pesa ${mb(f.size)}: el máximo es ${mb(max)}`;
  return "";
}

export function herramientasDe(a: Ajustes | undefined): Herramientas {
  return { ...HERRAMIENTAS_INICIALES, ...(a?.herramientas ?? {}) };
}

/** Celular y correo del asesor bien escritos. "" si está bien. */
export function errorPerfil(p: Perfil): string {
  if (!p.apodo.trim()) return "Escribe cómo te gusta que te llamen";
  if (p.celular?.trim() && p.celular.replace(/\D/g, "").length < 9) return "Revisa tu número de celular";
  if (p.correo?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo.trim())) return "Revisa tu correo electrónico";
  return "";
}

/** Pregunta de la invitación cuando aún no hay reunión agendada. */
export const PREGUNTA_DISPONIBILIDAD = "¿Qué día y a qué hora podría disponer de 30 minutos para tener la reunión?";

/**
 * Invitación lista para enviar. Con la reunión agendada lleva fecha, hora y
 * lugar; si no, quita esa parte (y su "¿Te queda bien?") y pregunta qué día
 * y a qué hora puede disponer de 30 minutos.
 */
export function textoInvitacion(plantilla: string, v: Record<string, string>, agendada: boolean): string {
  if (agendada) return rellenar(plantilla, v);
  let t = plantilla;
  if (/\{(fecha|hora|lugar)\}/.test(t)) {
    // Desde el ":" o la "," antes de la fecha hasta el final de esa frase.
    t = t.replace(/\s*[:,]?\s*[^.?!:]*\{(?:fecha|hora|lugar)\}[^.?!]*[.?!]?/, ".");
    t = t.replace(/\s*¿\s*(Te|Le) queda bien\s*\?/i, "");
  }
  t = rellenar(t, v).replace(/\.\s*\./g, ".").replace(/\s+\./g, ".");
  if (/¿[^?]*(d[ií]a|hora|disponib)[^?]*\?/i.test(t)) return t;
  return `${t.replace(/[\s,;:]+$/, "")}${/[.!?]$/.test(t.trim()) ? "" : "."} ${PREGUNTA_DISPONIBILIDAD}`;
}

/**
 * Saludo para quien no tiene tu número registrado: después de la primera
 * frase ("Hola Ana, ¡buenos días!") va tu presentación breve. Si el saludo ya
 * te nombra, no se repite.
 */
export function conPresentacion(saludo: string, presentacion: string, asesor: string): string {
  const p = presentacion.trim();
  if (!p) return saludo;
  if (asesor.trim() && saludo.toLowerCase().includes(asesor.trim().toLowerCase())) return saludo;
  const m = /^(.*?[.!?])(\s+)([\s\S]*)$/.exec(saludo);
  if (!m) return `${saludo.trim()} ${p}`;
  return `${m[1]} ${p}${m[3] ? " " + m[3] : ""}`;
}
