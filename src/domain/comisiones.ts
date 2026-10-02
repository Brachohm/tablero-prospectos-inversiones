/** Comisión estimada de un cierre según su tipo de plan, plazo y aporte. */
import { COMISIONES, MAX_COMISIONES, type FilaComision } from "../config/comisiones";
import { TIPOS_PLAN } from "../config/ficha";
import { num, txt } from "./ficha";
import type { Prospecto } from "./tipos";

export interface Comision {
  base: number;
  pct: number;
  monto: number;
}

/** Filas válidas (plan conocido, plazo ≥ 0, % > 0), ordenadas y sin repetir plan + plazo. */
export function normalizarComisiones(fs: readonly FilaComision[] | undefined): FilaComision[] {
  const vistos = new Set<string>();
  return (fs ?? COMISIONES)
    .filter((f) => TIPOS_PLAN.includes(f.plan) && Number.isFinite(f.desde) && f.desde >= 0 && Number.isFinite(f.pct) && f.pct > 0)
    .sort((a, b) => a.plan.localeCompare(b.plan) || a.desde - b.desde)
    .filter((f) => {
      const k = f.plan + "|" + f.desde;
      return vistos.has(k) ? false : (vistos.add(k), true);
    })
    .map((f) => ({ plan: f.plan, desde: f.desde, pct: f.pct }))
    .slice(0, MAX_COMISIONES);
}

export function comisionDe(p: Prospecto, tabla: readonly FilaComision[] | undefined = COMISIONES): Comision | null {
  const plan = txt(p, "tipoPlan");
  const plazo = num(p, "plazo");
  const aporte = num(p, "precio");
  if (!plan || plazo === null || aporte === null || aporte <= 0) return null;
  const fila = normalizarComisiones(tabla)
    .filter((f) => f.plan === plan && f.desde <= plazo)
    .sort((a, b) => b.desde - a.desde)[0];
  if (!fila) return null;
  const base = plan === "Contribución regular" ? aporte * 12 : aporte;
  return { base, pct: fila.pct, monto: Math.round(base * fila.pct) / 100 };
}
