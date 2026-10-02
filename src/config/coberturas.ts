/**
 * Conceptos de la tabla de coberturas para comparar el plan actual de la
 * persona con los planes de la Biblioteca. Editables.
 *   mejor: "mas"  → un valor mayor es mejor (montos, porcentajes de cobertura)
 *          "menos" → un valor menor es mejor (prima, deducible, copago, días)
 *          "texto" → no se compara solo; se muestra lado a lado
 *   claves: palabras para reconocerlo en un Excel o PDF (sin tildes, minúsculas)
 */
import type { MotivoId } from "../domain/tipos";

export type IdConcepto =
  | "prima"
  | "deducible"
  | "copago"
  | "maximo"
  | "hospitalaria"
  | "ambulatoria"
  | "medicinas"
  | "examenes"
  | "maternidad"
  | "emergencias"
  | "odontologia"
  | "preexistencias"
  | "exterior"
  | "reembolso"
  | "telemedicina"
  | "red";

export const CONCEPTOS: readonly { id: IdConcepto; l: string; mejor: "mas" | "menos" | "texto"; claves: string[]; ph?: string }[] = [
  { id: "prima", l: "Prima mensual (USD)", mejor: "menos", claves: ["prima", "cuota mensual", "valor mensual", "pago mensual", "tarifa"], ph: "$80" },
  { id: "deducible", l: "Deducible", mejor: "menos", claves: ["deducible"], ph: "$500 al año" },
  { id: "copago", l: "Copago / coaseguro", mejor: "menos", claves: ["copago", "coaseguro"], ph: "20%" },
  { id: "maximo", l: "Cobertura máxima anual", mejor: "mas", claves: ["cobertura maxima", "monto maximo", "suma asegurada", "limite anual", "tope anual", "monto de cobertura"], ph: "$50.000" },
  { id: "hospitalaria", l: "Hospitalización y cirugía", mejor: "mas", claves: ["hospital", "cirugia", "internacion"], ph: "100%" },
  { id: "ambulatoria", l: "Consultas y ambulatorio", mejor: "mas", claves: ["ambulatori", "consulta"], ph: "80%" },
  { id: "medicinas", l: "Medicinas", mejor: "mas", claves: ["medicina", "medicamento", "farmac"], ph: "80%" },
  { id: "examenes", l: "Exámenes e imágenes", mejor: "mas", claves: ["examen", "laboratorio", "imagen", "diagnostico"], ph: "80%" },
  { id: "maternidad", l: "Maternidad", mejor: "mas", claves: ["maternidad", "parto", "embarazo"], ph: "$2.000 / No incluye" },
  { id: "emergencias", l: "Emergencias", mejor: "mas", claves: ["emergencia", "urgencia"], ph: "100%" },
  { id: "odontologia", l: "Odontología", mejor: "mas", claves: ["odonto", "dental"], ph: "No incluye" },
  { id: "preexistencias", l: "Preexistencias", mejor: "mas", claves: ["preexisten"], ph: "$5.000 después de 24 meses" },
  { id: "exterior", l: "Cobertura en el exterior", mejor: "mas", claves: ["exterior", "internacional", "fuera del pais"], ph: "Emergencias / No" },
  { id: "reembolso", l: "Días para el reembolso", mejor: "menos", claves: ["reembolso"], ph: "30 días" },
  { id: "telemedicina", l: "Telemedicina", mejor: "mas", claves: ["telemedicina", "teleconsulta", "medico virtual"], ph: "Sí / No" },
  { id: "red", l: "Red de clínicas", mejor: "texto", claves: ["red de", "clinicas", "prestadores"], ph: "Clínicas de Quito y Guayaquil" },
];

/** Qué conceptos pesan más según los motivos de inconformidad de la persona. */
export const CONCEPTOS_POR_MOTIVO: Readonly<Partial<Record<MotivoId, IdConcepto[]>>> = {
  costos: ["prima"],
};
