/** Declaración de preexistencias (solo fichas `nuevo`): estados, avance, XP y resumen. */
import { ETAPAS_COTIZACION } from "../config/ficha";
import { XP_PRE } from "../config/juego";
import { ZONAS } from "../config/zonas";
import { etapaDe, tipoDe, txt } from "./ficha";
import { imcPersona, textoIMC } from "./imc";
import type { DatoZona, DetalleCondicion, GrupoCondiciones, Persona, Prospecto } from "./tipos";

export const ZONA_BY: Readonly<Record<string, (typeof ZONAS)[number]>> = Object.fromEntries(
  ZONAS.map((z) => [z.id, z] as const),
);

export const COND: Readonly<Record<string, { l: string; z: string }>> = Object.fromEntries(
  ZONAS.flatMap((z) => z.grupos.flatMap((g) => g.condiciones.map((c) => [c.id, { l: c.l, z: z.id }] as const))),
);

export const TITULAR_ID = "t";

/** Personas a asegurar. La primera es siempre el titular; su nombre y edad salen de la ficha. */
export function personasDe(p: Prospecto): Persona[] {
  const lista = Array.isArray(p.personas) && p.personas.length ? p.personas : [];
  const titularGuardado = lista.find((x) => x.id === TITULAR_ID);
  // Lo demás del titular (sexo, talla, peso, identificación) se guarda en su entrada de `personas`.
  const titular: Persona = {
    ...(titularGuardado ?? {}),
    id: TITULAR_ID,
    rol: "Titular",
    nombre: txt(p, "nombre"),
    edad: txt(p, "edad"),
    sexo: titularGuardado?.sexo ?? "",
  };
  return [titular, ...lista.filter((x) => x.id !== TITULAR_ID)];
}

export function etiquetaPersona(per: Persona, i: number): string {
  if (i === 0) return per.nombre || "Titular";
  return per.nombre || per.rol + (i > 1 ? " " + i : "");
}

/** Rol y edad, sin nombre (es lo que se envía a la IA). */
export function rolEdad(per: Persona): string {
  return per.rol + (per.edad ? ` (${per.edad} años)` : "");
}

export type EstadoZona = "hit" | "clear" | "pend";

export function zonaDe(p: Prospecto, pid: string, zid: string): DatoZona | undefined {
  return p.pre?.[pid]?.[zid];
}

function condicionesDe(d: DatoZona | undefined): [string, DetalleCondicion][] {
  return d?.it ? Object.entries(d.it) : [];
}

function tieneOtra(d: DatoZona | undefined): boolean {
  return !!d?.otra && String(d.otra).trim() !== "";
}

export function estadoZona(d: DatoZona | undefined): EstadoZona {
  if (!d) return "pend";
  if (condicionesDe(d).length > 0 || tieneOtra(d)) return "hit";
  return d.ok ? "clear" : "pend";
}

/** Los grupos marcados por sexo solo se ven para ese sexo; sin sexo indicado se ven todos. */
export function grupoVisible(g: GrupoCondiciones, per: Persona): boolean {
  if (!g.sexo || !per.sexo) return true;
  return g.sexo === per.sexo;
}

/** Condiciones declaradas de una persona (incluye "otra"). */
export function hitsPersona(p: Prospecto, pid: string): number {
  let n = 0;
  for (const z of ZONAS) {
    const d = zonaDe(p, pid, z.id);
    n += condicionesDe(d).length + (tieneOtra(d) ? 1 : 0);
  }
  return n;
}

function hayDatos(p: Prospecto, pid: string): boolean {
  return ZONAS.some((z) => estadoZona(zonaDe(p, pid, z.id)) !== "pend");
}

export type EstadoPersona = "no" | "si" | "pend";

/**
 * "no" = respondió que no tiene preexistencias (y no hay nada declarado);
 * "si" = está declarando; "pend" = sin responder.
 */
export function estadoPersona(p: Prospecto, pid: string): EstadoPersona {
  const sn = p.preSN?.[pid] ?? "";
  if (sn === "no" && hitsPersona(p, pid) === 0) return "no";
  if (sn === "si" || hayDatos(p, pid)) return "si";
  return "pend";
}

export function zonasPendientes(p: Prospecto, pid: string): number {
  return ZONAS.filter((z) => estadoZona(zonaDe(p, pid, z.id)) === "pend").length;
}

export interface PreStats {
  /** Avance de la misión (0-100). */
  pct: number;
  xp: number;
  revisadas: number;
  total: number;
  condiciones: number;
  /** Personas con escaneo completo real (no cuenta "No"). */
  completos: number;
}

