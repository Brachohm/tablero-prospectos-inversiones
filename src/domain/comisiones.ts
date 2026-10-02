/** Comisión estimada de un cierre según su tipo de plan, plazo y aporte. */
import { COMISIONES, type FilaComision } from "../config/comisiones";
import { num, txt } from "./ficha";
import type { Prospecto } from "./tipos";

export interface Comision {
  base: number;
  pct: number;
  monto: number;
}

export function comisionDe(p: Prospecto, tabla: readonly FilaComision[] = COMISIONES): Comision | null {
  const plan = txt(p, "tipoPlan");
  const plazo = num(p, "plazo");
  const aporte = num(p, "precio");
  if (!plan || plazo === null || aporte === null || aporte <= 0) return null;
  const fila = tabla
    .filter((f) => f.plan === plan && f.desde <= plazo)
    .sort((a, b) => b.desde - a.desde)[0];
  if (!fila) return null;
  const base = plan === "Contribución regular" ? aporte * 12 : aporte;
  return { base, pct: fila.pct, monto: Math.round(base * fila.pct) / 100 };
}
