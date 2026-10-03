/**
 * Foto financiera del prospecto: capacidad de ahorro, meta de retiro y
 * perfil de riesgo por puntaje. Todo sale de lo que la persona contó: nada
 * se inventa y lo que falta queda en null.
 */
import { num, txt } from "./ficha";
import type { Prospecto } from "./tipos";
import { RANGOS_INGRESO } from "../config/finanzas";

export { RANGOS_INGRESO };

/** Porcentaje de lo que le sobra al mes que se considera un aporte cómodo. */
export const APORTE_COMODO_PCT = 30;

/** Edad hasta la que se calcula la renta de retiro (mínimo 15 años de renta). */
export const EDAD_FIN_RETIRO = 85;

export interface Capacidad {
  /** Ingreso usado: el exacto si lo dio, o el punto medio del rango. */
  ingreso: number;
  estimado: boolean;
  gastos: number;
  deudas: number;
  /** Lo que le queda al mes (puede ser negativo). */
  sobrante: number;
  /** Aporte cómodo sugerido (el % de lo que le sobra). */
  comodo: number;
  /** El aporte que dijo poder hacer, o el del pre-cierre. */
  aporte: number | null;
  /** Aporte / sobrante, en %. */
  pctDelSobrante: number | null;
  nivel: "comodo" | "exigente" | "no_alcanza" | "sin_aporte";
}

export function ingresoDe(p: Prospecto): { v: number; estimado: boolean } | null {
  const exacto = num(p, "ingreso");
  if (exacto !== null && exacto > 0) return { v: exacto, estimado: false };
  const r = RANGOS_INGRESO.find((x) => x.l === txt(p, "ingresoRango"));
  return r ? { v: r.v, estimado: true } : null;
}

export function capacidadDe(p: Prospecto): Capacidad | null {
  const ing = ingresoDe(p);
  const gastos = num(p, "gastos");
  if (!ing || gastos === null) return null;
  const deudas = num(p, "deudaCuota") ?? 0;
  const sobrante = Math.round(ing.v - gastos - deudas);
  const comodo = Math.max(0, Math.round((sobrante * APORTE_COMODO_PCT) / 100));
  const aporte = num(p, "precio") ?? num(p, "aporte");
  const pct = aporte !== null && sobrante > 0 ? Math.round((aporte / sobrante) * 100) : null;
  const nivel: Capacidad["nivel"] =
    aporte === null || aporte <= 0
      ? "sin_aporte"
      : sobrante <= 0 || aporte > sobrante
        ? "no_alcanza"
        : aporte > comodo
          ? "exigente"
          : "comodo";
  return { ingreso: ing.v, estimado: ing.estimado, gastos, deudas, sobrante, comodo, aporte, pctDelSobrante: pct, nivel };
}

/** Cuotas de deuda sobre el ingreso que se consideran altas. */
export const DEUDA_ALTA_PCT = 30;

/** Qué parte del ingreso se va en cuotas de deudas (%), o null si falta el dato. */
export function pesoDeudas(p: Prospecto): number | null {
  const ing = ingresoDe(p);
  const cuota = num(p, "deudaCuota");
  if (!ing || cuota === null || ing.v <= 0) return null;
  return Math.round((cuota / ing.v) * 100);
}

/** Tiene deudas de tarjeta (según lo que contó). */
export function deudaTarjeta(p: Prospecto): boolean {
  return /tarjeta/i.test(txt(p, "deudas"));
}

export interface AhorroMeta {
  monto: number;
  edad: number;
  edadRetiro: number;
  /** Años que le quedan trabajando (hasta la edad de retiro). */
  anios: number;
  /** Ahorro aproximado, sin contar rendimiento. */
  anual: number;
  mensual: number;
}

/** Cuánto ahorrar para llegar al monto que quiere, en los años que le quedan trabajando (sin rendimiento). */
export function ahorroMetaDe(p: Prospecto): AhorroMeta | null {
  const monto = num(p, "metaMonto");
  const edad = num(p, "edad");
  const edadRetiro = num(p, "edadRetiro");
  if (monto === null || monto <= 0 || edad === null || edadRetiro === null) return null;
  const anios = edadRetiro - edad;
  if (anios <= 0) return null;
  const anual = Math.round(monto / anios);
  return { monto, edad, edadRetiro, anios, anual, mensual: Math.round(monto / anios / 12) };
}

export interface MetaRetiro {
  renta: number;
  anios: number;
  monto: number;
  /** Años que faltan para retirarse (si hay edad). */
  faltan: number | null;
}

