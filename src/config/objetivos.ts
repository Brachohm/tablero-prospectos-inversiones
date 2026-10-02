/**
 * Objetivos del mes por defecto (se cambian en Configuración → Perfil).
 * La prima de cada contrato es el "Precio mensual (USD)" de la ficha cerrada.
 */
import type { ObjetivoConfig } from "../domain/objetivos";

export const OBJETIVOS_INICIALES: readonly ObjetivoConfig[] = [
  { monto: 750, beneficio: true, detalle: "90% de comisión" },
  { monto: 1100, beneficio: true, detalle: "120% de comisión" },
];

export const MIN_OBJETIVOS = 1;
export const MAX_OBJETIVOS = 4;
