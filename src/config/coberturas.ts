/**
 * Conceptos de la tabla de cada plan para comparar la inversión actual de la
 * persona con los planes de la Biblioteca (unit linked). Editables.
 *   mejor: "mas"  → un valor mayor es mejor (cobertura de vida, bono)
 *          "menos" → un valor menor es mejor (aporte mínimo, cargos, penalidades, años)
 *          "texto" → no se compara solo; se muestra lado a lado
 *   claves: palabras para reconocerlo en un Excel o PDF (sin tildes, minúsculas)
 * El rendimiento histórico se muestra, nunca se compara ni se promete.
 */
import type { MotivoId } from "../domain/tipos";

export type IdConcepto =
  | "prima"
  | "unico"
  | "plazo"
  | "admin"
  | "entrada"
  | "rescate"
  | "sinPenalidad"
  | "vida"
  | "fondos"
  | "bono"
  | "extra"
  | "retiros"
  | "estado"
  | "historico";

export const CONCEPTOS: readonly { id: IdConcepto; l: string; mejor: "mas" | "menos" | "texto"; claves: string[]; ph?: string }[] = [
  { id: "prima", l: "Aporte mínimo mensual (USD)", mejor: "menos", claves: ["aporte minimo", "aporte mensual", "prima minima", "prima mensual", "cuota mensual", "contribucion regular"], ph: "$50" },
  { id: "unico", l: "Aporte único mínimo (USD)", mejor: "menos", claves: ["aporte unico", "prima unica", "aporte inicial", "contribucion unica"], ph: "$5.000" },
  { id: "plazo", l: "Plazos disponibles", mejor: "texto", claves: ["plazo", "duracion", "vigencia del plan"], ph: "10 a 30 años" },
  { id: "admin", l: "Cargo de administración", mejor: "menos", claves: ["administracion", "gestion del fondo", "comision anual", "cargo anual"], ph: "1,5 % anual" },
  { id: "entrada", l: "Cargo inicial o de entrada", mejor: "menos", claves: ["cargo inicial", "cargo de entrada", "gastos iniciales", "cargo por aporte", "comision de entrada"], ph: "5 % del aporte" },
  { id: "rescate", l: "Penalidad por rescate anticipado", mejor: "menos", claves: ["rescate", "penalidad", "retiro anticipado", "cancelacion anticipada", "valor de rescate"], ph: "10 % el primer año" },
  { id: "sinPenalidad", l: "Años hasta retirar sin penalidad", mejor: "menos", claves: ["sin penalidad", "sin cargo de rescate", "libre de penalidad", "sin recargo"], ph: "Desde el año 6" },
  { id: "vida", l: "Cobertura por fallecimiento", mejor: "mas", claves: ["fallecimiento", "seguro de vida", "suma asegurada", "muerte"], ph: "$20.000 o el saldo" },
  { id: "fondos", l: "Fondos disponibles", mejor: "texto", claves: ["fondos disponibles", "portafolio", "fondo conservador", "fondo moderado", "fondo agresivo", "fondos de inversion"], ph: "Conservador, moderado y agresivo" },
  { id: "bono", l: "Bono de permanencia o lealtad", mejor: "mas", claves: ["bono", "lealtad", "permanencia", "bonificacion"], ph: "2 % al año 10" },
  { id: "extra", l: "Aportes extraordinarios", mejor: "texto", claves: ["aporte extraordinario", "aportes extra", "aporte adicional"], ph: "Sí, desde $100" },
  { id: "retiros", l: "Retiros parciales", mejor: "texto", claves: ["retiro parcial", "retiros parciales"], ph: "Sí, desde el año 3" },
  { id: "estado", l: "Estado de cuenta", mejor: "texto", claves: ["estado de cuenta", "consulta en linea", "reporte trimestral", "app"], ph: "En línea, cada mes" },
  { id: "historico", l: "Rendimiento histórico de los fondos", mejor: "texto", claves: ["rendimiento historico", "rentabilidad historica", "rendimiento pasado"], ph: "Solo informativo: no garantiza" },
];

/** Qué conceptos pesan más según los motivos de inconformidad de la persona. */
export const CONCEPTOS_POR_MOTIVO: Readonly<Partial<Record<MotivoId, IdConcepto[]>>> = {
  rendimiento: ["fondos", "bono"],
  costos: ["admin", "entrada", "prima"],
  liquidez: ["rescate", "sinPenalidad", "retiros"],
  transparencia: ["estado"],
  riesgo: ["fondos"],
};
