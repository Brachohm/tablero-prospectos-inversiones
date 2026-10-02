/** Vitality: cómo se reconoce en la Biblioteca y cómo se agrupan sus beneficios. Editables. */
export const RE_VITALITY = /\bvitality\b/;

/** Lo que dice qué es, en general (los beneficios concretos salen de tus documentos). */
export const INTRO_VITALITY =
  "Vitality es un programa de bienestar que premia sus hábitos saludables: mientras más se cuida, más beneficios recibe.";

export const PERIODOS_VITALITY: readonly { id: "semanal" | "mensual" | "anual"; l: string; re: RegExp }[] = [
  { id: "semanal", l: "Cada semana", re: /seman/ },
  { id: "mensual", l: "Cada mes", re: /mensual|cada mes|al mes|por mes/ },
  { id: "anual", l: "Cada año", re: /anual|al ano|cada ano|por ano/ },
];

/** Palabras de una línea que habla de un beneficio del programa. */
export const BENEFICIO_VITALITY = /premio|recompens|descuento|beneficio|puntos|cashback|reembolso|gimnasio|pasos|actividad|meta|estatus|nivel|bono|gratis|sin costo|%|\$/;

export const MAX_POR_PERIODO = 4;
