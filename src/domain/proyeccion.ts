/** Proyección del plan: cuánto podría acumular con su aporte y plazo, en tres escenarios. */
import { ESCENARIOS_INICIALES, HITOS_ANIOS, type Escenarios } from "../config/proyeccion";
import { num, txt } from "./ficha";
import { aniosInversion, montoMeta } from "./finanzas";
import type { Prospecto } from "./tipos";

export interface PuntoProyeccion {
  anio: number;
  aportado: number;
  conservador: number;
  moderado: number;
  optimista: number;
}

export interface Proyeccion {
  /** Aporte mensual (regular) o 0. */
  mensual: number;
  /** Aporte único inicial o 0. */
  unico: number;
  anios: number;
  tasas: Escenarios;
  puntos: PuntoProyeccion[];
  final: PuntoProyeccion;
  /** Meta de la ficha, si la hay, y si cada escenario la alcanza. */
  meta: number | null;
  alcanza: Record<keyof Escenarios, boolean> | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Valor al cierre de cada año: aportes mensuales al inicio de cada mes, interés compuesto mensual. */
export function valorFuturo(mensual: number, unico: number, anios: number, tasaAnual: number): number {
  const i = Math.pow(1 + tasaAnual / 100, 1 / 12) - 1;
  let v = unico;
  for (let m = 0; m < anios * 12; m++) v = (v + mensual) * (1 + i);
  return r2(v);
}

/** Escenarios válidos: números entre -20 y 30, ordenados de menor a mayor. */
export function normalizarEscenarios(e: Partial<Escenarios> | undefined): Escenarios {
  const v = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) && x >= -20 && x <= 30 ? x : d);
  const xs = [
    v(e?.conservador, ESCENARIOS_INICIALES.conservador),
    v(e?.moderado, ESCENARIOS_INICIALES.moderado),
    v(e?.optimista, ESCENARIOS_INICIALES.optimista),
  ].sort((a, b) => a - b);
  return { conservador: xs[0], moderado: xs[1], optimista: xs[2] };
}

export function proyectar(
  mensual: number,
  unico: number,
  anios: number,
  tasas: Escenarios = ESCENARIOS_INICIALES,
  meta: number | null = null,
): Proyeccion | null {
  if (!(anios >= 1) || (mensual <= 0 && unico <= 0)) return null;
  const n = Math.min(50, Math.round(anios));
  const hitos = [...new Set([...HITOS_ANIOS.filter((a) => a < n), n])];
  const punto = (a: number): PuntoProyeccion => ({
    anio: a,
    aportado: r2(unico + mensual * 12 * a),
    conservador: valorFuturo(mensual, unico, a, tasas.conservador),
    moderado: valorFuturo(mensual, unico, a, tasas.moderado),
    optimista: valorFuturo(mensual, unico, a, tasas.optimista),
  });
  const puntos = hitos.map(punto);
  const final = puntos[puntos.length - 1];
  const m = meta && meta > 0 ? meta : null;
  return {
    mensual,
    unico,
    anios: n,
    tasas,
    puntos,
    final,
    meta: m,
    alcanza: m
      ? { conservador: final.conservador >= m, moderado: final.moderado >= m, optimista: final.optimista >= m }
      : null,
  };
}

/** Proyección con lo de la ficha: tipo de plan, plazo y aporte del pre-cierre (o lo que dijo poder aportar). */
export function proyeccionDe(p: Prospecto, tasas?: Partial<Escenarios>): Proyeccion | null {
  const plan = txt(p, "tipoPlan");
  const precio = num(p, "precio");
  const anios = num(p, "plazo") ?? aniosInversion(p);
  if (anios === null) return null;
  let mensual = 0;
  let unico = 0;
  if (plan === "Contribución única") unico = precio ?? num(p, "capital") ?? 0;
  else mensual = precio ?? num(p, "aporte") ?? 0;
  return proyectar(mensual, unico, anios, normalizarEscenarios(tasas), montoMeta(p));
}
