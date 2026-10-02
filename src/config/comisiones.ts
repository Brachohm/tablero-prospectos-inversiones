/**
 * Esquema de comisiones por tipo de plan y plazo.
 *
 * VALORES DE EJEMPLO: reemplázalos por tu tabla real. Cada fila dice: para
 * este tipo de plan, desde este plazo (años) en adelante, qué porcentaje
 * cobras sobre la base. La base es el aporte anual (12 × aporte mensual) en
 * Contribución regular, y el aporte total en Contribución única.
 * Se usa la fila con el plazo mínimo más alto que no supere el plazo del plan.
 */
import type { TIPOS_PLAN } from "./ficha";

export interface FilaComision {
  plan: (typeof TIPOS_PLAN)[number];
  /** Plazo mínimo del plan (años) para esta tasa. */
  desde: number;
  /** Porcentaje de comisión sobre la base. */
  pct: number;
}

export const COMISIONES: readonly FilaComision[] = [
  { plan: "Contribución regular", desde: 5, pct: 20 },
  { plan: "Contribución regular", desde: 10, pct: 30 },
  { plan: "Contribución regular", desde: 15, pct: 40 },
  { plan: "Contribución única", desde: 1, pct: 2 },
  { plan: "Contribución única", desde: 5, pct: 3 },
  { plan: "Contribución única", desde: 10, pct: 4 },
];
