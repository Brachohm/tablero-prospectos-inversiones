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

/** Años del rango elegido en versiones anteriores ("¿En cuánto tiempo necesitará ese dinero?"). */
const HORIZONTE_ANIOS: Readonly<Record<string, number>> = {
  "Menos de 3 años": 2,
  "3 a 5 años": 4,
  "5 a 10 años": 7,
  "10 a 20 años": 15,
  "Más de 20 años": 25,
};

/** Tiempo de inversión (años): en cuánto tiempo va a usar ese dinero. Lee también fichas antiguas. */
export function aniosInversion(p: Prospecto): number | null {
  const n = num(p, "plazoAnios");
  if (n !== null && n > 0) return n;
  const h = HORIZONTE_ANIOS[txt(p, "horizonte")];
  if (h) return h;
  const edad = num(p, "edad");
  const er = num(p, "edadRetiro");
  return edad !== null && er !== null && er > edad ? er - edad : null;
}

/** El tiempo de inversión en texto ("12 años"). */
export function textoPlazo(p: Prospecto): string {
  const n = num(p, "plazoAnios");
  if (n !== null && n > 0) return `${n} ${n === 1 ? "año" : "años"}`;
  if (txt(p, "horizonte")) return txt(p, "horizonte");
  const a = aniosInversion(p);
  return a ? `${a} años` : "";
}

export const esUnica = (p: Prospecto) => txt(p, "tipoPlan") === "Contribución única";

export interface AhorroMeta {
  monto: number;
  /** Tiempo de inversión (años). */
  anios: number;
  /** Contribución única: lo que tendría que aportar hoy, de una vez. Regular: 0. */
  unico: number;
  /** Contribución regular: ahorro aproximado, sin contar rendimiento. Única: 0. */
  anual: number;
  mensual: number;
}

/** Cuánto ahorrar para llegar al monto en el tiempo de inversión (sin rendimiento). */
export function ahorroMetaDe(p: Prospecto): AhorroMeta | null {
  const monto = num(p, "metaMonto");
  const anios = aniosInversion(p);
  if (monto === null || monto <= 0 || anios === null || anios <= 0) return null;
  const hoy = Math.max(0, num(p, "ahorros") ?? 0);
  const falta = Math.max(0, monto - hoy);
  if (esUnica(p)) return { monto, anios, unico: Math.round(falta), anual: 0, mensual: 0 };
  return { monto, anios, unico: 0, anual: Math.round(falta / anios), mensual: Math.round(falta / anios / 12) };
}

export interface PuntoAhorro {
  anio: number;
  /** Edad ese año (si se sabe su edad). */
  edad: number | null;
  /** Saldo al cierre del año con el aporte necesario. */
  saldo: number;
  /** Saldo con el aporte que hoy plantea (si lo hay). */
  conAporte: number | null;
}

export interface ProyeccionAhorro {
  unica: boolean;
  monto: number;
  anios: number;
  ahorroHoy: number;
  /** Rendimiento anual estimado (%). */
  rend: number;
  /** En lo que se convierte su ahorro de hoy al final del plazo. */
  ahorroFuturo: number;
  /** Lo que falta cubrir con aportes (0 si su ahorro de hoy ya alcanza). */
  falta: number;
  /** Contribución única: aporte necesario hoy, de una vez. */
  unico: number;
  /** Contribución regular: aporte necesario a fin de cada año, con interés compuesto anual. */
  anual: number;
  mensual: number;
  /** Aporte que hoy plantea (mensual en regular, único en única) y a cuánto llegaría con él. */
  aporte: number | null;
  finalConAporte: number | null;
  puntos: PuntoAhorro[];
}

/**
 * Proyección del ahorro con interés compuesto anual en el tiempo de inversión.
 * Regular: su ahorro de hoy y los aportes de cada año (a fin de año) crecen al rendimiento estimado.
 * Única: su ahorro de hoy y un aporte único hoy crecen al rendimiento estimado.
 */
