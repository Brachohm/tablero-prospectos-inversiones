/**
 * Índice de masa corporal (IMC) de cada persona de la declaración: talla en
 * m o cm, peso en kg o lb. Rangos de la OMS para adultos. No es un juicio:
 * es un dato para ver el panorama de salud y lo que la cobertura debe
 * considerar. En menores de 18 años no se clasifica (se usan tablas de
 * crecimiento por edad y sexo).
 */
import type { Persona } from "./tipos";

export type UnidadTalla = "m" | "cm";
export type UnidadPeso = "kg" | "lb";

const LB_A_KG = 0.45359237;

function numero(s: string | undefined): number | null {
  const t = (s ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Talla en metros (acepta "1,70" m o "170" cm; si en "m" escriben 170, se entiende cm). */
export function tallaMetros(valor: string | undefined, unidad: UnidadTalla = "m"): number | null {
  const n = numero(valor);
  if (n === null) return null;
  const m = unidad === "cm" || n > 3 ? n / 100 : n;
  return m >= 0.4 && m <= 2.5 ? m : null;
}

export function pesoKg(valor: string | undefined, unidad: UnidadPeso = "kg"): number | null {
  const n = numero(valor);
  if (n === null) return null;
  const kg = unidad === "lb" ? n * LB_A_KG : n;
  return kg >= 2 && kg <= 400 ? kg : null;
}

export type NivelIMC = "bajo" | "adecuado" | "sobrepeso" | "obesidad1" | "obesidad2" | "obesidad3";

export interface ResultadoIMC {
  /** IMC con un decimal. */
  valor: number;
  /** null en menores de 18 años (no se clasifica con estos rangos). */
  nivel: NivelIMC | null;
  rango: string;
  /** Factor de riesgo a tener presente (null si no aplica). */
  factor: string | null;
  /** Para el gráfico: posición del valor de 0 a 1 en la escala 15–40. */
  posicion: number;
}

export const RANGOS_IMC: readonly { nivel: NivelIMC; desde: number; l: string }[] = [
  { nivel: "bajo", desde: 0, l: "Bajo peso" },
  { nivel: "adecuado", desde: 18.5, l: "Peso adecuado" },
  { nivel: "sobrepeso", desde: 25, l: "Sobrepeso" },
  { nivel: "obesidad1", desde: 30, l: "Obesidad grado I" },
  { nivel: "obesidad2", desde: 35, l: "Obesidad grado II" },
  { nivel: "obesidad3", desde: 40, l: "Obesidad grado III" },
];

const FACTOR: Record<NivelIMC, string | null> = {
  bajo: "Puede asociarse a menos defensas y a deficiencias de nutrientes. Un chequeo ayuda a descartar causas.",
  adecuado: null,
  sobrepeso:
    "Con los años aumenta la probabilidad de presión alta, colesterol alto, diabetes tipo 2 y molestias en las articulaciones.",
  obesidad1:
    "Aumenta el riesgo de presión alta, diabetes tipo 2, enfermedades del corazón, apnea del sueño y desgaste de articulaciones.",
  obesidad2:
    "Riesgo alto de presión alta, diabetes tipo 2, enfermedades del corazón, apnea del sueño y desgaste de articulaciones.",
  obesidad3:
    "Riesgo muy alto de presión alta, diabetes tipo 2, enfermedades del corazón, apnea del sueño y desgaste de articulaciones.",
};

export function calcularIMC(kg: number, m: number): number {
  // El margen evita que 31,25 se redondee a 31,2 por la coma flotante.
  return Math.round((kg / (m * m)) * 10 + 1e-9) / 10;
}

/** IMC de una persona, o null si falta la talla o el peso. */
export function imcPersona(per: Persona): ResultadoIMC | null {
  const m = tallaMetros(per.talla, per.tallaU === "cm" ? "cm" : "m");
  const kg = pesoKg(per.peso, per.pesoU === "lb" ? "lb" : "kg");
  if (m === null || kg === null) return null;
  const valor = calcularIMC(kg, m);
  const posicion = Math.max(0, Math.min(1, (valor - 15) / 25));
  const edad = Number(per.edad);
  if (Number.isFinite(edad) && per.edad.trim() !== "" && edad < 18)
    return { valor, nivel: null, rango: "Menor de 18 años: se interpreta con tablas de crecimiento", factor: null, posicion };
  const r = [...RANGOS_IMC].reverse().find((x) => valor >= x.desde)!;
  return { valor, nivel: r.nivel, rango: r.l, factor: FACTOR[r.nivel], posicion };
}

/** Texto corto para el resumen: "IMC 27,3 · Sobrepeso". */
export function textoIMC(r: ResultadoIMC): string {
  return `IMC ${r.valor.toLocaleString("es-EC")} · ${r.nivel ? r.rango : "menor de edad"}`;
}

export const NOTA_IMC =
  "Es un dato para ver el panorama, no un juicio. El IMC no distingue músculo de grasa: tómalo como referencia. La aseguradora puede considerarlo al evaluar la solicitud (validar con la aseguradora).";
