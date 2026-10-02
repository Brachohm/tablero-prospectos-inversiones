/**
 * Esquema de comisiones por tipo de plan y plazo. La tabla la escribe el
 * asesor en Configuración → Perfil → Comisiones; aquí solo está la forma.
 *
 * Cada fila dice: para este tipo de plan, desde este plazo (años) en
 * adelante, qué porcentaje cobras sobre la base. La base es el aporte anual
 * (12 × aporte mensual) en Contribución regular, y el aporte total en
 * Contribución única. Se usa la fila con el plazo mínimo más alto que no
 * supere el plazo del plan.
 */
import type { TIPOS_PLAN } from "./ficha";

export interface FilaComision {
  plan: (typeof TIPOS_PLAN)[number];
  /** Plazo mínimo del plan (años) para esta tasa. */
  desde: number;
  /** Porcentaje de comisión sobre la base. */
  pct: number;
}

/** Sin tabla inicial: la app no estima comisiones hasta que las escribas. */
export const COMISIONES: readonly FilaComision[] = [];

export const MAX_COMISIONES = 20;