export function proyeccionAhorroDe(p: Prospecto): ProyeccionAhorro | null {
  const monto = num(p, "metaMonto");
  const n = aniosInversion(p);
  if (monto === null || monto <= 0 || n === null || n <= 0 || !txt(p, "rendEstimado")) return null;
  const unica = esUnica(p);
  const rend = num(p, "rendEstimado") ?? 0;
  const r = rend / 100;
  const ahorroHoy = Math.max(0, num(p, "ahorros") ?? 0);
  const f = Math.pow(1 + r, n);
  const ahorroFuturo = ahorroHoy * f;
  const falta = Math.max(0, monto - ahorroFuturo);
  const unico = unica ? falta / f : 0;
  const anual = unica || falta === 0 ? 0 : r === 0 ? falta / n : (falta * r) / (f - 1);
  const ap = unica ? (num(p, "precio") ?? num(p, "capital")) : (num(p, "precio") ?? num(p, "aporte"));
  const aporte = ap !== null && ap > 0 ? ap : null;
  const edad = num(p, "edad");
  const puntos: PuntoAhorro[] = [];
  let saldo = ahorroHoy + unico;
  let conAp = ahorroHoy + (unica ? (aporte ?? 0) : 0);
  const hitos = new Set([1, 5, 10, 15, 20, 25, 30, 35, 40, n].filter((a) => a <= n));
  for (let a = 1; a <= n; a++) {
    saldo = saldo * (1 + r) + anual;
    conAp = conAp * (1 + r) + (unica ? 0 : (aporte ?? 0) * 12);
    if (hitos.has(a))
      puntos.push({
        anio: a,
        edad: edad !== null ? edad + a : null,
        saldo: Math.round(saldo),
        conAporte: aporte !== null ? Math.round(conAp) : null,
      });
  }
  return {
    unica,
    monto,
    anios: n,
    ahorroHoy,
    rend,
    ahorroFuturo: Math.round(ahorroFuturo),
    falta: Math.round(falta),
    unico: Math.round(unico),
    anual: Math.round(anual),
    mensual: Math.round(anual / 12),
    aporte,
    finalConAporte: aporte !== null ? Math.round(conAp) : null,
    puntos,
  };
}

/** Fondo de emergencia recomendado: de 3 a 6 meses de sus gastos (o del ingreso, si no hay gastos). */
export function fondoEmergenciaDe(p: Prospecto): { min: number; max: number; base: "gastos" | "ingreso" } | null {
  const g = num(p, "gastos");
  if (g !== null && g > 0) return { min: Math.round(g * 3), max: Math.round(g * 6), base: "gastos" };
  const ing = ingresoDe(p);
  return ing ? { min: Math.round(ing.v * 3), max: Math.round(ing.v * 6), base: "ingreso" } : null;
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
  if (txt(p, "meta")) out.push({ meta: txt(p, "meta"), monto: montoMeta(p), plazo: textoPlazo(p), prioridad: 1 });
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
  // El tiempo de inversión también cuenta: menos de 5 años, 1; de 5 a 9, 2; 10 o más, 3.
  const anios = aniosInversion(p);
  if (anios !== null) pts.push(anios < 5 ? 1 : anios < 10 ? 2 : 3);
  const promedio = pts.length ? Math.round((pts.reduce((a, b) => a + b, 0) / pts.length) * 100) / 100 : 0;
  const sugerido: PerfilRiesgo | null =
    pts.length < MIN_RESPUESTAS_PERFIL ? null : promedio < 1.7 ? "Conservador" : promedio < 2.4 ? "Moderado" : "Arriesgado";
  const declarado = txt(p, "perfil");
  const d = declarado as PerfilRiesgo;
  return {
    respondidas: pts.length,
    total: Object.keys(PUNTOS_PERFIL).length + 1,
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
