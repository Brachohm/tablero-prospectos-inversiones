/** XP, avance, niveles, insignias y estadísticas del tablero. */
import { CAMPOS_GESTION, CONTACTOS_MAX, MISIONES } from "../config/ficha";
import { INSIGNIA_PROSPECTOS, NIVELES, XP_CIERRE } from "../config/juego";
import { campoActivo, contactosDe, reunionesDe, tipoDe, valorLleno, vendido } from "./ficha";
import { declaracionVisible, preStats } from "./pre";
import type { Campo, Mision, Prospecto } from "./tipos";

export function misionAplica(m: Mision, p: Prospecto): boolean {
  if (m.solo && m.solo !== tipoDe(p)) return false;
  // Preexistencias: solo cuando el nuevo prospecto ya está cerca de contratar.
  if (m.id === "pre") return declaracionVisible(p);
  return true;
}

export function misionesDe(p: Prospecto): Mision[] {
  return MISIONES.filter((m) => misionAplica(m, p));
}

export function xpCampo(c: Campo, p: Prospecto): number {
  if (c.t === "contactos") return contactosDe(p) * c.xp;
  return valorLleno(c, p) ? c.xp : 0;
}

export interface MisionStats {
  pct: number;
  xp: number;
}

export function misionStats(m: Mision, p: Prospecto): MisionStats {
  if (!misionAplica(m, p)) return { pct: 0, xp: 0 };
  if (m.custom) {
    const s = preStats(p);
    return { pct: s.pct, xp: s.xp };
  }
  let total = 0;
  let llenos = 0;
  let xp = 0;
  for (const c of m.campos) {
    if (!campoActivo(c, p) || c.noCount) continue;
    total++;
    if (c.t === "contactos" ? contactosDe(p) >= CONTACTOS_MAX : valorLleno(c, p)) llenos++;
    xp += xpCampo(c, p);
  }
  return { pct: total ? Math.round((llenos / total) * 100) : 0, xp };
}

export function fichaXp(p: Prospecto): number {
  // Lo de "+ acciones" (contactos, próximo contacto, notas) también suma.
  const gestion = CAMPOS_GESTION.filter((c) => campoActivo(c, p)).reduce((a, c) => a + xpCampo(c, p), 0);
  const xp = gestion + misionesDe(p).reduce((a, m) => a + misionStats(m, p).xp, 0);
  return xp + (vendido(p) ? XP_CIERRE : 0);
}

/** Promedio del avance de las misiones que aplican al tipo de ficha. */
export function fichaPct(p: Prospecto): number {
  const ms = misionesDe(p);
  if (!ms.length) return 0;
  return Math.round(ms.reduce((a, m) => a + misionStats(m, p).pct, 0) / ms.length);
}

export interface Nivel {
  indice: number;
  nombre: string;
  xp: number;
  siguiente: { nombre: string; xp: number } | null;
  /** Avance hacia el siguiente nivel (0-100). */
  pct: number;
  faltan: number;
}

export function nivelDe(xpTotal: number): Nivel {
  let i = 0;
  NIVELES.forEach((n, k) => {
    if (xpTotal >= n.xp) i = k;
  });
  const cur = NIVELES[i];
  const nxt = NIVELES[i + 1] ?? null;
  const pct = nxt ? Math.round(((xpTotal - cur.xp) / (nxt.xp - cur.xp)) * 100) : 100;
  return {
    indice: i,
    nombre: cur.n,
    xp: xpTotal,
    siguiente: nxt ? { nombre: nxt.n, xp: nxt.xp } : null,
    pct,
    faltan: nxt ? nxt.xp - xpTotal : 0,
  };
}


export interface Insignia {
  id: string;
  ic: string;
  t: string;
  on: boolean;
}

export function insignias(items: readonly Prospecto[]): Insignia[] {
  const cerrado = (p: Prospecto) => vendido(p);
  return [
    { id: "cierre1", ic: "🏆", t: "Primer cierre", on: items.some(cerrado) },
    {
      id: "cierreNuevo",
      ic: "🚀",
      t: "Cierre de nuevo afiliado",
      on: items.some((p) => cerrado(p) && tipoDe(p) === "nuevo"),
    },
    {
      id: "cierreCambio",
      ic: "🔄",
      t: "Cierre de cambio de seguro",
      on: items.some((p) => cerrado(p) && tipoDe(p) === "cambio"),
    },
    {
      id: "contactos",
      ic: "🔁",
      t: `${CONTACTOS_MAX} contactos en un prospecto`,
      on: items.some((p) => contactosDe(p) >= CONTACTOS_MAX),
    },
    { id: "presentacion", ic: "🎯", t: "Dos reuniones hechas", on: items.some((p) => reunionesDe(p).length >= 2) },
    {
      id: "escaneo",
      ic: "🧬",
      t: "Escaneo de cuerpo completo",
      on: items.some((p) => tipoDe(p) === "nuevo" && preStats(p).completos > 0),
    },
    {
      id: "cartera",
      ic: "📇",
      t: `${INSIGNIA_PROSPECTOS} prospectos`,
      on: items.length >= INSIGNIA_PROSPECTOS,
    },
  ];
}

export interface Resumen {
  xp: number;
  nivel: Nivel;
  prospectos: number;
  cierres: number;
  /** Cierres / total, en porcentaje entero. */
  tasa: number;
  porTipo: { nuevo: number; cambio: number };
}

export function resumenTablero(items: readonly Prospecto[]): Resumen {
  const xp = items.reduce((a, p) => a + fichaXp(p), 0);
  const cierres = items.filter(vendido).length;
  const nuevo = items.filter((p) => tipoDe(p) === "nuevo").length;
  return {
    xp,
    nivel: nivelDe(xp),
    prospectos: items.length,
    cierres,
    tasa: items.length ? Math.round((cierres / items.length) * 100) : 0,
    porTipo: { nuevo, cambio: items.length - nuevo },
  };
}
