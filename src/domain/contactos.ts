/**
 * Contactos nuevos: personas que aún no son prospectos (nombre, edad,
 * género, celular y correo). Cada día la app recuerda saludarlas hasta que
 * pasan a ser prospectos.
 */
import { nuevoId } from "./ficha";
import { cadenaCompleta, esReferido } from "./referidos";
import type { Gestion, Prospecto, Soltado } from "./tipos";

export type Genero = "" | "Femenino" | "Masculino" | "Otro";

export const GENEROS: readonly Exclude<Genero, "">[] = ["Femenino", "Masculino", "Otro"];

export interface ContactoNuevo {
  id: string;
  nombre: string;
  /** Edad en años, tal como se escribió. */
  edad: string;
  genero: Genero;
  celular: string;
  correo: string;
  /** Quién lo refirió (vacío si no es referido). */
  referidor?: string;
  /** Relación con quien lo refirió. */
  relacion?: string;
  /** Cadena de mensajes de referido: día en que se envió cada paso. */
  cadena?: (string | null)[];
  /**
   * Tiene tu número registrado (te conoce). false = sin registrar: el saludo
   * incluye una presentación breve. Sin dato (contactos de antes) = registrado.
   */
  registrado?: boolean;
  /** Último día en que se le saludó (AAAA-MM-DD). */
  ultimoSaludo?: string;
  /** Veces que se le ha saludado. */
  saludos?: number;
  /** Ficha de prospecto creada desde este contacto. */
  fichaId?: string;
  /** De dónde llegó (ver ORIGENES). Si tiene referidor, es "Referido". */
  origen?: string;
  ciudad?: string;
  /** Gestiones del Centro de Gestión. */
  gestiones?: Gestion[];
  /** Gestión finalizada sin borrar el contacto. */
  soltado?: Soltado;
  reunion?: string;
  reunionLugar?: string;
  /** Presencial, Zoom o Google Meet. */
  reunionModo?: string;
  /** Link de la reunión virtual. */
  reunionLink?: string;
  /** Recordatorios 1 y 2 enviados de la reunión agendada. */
  recordatorios?: { reunion: string; r1?: number; r2?: number };
  /** Seguimiento 1-2-3: día de envío de cada mensaje. */
  seguimiento?: string[];
  segRespondio?: string;
  /** Vueltas anteriores del seguimiento (cuando contestó y se empezó de nuevo). */
  segVueltas?: { enviados: string[]; respondio?: string }[];
  creado: number;
  mod: number;
}

export function crearContacto(datos: Partial<ContactoNuevo> = {}, ahora = Date.now()): ContactoNuevo {
  return { nombre: "", edad: "", genero: "", celular: "", correo: "", ...datos, id: nuevoId(ahora), creado: ahora, mod: ahora };
}

export function correoValido(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

/** Qué falta para guardar el contacto ("" si está bien). */
export function errorContacto(c: ContactoNuevo): string {
  if (!c.nombre.trim()) return "Escribe el nombre";
  const e = c.edad.trim();
  if (e && !(/^\d{1,3}$/.test(e) && Number(e) <= 120)) return "La edad debe ser un número de años";
  if (!c.celular.trim() && !c.correo.trim()) return "Pon al menos el celular o el correo";
  if (c.celular.trim() && c.celular.replace(/\D/g, "").length < 7) return "Revisa el celular";
  if (c.correo.trim() && !correoValido(c.correo)) return "Revisa el correo";
  if (c.referidor?.trim() && !c.relacion) return "Elige la relación con quien lo refirió";
  return "";
}

/** Sigue en gestión: no se ha pasado a prospecto ni se soltó. */
export function activo(c: ContactoNuevo): boolean {
  return !c.fichaId && !c.soltado;
}

export function origenContacto(c: ContactoNuevo): string {
  return c.referidor?.trim() ? "Referido" : c.origen || "Otro";
}

export function saludadoHoy(c: ContactoNuevo, hoy: string): boolean {
  return c.ultimoSaludo === hoy;
}

/** Datos para la cadena de referido. */
export function datosReferido(c: ContactoNuevo) {
  return { nombre: c.nombre, referidor: c.referidor ?? "", relacion: c.relacion ?? "", cadena: c.cadena };
}

/** Referido al que aún le faltan mensajes de la cadena (no entra en el saludo diario). */
export function enCadena(c: ContactoNuevo): boolean {
  return activo(c) && esReferido(datosReferido(c)) && !cadenaCompleta(datosReferido(c));
}

/**
 * Entra al saludo diario: activo, no es referido en cadena y no viene de una
 * base de datos importada (esos se trabajan en el Centro de Gestión).
 */
export function saludable(c: ContactoNuevo): boolean {
  return activo(c) && !enCadena(c) && origenContacto(c) !== "Base de datos";
}

/** Contactos por saludar hoy: primero los que llevan más tiempo sin saludo. Los referidos, después de su cadena. */
export function porSaludar(cs: readonly ContactoNuevo[], hoy: string): ContactoNuevo[] {
  return cs
    .filter((c) => saludable(c) && !saludadoHoy(c, hoy))
    .sort((a, b) => (a.ultimoSaludo ?? "").localeCompare(b.ultimoSaludo ?? "") || a.creado - b.creado);
}

export function marcarSaludo(c: ContactoNuevo, hoy: string): ContactoNuevo {
  if (c.ultimoSaludo === hoy) return c;
  return { ...c, ultimoSaludo: hoy, saludos: (c.saludos ?? 0) + 1 };
}

/** Deshace el saludo de hoy (vuelve al día anterior registrado). */
export function desmarcarSaludo(c: ContactoNuevo, previo: string | undefined): ContactoNuevo {
  return { ...c, ultimoSaludo: previo, saludos: Math.max(0, (c.saludos ?? 1) - 1) };
}

export function primerNombre(c: ContactoNuevo): string {
  return c.nombre.trim().split(/\s+/)[0] ?? "";
}

/** Datos con los que arranca la ficha de prospecto creada desde el contacto. */
export function datosParaFicha(c: ContactoNuevo): Partial<Prospecto> {
  return {
    nombre: c.nombre.trim(),
    ...(c.edad.trim() ? { edad: c.edad.trim() } : {}),
    ...(c.celular.trim() ? { whatsapp: c.celular.trim() } : {}),
    ...(c.correo.trim() ? { correo: c.correo.trim() } : {}),
    ...(c.genero === "Femenino" || c.genero === "Masculino"
      ? { personas: [{ id: "t", rol: "Titular", nombre: "", edad: "", sexo: c.genero === "Femenino" ? "Mujer" : "Hombre" }] }
      : {}),
    ...(esReferido(datosReferido(c))
      ? { origen: "Referido", referidor: c.referidor!.trim(), relacion: c.relacion ?? "", cadena: c.cadena ?? [] }
      : {}),
    ...(!esReferido(datosReferido(c)) && c.origen ? { origen: c.origen } : {}),
    ...(c.ciudad?.trim() ? { ciudad: c.ciudad.trim() } : {}),
    ...(c.gestiones?.length ? { gestiones: c.gestiones } : {}),
    ...(c.reunion
      ? { reunion: c.reunion, reunionLugar: c.reunionLugar ?? "", reunionModo: c.reunionModo ?? "", reunionLink: c.reunionLink ?? "" }
      : {}),
    ...(c.seguimiento?.length ? { seguimiento: c.seguimiento } : {}),
    contactoId: c.id,
  };
}