export function preStats(p: Prospecto): PreStats {
  const pers = personasDe(p);
  const total = pers.length * ZONAS.length;
  let revisadas = 0;
  let revisadasEscaneo = 0;
  let condiciones = 0;
  let completos = 0;
  let sinPre = 0;
  for (const per of pers) {
    if (estadoPersona(p, per.id) === "no") {
      revisadas += ZONAS.length;
      sinPre++;
      continue;
    }
    let r = 0;
    for (const z of ZONAS) {
      const d = zonaDe(p, per.id, z.id);
      if (estadoZona(d) !== "pend") r++;
      condiciones += condicionesDe(d).length;
    }
    revisadas += r;
    revisadasEscaneo += r;
    if (r === ZONAS.length) completos++;
  }
  const xp =
    revisadasEscaneo * XP_PRE.zona +
    condiciones * XP_PRE.condicion +
    completos * XP_PRE.escaneoCompleto +
    sinPre * XP_PRE.sinPreexistencias;
  return { pct: total ? Math.round((revisadas / total) * 100) : 0, xp, revisadas, total, condiciones, completos };
}

export interface CondicionResumen {
  c: string;
  a: string;
  e: string;
  t: string;
}

export interface ResumenPersona {
  pid: string;
  etiqueta: string;
  /** Rol y edad, sin nombre. */
  persona: string;
  /** "IMC 27,3 · Sobrepeso" ("" si falta talla o peso). */
  imc: string;
  /** El IMC trae un factor de riesgo a tener presente. */
  imcFactor: boolean;
  sinPre: boolean;
  con: { zona: string; items: CondicionResumen[] }[];
  pend: { id: string; n: string }[];
  clear: number;
}

export function preResumen(p: Prospecto): ResumenPersona[] {
  return personasDe(p).map((per, i) => {
    const r = imcPersona(per);
    const base = {
      pid: per.id,
      etiqueta: etiquetaPersona(per, i),
      persona: rolEdad(per),
      imc: r ? textoIMC(r) : "",
      imcFactor: !!r?.factor,
    };
    if (estadoPersona(p, per.id) === "no") {
      return { ...base, sinPre: true, con: [], pend: [], clear: ZONAS.length };
    }
    const con: ResumenPersona["con"] = [];
    const pend: ResumenPersona["pend"] = [];
    let clear = 0;
    for (const z of ZONAS) {
      const d = zonaDe(p, per.id, z.id);
      const st = estadoZona(d);
      if (st === "hit") {
        const items: CondicionResumen[] = condicionesDe(d).map(([id, x]) => ({
          c: COND[id]?.l ?? id,
          a: x?.a ?? "",
          e: x?.e ?? "",
          t: x?.t ?? "",
        }));
        if (tieneOtra(d)) items.push({ c: "Otra: " + String(d!.otra).trim(), a: "", e: "", t: "" });
        con.push({ zona: z.nombre, items });
      } else if (st === "clear") clear++;
      else pend.push({ id: z.id, n: z.nombre });
    }
    return { ...base, sinPre: false, con, pend, clear };
  });
}

/** Texto de una línea para el CSV ("Preexistencias declaradas"). */
export function preTexto(p: Prospecto): string {
  if (tipoDe(p) !== "nuevo") return "";
  return preResumen(p)
    .map((x) => {
      const imc = x.imc ? ` (${x.imc})` : "";
      if (x.sinPre) return x.etiqueta + imc + ": sin preexistencias";
      if (!x.con.length) return x.pend.length ? (imc ? x.etiqueta + imc : "") : x.etiqueta + imc + ": sin antecedentes";
      return (
        x.etiqueta +
        imc +
        ": " +
        x.con
          .map(
            (z) =>
              z.zona +
              " (" +
              z.items.map((i) => i.c + (i.a ? " " + i.a : "") + (i.e ? ", " + i.e.toLowerCase() : "")).join("; ") +
              ")",
          )
          .join("; ")
      );
    })
    .filter(Boolean)
    .join(" | ");
}

/**
 * La declaración de preexistencias se muestra solo en nuevos prospectos cerca
 * de contratar: etapa de cotización, abierta a mano, o con algo ya declarado.
 */
export function declaracionVisible(p: Prospecto): boolean {
  if (tipoDe(p) !== "nuevo") return false;
  if ((ETAPAS_COTIZACION as readonly string[]).includes(etapaDe(p))) return true;
  if (p.cotizar === true) return true;
  return personasDe(p).some((per) => estadoPersona(p, per.id) !== "pend");
}
