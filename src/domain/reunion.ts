/**
 * Modalidad de la reunión (presencial, Zoom o Google Meet), su link y el
 * evento de Google Calendar. Calendar se abre con todo lleno (título, fecha,
 * hora, lugar o link, y el correo del invitado): solo falta tocar "Guardar".
 * Sin cuentas ni claves: es el enlace público de Google para crear eventos.
 */
import { CODIGO_ZONA, DURACION_REUNION_MIN, MODOS_REUNION, type ModoReunion } from "../config/reunion";
import type { Perfil } from "./ajustes";
import { correoValido } from "./contactos";

/**
 * Datos de la reunión (sirve para fichas y para contactos): nombre, correo,
 * reunion, reunionLugar, reunionModo y reunionLink.
 */
export type DatosReunion = { readonly [k: string]: unknown };

const s = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).trim() : "");

export function esVirtual(m: ModoReunion): boolean {
  return m !== "presencial";
}

/** Modalidad guardada; las reuniones de antes con un link en el lugar se reconocen. */
export function modoDe(d: DatosReunion): ModoReunion {
  const m = s(d.reunionModo);
  if (MODOS_REUNION.some((x) => x.id === m)) return m as ModoReunion;
  const lugar = s(d.reunionLugar).toLowerCase();
  if (/zoom\.us|\bzoom\b/.test(lugar)) return "zoom";
  if (/meet\.google|\bmeet\b/.test(lugar)) return "meet";
  return "presencial";
}

/** Link de la reunión virtual (o el que quedó escrito en el lugar). */
export function linkDe(d: DatosReunion): string {
  const l = s(d.reunionLink);
  if (l) return l;
  const lugar = s(d.reunionLugar);
  return /^https?:\/\//i.test(lugar) ? lugar : "";
}

export function nombreModo(m: ModoReunion): string {
  return MODOS_REUNION.find((x) => x.id === m)!.l;
}

/** Para mostrar: "su oficina", "Zoom: https://…" o "Google Meet". */
export function lugarTexto(d: DatosReunion): string {
  const m = modoDe(d);
  if (!esVirtual(m)) return s(d.reunionLugar);
  const link = linkDe(d);
  return `${nombreModo(m)}${link ? `: ${link}` : ""}`;
}

/** Para los mensajes: " en su oficina", " por Zoom: https://…" o "". */
export function lugarFrase(d: DatosReunion): string {
  const m = modoDe(d);
  if (esVirtual(m)) {
    const link = linkDe(d);
    return ` por ${nombreModo(m)}${link ? `: ${link}` : ""}`;
  }
  const lugar = s(d.reunionLugar);
  if (!lugar) return "";
  return /^https?:\/\//i.test(lugar) ? `: ${lugar}` : ` en ${lugar}`;
}

/** Qué falta para guardar la reunión ("" si está bien). */
export function errorReunion(fecha: string, modo: ModoReunion, link: string): string {
  if (!fecha) return "Elige la fecha y hora";
  if (esVirtual(modo) && link.trim() && !/^https?:\/\/\S+$/i.test(link.trim())) return "El link debe empezar con https://";
  return "";
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** "2026-10-09T10:30" → "20261009T103000" (hora local de la zona del asesor). */
function sello(fecha: string, hora: string, mas = 0): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const t = new Date(Date.UTC(a, m - 1, d, hh, mm + mas));
  return (
    `${t.getUTCFullYear()}${dosDigitos(t.getUTCMonth() + 1)}${dosDigitos(t.getUTCDate())}` +
    `T${dosDigitos(t.getUTCHours())}${dosDigitos(t.getUTCMinutes())}00`
  );
}

function diaSiguiente(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
}

/** Enlace para crear el evento en Google Calendar, o null si no hay fecha. */
export function enlaceCalendar(d: DatosReunion, perfil: Perfil, titulo?: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(s(d.reunion));
  if (!m) return null;
  const [, fecha, hora] = m;
  const nombre = s(d.nombre);
  const modo = modoDe(d);
  const link = linkDe(d);
  const q = new URLSearchParams();
  q.set("action", "TEMPLATE");
  q.set("text", titulo ?? `Reunión de asesoría${nombre ? " con " + nombre : ""}`);
  q.set("dates", hora ? `${sello(fecha, hora)}/${sello(fecha, hora, DURACION_REUNION_MIN)}` : `${fecha.replace(/-/g, "")}/${diaSiguiente(fecha)}`);
  q.set("ctz", CODIGO_ZONA);
  const detalles = [
    `Asesoría con ${perfil.nombreCompleto || perfil.apodo}${perfil.rol ? ", " + perfil.rol : ""}.`,
    esVirtual(modo) ? `${nombreModo(modo)}: ${link || "link por confirmar"}` : "",
    perfil.celular?.trim() ? `WhatsApp: ${perfil.celular.trim()}` : "",
  ].filter(Boolean);
  q.set("details", detalles.join("\n"));
  const lugar = esVirtual(modo) ? link || nombreModo(modo) : s(d.reunionLugar);
  if (lugar) q.set("location", lugar);
  const correo = s(d.correo);
  if (correoValido(correo)) q.set("add", correo);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/* ---------- Dos recordatorios por reunión ---------- */

/** Minutos antes de la reunión en que se habilita el recordatorio 2. */
export const ANTICIPACION_R2_MIN = 60;

/** Registro de los recordatorios enviados de la reunión agendada (ms). */
export interface RegistroRecordatorios {
  /** Fecha y hora de la reunión a la que corresponden (si cambia, empiezan de cero). */
  reunion: string;
  r1?: number;
  r2?: number;
}

/** Inicio de la reunión en ms (hora local), o null si no tiene hora. */
export function inicioReunion(d: DatosReunion): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s(d.reunion));
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime();
}

export interface EstadoRecordatorios {
  r1: number | null;
  r2: number | null;
  /** Desde cuándo se puede enviar el 2 (1 hora antes), o null si la reunión no tiene hora. */
  desdeR2: number | null;
  /** Ahora mismo toca enviar el 2 (dentro de la hora previa y aún no enviado). */
  tocaR2: boolean;
  /** Minutos que faltan para la reunión (negativo si ya empezó). */
  minutos: number | null;
}

function registroDe(d: DatosReunion): RegistroRecordatorios | null {
  const r = d.recordatorios as RegistroRecordatorios | undefined;
  return r && typeof r === "object" && r.reunion === s(d.reunion) ? r : null;
}

export function estadoRecordatorios(d: DatosReunion, ahora: number = Date.now()): EstadoRecordatorios {
  const reg = registroDe(d);
  const inicio = inicioReunion(d);
  const desdeR2 = inicio === null ? null : inicio - ANTICIPACION_R2_MIN * 60000;
  const r2 = reg?.r2 ?? null;
  return {
    r1: reg?.r1 ?? null,
    r2,
    desdeR2,
    tocaR2: inicio !== null && desdeR2 !== null && r2 === null && ahora >= desdeR2 && ahora <= inicio,
    minutos: inicio === null ? null : Math.round((inicio - ahora) / 60000),
  };
}

/** Marca como enviado el recordatorio 1 o 2 de la reunión agendada. */
export function marcarRecordatorio(d: DatosReunion, n: 1 | 2, ahora: number = Date.now()): { recordatorios: RegistroRecordatorios } {
  const reg = registroDe(d) ?? { reunion: s(d.reunion) };
  return { recordatorios: { ...reg, [n === 1 ? "r1" : "r2"]: ahora } };
}

/** "9:30" a partir de ms (hora local). */
export function horaDe(ms: number): string {
  const t = new Date(ms);
  return `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;
}
