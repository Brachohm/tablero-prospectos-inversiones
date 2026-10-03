/**
 * Cómo se reconocen y ordenan las bondades de un plan de inversión en sus PDF. Editables.
 * Solo se toman frases escritas en los documentos (tal cual): esto solo las
 * clasifica. Palabras en minúsculas y sin tildes.
 */
import type { IdConcepto } from "./coberturas";

export type IdCategoria = "grave" | "diario" | "familia" | "servicios" | "dinero" | "exterior";

/** Grupos de bondades, en el orden en que se muestran (al clasificar, los más específicos se revisan primero). */
export const CATEGORIAS: readonly { id: IdCategoria; l: string; re: RegExp }[] = [
  { id: "grave", l: "Protección para su familia", re: /fallecimiento|seguro de vida|suma asegurada|invalidez|enfermedad grave|muerte|beneficiario/ },
  { id: "familia", l: "Para sus metas", re: /educacion|universidad|retiro|jubilacion|pension|meta|hij[oa]s|vivienda/ },
  { id: "servicios", l: "Servicios incluidos", re: /estado de cuenta|en linea|app\b|aplicacion|asesor|reporte|consulta|asistencia|descuento/ },
  { id: "dinero", l: "Su dinero: costos y rescates", re: /rescate|retiro|penalidad|cargo|comision|administracion|liquidez|sin costo|bono|lealtad|permanencia/ },
  { id: "exterior", l: "Fondos y diversificación", re: /fondo|portafolio|renta fija|renta variable|acciones|bonos|diversific|dolares|internacional/ },
  { id: "diario", l: "Aportes y flexibilidad", re: /aporte|prima|flexib|pausa|suspender|aumentar|disminuir|extraordinari|plazo/ },
];

/** Orden para clasificar: lo específico antes que lo general. */
export const ORDEN_CLASIFICAR: readonly IdCategoria[] = ["grave", "servicios", "dinero", "exterior", "familia", "diario"];

/** Una frase tangible: dice un dato concreto (%, $, años, meses) o nombra algo concreto del plan. */
export const TANGIBLE = /\d\s?%|\$\s?\d|\d+\s?(usd|dolares|anos|meses|dias|veces)\b|sin costo|sin penalidad|sin cargo|incluye|incluido|acceso|en linea|estado de cuenta|fondo|bono|suma asegurada|fallecimiento|retiro parcial|aporte extraordinario/;

/** Conceptos de la tabla que van en el resumen gráfico, en orden de importancia. */
export const DESTACADOS: readonly { id: IdConcepto; l: string }[] = [
  { id: "prima", l: "Aporte mínimo" },
  { id: "unico", l: "Aporte único" },
  { id: "plazo", l: "Plazos" },
  { id: "vida", l: "Cobertura de vida" },
  { id: "fondos", l: "Fondos" },
  { id: "admin", l: "Administración" },
  { id: "sinPenalidad", l: "Sin penalidad desde" },
  { id: "bono", l: "Bono" },
  { id: "retiros", l: "Retiros parciales" },
  { id: "estado", l: "Estado de cuenta" },
]

export const MAX_DESTACADOS = 8;
export const MAX_BONDADES = 14;
