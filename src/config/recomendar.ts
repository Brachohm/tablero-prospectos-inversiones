/**
 * Necesidades que la app reconoce en la ficha para recomendar un plan.
 * `conceptos`: dónde mirar en la tabla de coberturas del plan.
 * `palabras`: qué buscar en los PDF del plan (minúsculas, sin tildes; basta el
 * inicio de la palabra). Editables.
 */
import type { IdConcepto } from "./coberturas";

export type IdNecesidad =
  | "hospital"
  | "emergencias"
  | "medicinas"
  | "accidentes"
  | "maternidad"
  | "ninos"
  | "ambulatorio"
  | "preexistencias"
  | "cronicas"
  | "exterior"
  | "reembolso"
  | "deducible"
  | "red"
  | "telemedicina"
  | "medico";

export const NECESIDADES: Readonly<Record<IdNecesidad, { l: string; conceptos: IdConcepto[]; palabras: string[] }>> = {
  hospital: { l: "Hospitalización y cirugía", conceptos: ["hospitalaria", "maximo"], palabras: ["hospitaliz", "cirugia"] },
  emergencias: { l: "Emergencias", conceptos: ["emergencias"], palabras: ["emergencia"] },
  medicinas: { l: "Medicinas", conceptos: ["medicinas"], palabras: ["medicamento", "medicinas", "farmac"] },
  accidentes: { l: "Accidentes", conceptos: ["emergencias"], palabras: ["accidente"] },
  maternidad: { l: "Maternidad", conceptos: ["maternidad"], palabras: ["maternidad", "parto", "embarazo"] },
  ninos: { l: "Atención para los niños", conceptos: ["ambulatoria"], palabras: ["pediatr", "vacuna", "recien nacido"] },
  ambulatorio: { l: "Consultas y exámenes", conceptos: ["ambulatoria", "examenes"], palabras: ["ambulatori", "consulta", "examen", "laboratorio"] },
  preexistencias: { l: "Preexistencias declaradas", conceptos: ["preexistencias"], palabras: ["preexisten"] },
  cronicas: { l: "Enfermedades crónicas y chequeos", conceptos: ["medicinas", "maximo"], palabras: ["cronic", "chequeo", "preventiv"] },
  exterior: { l: "Cobertura en el exterior", conceptos: ["exterior"], palabras: ["exterior", "internacional", "extranjero"] },
  reembolso: { l: "Reembolsos ágiles", conceptos: ["reembolso"], palabras: ["reembolso"] },
  deducible: { l: "Deducible y copago bajos", conceptos: ["deducible", "copago"], palabras: ["deducible", "copago", "coaseguro"] },
  red: { l: "Red de médicos y clínicas", conceptos: ["red"], palabras: ["red de", "prestador", "clinica"] },
  telemedicina: { l: "Atención y telemedicina", conceptos: ["telemedicina"], palabras: ["telemedicina", "teleconsulta", "medico virtual"] },
  // Se revisa por la modalidad del plan (y por si su médico aparece en sus PDF).
  medico: { l: "Seguir con su médico de cabecera", conceptos: [], palabras: [] },
};

export type Modalidad = "abierta" | "mixta" | "cerrada";

export const MODALIDADES: Readonly<Record<Modalidad, { l: string; ev: string }>> = {
  abierta: { l: "Modalidad abierta", ev: "Modalidad abierta: permite atenderse también fuera de la red de convenio" },
  mixta: { l: "Modalidad mixta", ev: "Modalidad mixta: red de convenio y atención fuera de ella" },
  cerrada: { l: "Red cerrada", ev: "Red cerrada: se atiende solo en la red de convenio" },
};

/** Cómo reconocer la modalidad en un texto (minúsculas, sin tildes). El orden importa. */
export const RECONOCER_MODALIDAD: readonly [Modalidad, RegExp][] = [
  ["mixta", /\b(modalidad mixta|mixt[oa])\b/],
  ["cerrada", /\b(red cerrada|modalidad cerrada|cerrad[oa]|red exclusiva|(solo|unicamente|exclusivamente) (en|dentro de) (la|su) red)\b/],
  ["abierta", /\b(modalidad abierta|red abierta|abiert[oa]|libre eleccion)\b/],
];

/** Una línea del PDF que dice que algo NO está cubierto. */
export const NIEGA = /\b(no (se )?(cubre|cubren|incluye|incluyen|aplica|ampara)|excluid|exclusion|se excluye|sin cobertura)/;

/** Una línea del PDF que habla de un tiempo de espera. */
export const ESPERA = /(carencia|periodo de espera|tiempo de espera|\d+\s*(mes|meses|dias)\b)/;
