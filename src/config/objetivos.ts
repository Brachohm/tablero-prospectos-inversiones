/**
 * Objetivos del mes por defecto (se cambian en Configuración → Perfil).
 * El monto de cada contrato es el aporte de la ficha cerrada (Pre-cierre).
 */
import type { ObjetivoConfig } from "../domain/objetivos";

export const OBJETIVOS_INICIALES: readonly ObjetivoConfig[] = [
  { monto: 2000, beneficio: false, detalle: "" },
  { monto: 4000, beneficio: false, detalle: "" },
];

export const MIN_OBJETIVOS = 1;
export const MAX_OBJETIVOS = 4;
