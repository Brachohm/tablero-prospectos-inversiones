/**
 * Seguimiento 1-2-3 por nivel de respuesta: los mensajes van el día 1, el 3 y
 * el 5, contando días laborables de lunes a sábado (el domingo no cuenta ni
 * se envía). `p.seguimiento[i]` guarda el día en que se envió el mensaje i+1.
 * Si la persona contesta, la cadena se detiene y se puede empezar de nuevo
 * desde el mensaje 1.
 */
import { diasHasta } from "./fechas";
import type { Prospecto } from "./tipos";

export const PASOS_SEGUIMIENTO = 3;

/** Días laborables entre un mensaje y el siguiente (día 1 → 3 → 5). */
export const SALTO_SEGUIMIENTO = 2;

function sumarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

export function esDomingo(iso: string): boolean {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() === 0;
}

/** Primer día que no es domingo a partir de `iso` (incluido). */
export function habilDesde(iso: string): string {
  return esDomingo(iso) ? sumarDias(iso, 1) : iso;
}

/** Día siguiente a `iso`, saltando el domingo. */
export function siguienteHabil(iso: string): string {
  return habilDesde(sumarDias(iso, 1));
}

/** `n` días laborables (lunes a sábado) después de `iso`. */
export function sumarHabiles(iso: string, n: number): string {
  let d = iso;
  for (let i = 0; i < n; i++) d = siguienteHabil(d);
  return d;
}

export function enviadosDe(p: Prospecto): string[] {
  return Array.isArray(p.seguimiento) ? p.seguimiento.filter((x): x is string => typeof x === "string") : [];
}

export interface EstadoSeguimiento {
  enviados: string[];
  /** Respondió: la cadena se detiene. */
  respondio: string | null;
  /** Índice (0-2) del siguiente mensaje, o null si ya se enviaron los 3 o respondió. */
  siguiente: number | null;
  /** Día desde el que se puede enviar el siguiente. */
  desde: string | null;
  /** Se puede enviar hoy. */
  hoy: boolean;
  /** Explicación cuando no se puede. */
  motivo: string;
}

export function estadoSeguimiento(p: Prospecto, hoy: string): EstadoSeguimiento {
  const enviados = enviadosDe(p);
  const respondio = typeof p.segRespondio === "string" ? p.segRespondio : null;
  if (respondio) return { enviados, respondio, siguiente: null, desde: null, hoy: false, motivo: "Respondió" };
  if (enviados.length >= PASOS_SEGUIMIENTO)
    return { enviados, respondio, siguiente: null, desde: null, hoy: false, motivo: "Ya enviaste los 3 mensajes" };
  const ult = enviados[enviados.length - 1];
  const desde = ult ? sumarHabiles(ult, SALTO_SEGUIMIENTO) : habilDesde(hoy);
  const puede = !esDomingo(hoy) && diasHasta(desde, hoy) <= 0;
  let motivo = "";
  if (!puede) {
    if (ult === hoy) motivo = "Ya enviaste un mensaje hoy";
    else if (esDomingo(hoy)) motivo = "Los domingos no se envía";
    else motivo = `Aún no toca: van el día 1, el 3 y el 5 (lunes a sábado)`;
  }
  return { enviados, respondio, siguiente: enviados.length, desde, hoy: puede, motivo };
}

/** Registra el envío del siguiente mensaje (si hoy se puede). Devuelve la misma ficha si no. */
export function registrarSeguimiento(p: Prospecto, hoy: string): Prospecto {
  const e = estadoSeguimiento(p, hoy);
  if (!e.hoy) return p;
  return { ...p, seguimiento: [...e.enviados, hoy] };
}

export function deshacerSeguimiento(p: Prospecto, dia: string): Prospecto {
  const e = enviadosDe(p);
  if (e[e.length - 1] !== dia) return p;
  return { ...p, seguimiento: e.slice(0, -1) };
}

/** Contestó: la cadena se detiene. */
export function marcarRespondio(p: Prospecto, hoy: string): Prospecto {
  return { ...p, segRespondio: hoy };
}

/**
 * Empezar de nuevo tras una respuesta: guarda la vuelta anterior y deja listo
 * el mensaje 1 (se puede enviar desde hoy).
 */
export function reiniciarSeguimiento<T extends { seguimiento?: string[]; segRespondio?: string; segVueltas?: { enviados: string[]; respondio?: string }[] }>(
  p: T,
): T {
  const enviados = Array.isArray(p.seguimiento) ? p.seguimiento : [];
  const vueltas = [...(p.segVueltas ?? []), { enviados, ...(p.segRespondio ? { respondio: p.segRespondio } : {}) }];
  return { ...p, seguimiento: [], segRespondio: undefined, segVueltas: vueltas };
}

export function vueltasDe(p: { segVueltas?: unknown }): number {
  return Array.isArray(p.segVueltas) ? p.segVueltas.length : 0;
}
