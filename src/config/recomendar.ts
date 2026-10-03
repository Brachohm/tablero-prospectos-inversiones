/**
 * Necesidades que la app reconoce en la ficha para recomendar un plan.
 * `conceptos`: dónde mirar en la tabla del plan.
 * `palabras`: qué buscar en los PDF del plan (minúsculas, sin tildes; basta el
 * inicio de la palabra). Editables.
 */
import type { IdConcepto } from "./coberturas";

export type IdNecesidad =
  | "aporte"
  | "unico"
  | "plazo"
  | "costos"
  | "liquidez"
  | "retiros"
  | "vida"
  | "conservador"
  | "crecimiento"
  | "extra"
  | "bono"
  | "estado";

export const NECESIDADES: Readonly<Record<IdNecesidad, { l: string; conceptos: IdConcepto[]; palabras: string[] }>> = {
  aporte: { l: "Un aporte mensual a su alcance", conceptos: ["prima"], palabras: ["aporte minimo", "aporte mensual", "prima minima"] },
  unico: { l: "Aceptar su aporte único", conceptos: ["unico"], palabras: ["aporte unico", "prima unica", "aporte inicial"] },
  plazo: { l: "Un plazo acorde a su meta", conceptos: ["plazo"], palabras: ["plazo", "duracion"] },
  costos: { l: "Costos claros y bajos", conceptos: ["admin", "entrada"], palabras: ["administracion", "cargo", "comision", "costo"] },
  liquidez: { l: "Poder retirar sin una gran penalidad", conceptos: ["sinPenalidad", "rescate"], palabras: ["rescate", "sin penalidad", "retiro anticipado"] },
  retiros: { l: "Retiros parciales si los necesita", conceptos: ["retiros"], palabras: ["retiro parcial", "retiros parciales"] },
  vida: { l: "Protección para su familia (cobertura de vida)", conceptos: ["vida"], palabras: ["fallecimiento", "seguro de vida", "suma asegurada"] },
  conservador: { l: "Fondos conservadores", conceptos: ["fondos"], palabras: ["conservador", "renta fija", "bajo riesgo"] },
  crecimiento: { l: "Fondos de crecimiento", conceptos: ["fondos"], palabras: ["agresivo", "crecimiento", "renta variable", "acciones"] },
  extra: { l: "Aportes extra cuando le vaya bien", conceptos: ["extra"], palabras: ["aporte extraordinario", "aportes extra", "aporte adicional"] },
  bono: { l: "Premio por permanecer (bono)", conceptos: ["bono"], palabras: ["bono", "lealtad", "permanencia"] },
  estado: { l: "Ver su inversión cuando quiera", conceptos: ["estado"], palabras: ["estado de cuenta", "en linea", "consulta"] },
};

/** Modalidades de red (solo para planes de salud). En inversiones no aplica: no se reconoce ninguna. */
export type Modalidad = "abierta" | "mixta" | "cerrada";

export const MODALIDADES: Readonly<Record<Modalidad, { l: string; ev: string }>> = {
  abierta: { l: "Modalidad abierta", ev: "" },
  mixta: { l: "Modalidad mixta", ev: "" },
  cerrada: { l: "Red cerrada", ev: "" },
};

export const RECONOCER_MODALIDAD: readonly [Modalidad, RegExp][] = [];

/** Una línea del PDF que dice que algo NO aplica. */
export const NIEGA = /\b(no (se )?(cubre|cubren|incluye|incluyen|aplica|permite|permiten|ampara)|excluid|exclusion|se excluye|sin cobertura)/;

/** Una línea del PDF que habla de un tiempo de espera o permanencia mínima. */
export const ESPERA = /(carencia|periodo de espera|tiempo de espera|permanencia minima|a partir del (ano|mes)|\d+\s*(mes|meses|anos|años)\b)/;
