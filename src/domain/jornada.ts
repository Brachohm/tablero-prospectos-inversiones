/**
 * Jornada: el resumen del día al dar "Fin de gestión" (queda registrado en la
 * Configuración) y el recordatorio de cargar la copia al empezar el día.
 */
import type { ContactoNuevo } from "./contactos";
import { gestionables, cola } from "./gestion";
import { historialDe, num } from "./ficha";
import { hoyISO } from "./fechas";
import { reunionDe } from "./mensajes";
import type { Prospecto } from "./tipos";

export interface ResumenDia {
  gestiones: number;
  soltados: number;
  contactosRegistrados: number;
  contactosNuevos: number;
  fichasNuevas: number;
  cierres: number;
  prima: number;
  reunionesManana: number;
  pendientes: number;
}

export interface Jornada {
  fecha: string;
  ts: number;
  resumen: ResumenDia;
  /** Se hizo la copia de seguridad al cerrar. */
  copia: boolean;
}

/** Máximo de jornadas guardadas. */
export const MAX_JORNADAS = 90;

export function resumenDia(items: readonly Prospecto[], contactos: readonly ContactoNuevo[], hoy: string): ResumenDia {
  const delDia = (ts: number) => hoyISO(new Date(ts)) === hoy;
  const gestiones = [...items.flatMap((p) => p.gestiones ?? []), ...contactos.flatMap((c) => c.gestiones ?? [])].filter(
    (g) => g.fecha === hoy,
  );
  const soltados = [...items.map((p) => p.soltado), ...contactos.map((c) => c.soltado)].filter((s) => s?.fecha === hoy);
  const cerradas = items.filter((p) => p.etapa === "Cerrado" && p.cerradoEn === hoy);
  return {
    gestiones: gestiones.length,
    soltados: soltados.length,
    contactosRegistrados: items.reduce((n, p) => n + historialDe(p).filter((h) => h.fecha === hoy).length, 0),
    contactosNuevos: contactos.filter((c) => delDia(c.creado)).length,
    fichasNuevas: items.filter((p) => delDia(p.creado)).length,
    cierres: cerradas.length,
    prima: cerradas.reduce((s, p) => s + (num(p, "precio") ?? 0), 0),
    reunionesManana: [...items, ...contactos.map((c) => ({ ...c, whatsapp: c.celular }) as unknown as Prospecto)].filter(
      (p) => reunionDe(p, hoy)?.dias === 1,
    ).length,
    pendientes: cola(gestionables(items, contactos), hoy).pendientes.length,
  };
}

export function agregarJornada(js: readonly Jornada[] | undefined, j: Jornada): Jornada[] {
  return [...(js ?? []).filter((x) => x.fecha !== j.fecha), j].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(-MAX_JORNADAS);
}

export function ultimaJornada(js: readonly Jornada[] | undefined): Jornada | null {
  return js?.length ? js[js.length - 1] : null;
}

/** ¿Recordar cargar la copia al empezar? Una vez por día, hasta que se cargue o se descarte. */
export function recordarInicio(ultimoInicio: string | null, hoy: string): boolean {
  return ultimoInicio !== hoy;
}