/** Fichas antiguas: meta de retiro con la renta mensual deseada × 12 × años de retiro (sin rendimiento ni IESS). */
export function metaRetiroDe(p: Prospecto): MetaRetiro | null {
  const renta = num(p, "rentaRetiro");
  const edadR = num(p, "edadRetiro");
  if (renta === null || renta <= 0 || edadR === null) return null;
  const anios = Math.max(15, EDAD_FIN_RETIRO - edadR);
  const edad = num(p, "edad");
  return { renta, anios, monto: Math.round(renta * 12 * anios), faltan: edad !== null ? Math.max(0, edadR - edad) : null };
}

/** Monto de la meta principal: el escrito, o el de retiro calculado. */
export function montoMeta(p: Prospecto): number | null {
  const m = num(p, "metaMonto");
  if (m !== null && m > 0) return m;
  return txt(p, "meta") === "Retiro o jubilación" ? (metaRetiroDe(p)?.monto ?? null) : null;
}

export interface MetaFicha {
  meta: string;
  monto: number | null;
  plazo: string;
  prioridad: number;
}

/** Hasta tres metas, en orden de prioridad. */
export function metasDe(p: Prospecto): MetaFicha[] {
  const out: MetaFicha[] = [];
  if (txt(p, "meta")) out.push({ meta: txt(p, "meta"), monto: montoMeta(p), plazo: txt(p, "horizonte"), prioridad: 1 });
  for (const n of [2, 3]) {
    const m = txt(p, `meta${n}`);
    if (m) out.push({ meta: m, monto: num(p, `meta${n}Monto`), plazo: txt(p, `meta${n}Plazo`), prioridad: out.length + 1 });
  }
  return out;
}

/* ---------- Perfil de riesgo por puntaje ---------- */

export type PerfilRiesgo = "Conservador" | "Moderado" | "Arriesgado";

/** Puntos (1 a 3) de cada respuesta del cuestionario. */
export const PUNTOS_PERFIL: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  rq_experiencia: { "Nunca he invertido": 1, "Pólizas o depósitos a plazo": 2, "Fondos, acciones o bonos": 3 },
  reaccion: { "Retiraría todo": 1, "No sabe": 1, "Esperaría a que se recupere": 2, "Aportaría más": 3 },
  rq_prioridad: {
    "Que no baje nunca": 1,
    "Poder sacarlo cuando quiera": 1,
    "Un equilibrio entre crecer y no bajar": 2,
    "Que crezca lo más posible": 3,
  },
  rq_peso: { "Más del 50 %": 1, "Entre 25 y 50 %": 2, "Menos del 25 %": 3 },
  horizonte: { "Menos de 3 años": 1, "3 a 5 años": 1, "5 a 10 años": 2, "10 a 20 años": 3, "Más de 20 años": 3 },
  ingresoEstable: { "Muy variable": 1, Variable: 2, Estable: 3 },
};

/** Respuestas mínimas para sugerir un perfil. */
export const MIN_RESPUESTAS_PERFIL = 4;

export interface PuntajePerfil {
  respondidas: number;
  total: number;
  /** Promedio de 1 a 3. */
  promedio: number;
  sugerido: PerfilRiesgo | null;
  /** Perfil declarado ("Cómo se describe"). */
  declarado: string;
  /** El declarado es más arriesgado que el sugerido. */
  diferencia: boolean;
}

const ORDEN: Record<PerfilRiesgo, number> = { Conservador: 1, Moderado: 2, Arriesgado: 3 };

export function puntajePerfil(p: Prospecto): PuntajePerfil {
  const pts = Object.entries(PUNTOS_PERFIL)
    .map(([k, m]) => m[txt(p, k)])
    .filter((x): x is number => typeof x === "number");
  const promedio = pts.length ? Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100 : 0;
  const sugerido: PerfilRiesgo | null =
    pts.length < MIN_RESPUESTAS_PERFIL ? null : promedio < 1.7 ? "Conservador" : promedio < 2.4 ? "Moderado" : "Arriesgado";
  const declarado = txt(p, "perfil");
  const d = declarado as PerfilRiesgo;
  return {
    respondidas: pts.length,
    total: Object.keys(PUNTOS_PERFIL).length,
    promedio,
    sugerido,
    declarado,
    diferencia: !!sugerido && d in ORDEN && ORDEN[d] > ORDEN[sugerido],
  };
}

/** Perfil para la estrategia: el más prudente entre el declarado y el sugerido. */
export function perfilEfectivo(p: Prospecto): PerfilRiesgo | null {
  const s = puntajePerfil(p);
  const d = s.declarado as PerfilRiesgo;
  const dec = d in ORDEN ? d : null;
  if (dec && s.sugerido) return ORDEN[dec] <= ORDEN[s.sugerido] ? dec : s.sugerido;
  return dec ?? s.sugerido;
}
