/**
 * Objetivo mensual: suma la prima mensual ("Precio mensual") de los contratos
 * cerrados en el mes y estima cuántos clientes faltan para cada objetivo
 * (de 1 a 4, con su beneficio si aplica). La estimación usa la prima promedio de tus cierres (o, si aún no
 * hay, la de tus propuestas con precio): es aproximada.
 */
import { MAX_OBJETIVOS, OBJETIVOS_INICIALES } from "../config/objetivos";
import { ETAPA_CERRADO, ETAPA_PRECIERRE } from "../config/ficha";
import { hoyISO } from "./fechas";
import { comisionDe } from "./comisiones";
import type { FilaComision } from "../config/comisiones";
import { etapaDe, num, txt, vendido } from "./ficha";
import type { Prospecto } from "./tipos";

/** Día de cierre (AAAA-MM-DD): el registrado al pasar a "Cerrado"; si no hay, el inicio de vigencia o la última edición. */
export function fechaCierre(p: Prospecto): string | null {
  if (!vendido(p)) return null;
  const c = txt(p, "cerradoEn") || txt(p, "cli_afiliacion");
  if (/^\d{4}-\d{2}-\d{2}$/.test(c)) return c;
  return p.mod ? hoyISO(new Date(p.mod)) : null;
}

/** Al cambiar de etapa: registra el día del cierre (cada vez que entra a "Cerrado"). */
export function conEtapa(p: Prospecto, etapa: string, hoy: string): Prospecto {
  if (etapa === ETAPA_CERRADO && !vendido(p)) return { ...p, etapa, cerradoEn: hoy };
  return { ...p, etapa };
}

/** Un objetivo configurado: monto de prima mensual y, si aplica, el beneficio que desbloquea. */
export interface ObjetivoConfig {
  monto: number;
  beneficio: boolean;
  detalle: string;
}

/** Objetivos válidos: de 1 a 4, con monto mayor que 0, de menor a mayor y sin repetir. */
export function normalizarObjetivos(os: readonly ObjetivoConfig[] | undefined): ObjetivoConfig[] {
  const vistos = new Set<number>();
  const v = (os ?? [])
    .filter((o) => Number.isFinite(o.monto) && o.monto > 0)
    .sort((a, b) => a.monto - b.monto)
    .filter((o) => (vistos.has(o.monto) ? false : (vistos.add(o.monto), true)))
    .map((o) => ({ monto: o.monto, beneficio: !!o.beneficio && !!o.detalle.trim(), detalle: o.detalle.trim() }))
    .slice(0, MAX_OBJETIVOS);
  return v.length ? v : OBJETIVOS_INICIALES.map((o) => ({ ...o }));
}

export interface Escalon {
  prima: number;
  /** Beneficio que desbloquea ("" si no tiene). */
  detalle: string;
  logrado: boolean;
  falta: number;
  /** Clientes aproximados que faltan (null si no hay prima de referencia). */
  clientes: number | null;
}

export interface Objetivo {
  /** Mes (AAAA-MM). */
  mes: string;
  meta: number;
  prima: number;
  cierres: number;
  /** Avance hacia la meta (0-100, puede pasar de 100). */
  pct: number;
  /** Prima promedio usada para estimar (null si no hay datos). */
  promedio: number | null;
  /** De dónde sale el promedio. */
  base: "cierres" | "propuestas" | null;
  escalones: Escalon[];
  /** Beneficio más alto desbloqueado ("" si ninguno). */
  desbloqueado: string;
  /** Prima en propuestas abiertas (segunda reunión, seguimiento y pre-cierre). */
  enJuego: number;
  /** Prima de las fichas en pre-cierre (ya van a contratar): la simulación de la barra. */
  enPrecierre: number;
  diasRestantes: number;
  /** Comisión estimada de los cierres del mes (según tipo de plan y plazo). */
  comision: number;
}

const EN_JUEGO = ["Segunda reunión", ETAPA_PRECIERRE];

function prima(p: Prospecto): number | null {
  const n = num(p, "precio");
  return n !== null && n > 0 ? n : null;
}

export function objetivoMes(
  items: readonly Prospecto[],
  hoy: string = hoyISO(),
  objetivos: readonly ObjetivoConfig[] = OBJETIVOS_INICIALES,
  comisiones?: readonly FilaComision[],
): Objetivo {
  const lista = normalizarObjetivos(objetivos);
  const meta = lista[0].monto;
  const mes = hoy.slice(0, 7);
  const delMes = items.filter((p) => fechaCierre(p)?.startsWith(mes));
  const total = delMes.reduce((a, p) => a + (prima(p) ?? 0), 0);

  const cerrados = items.filter(vendido).map(prima).filter((x): x is number => x !== null);
  const propuestas = items.map(prima).filter((x): x is number => x !== null);
  const prom = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const promedio = prom(cerrados) ?? prom(propuestas);
  const base = cerrados.length ? "cierres" : propuestas.length ? "propuestas" : null;

  const esc = lista.map((o) => {
    const falta = Math.max(0, o.monto - total);
    return {
      prima: o.monto,
      detalle: o.beneficio ? o.detalle : "",
      logrado: total >= o.monto,
      falta,
      clientes: falta === 0 ? 0 : promedio ? Math.ceil(falta / promedio) : null,
    };
  });
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();

  return {
    mes,
    meta,
    prima: Math.round(total * 100) / 100,
    cierres: delMes.length,
    pct: meta ? Math.round((total / meta) * 100) : 0,
    promedio: promedio === null ? null : Math.round(promedio * 100) / 100,
    base,
    escalones: esc,
    desbloqueado: [...esc].reverse().find((e) => e.logrado && e.detalle)?.detalle ?? "",
    enJuego: items
      .filter((p) => EN_JUEGO.includes(etapaDe(p)))
      .reduce((s, p) => s + (prima(p) ?? 0), 0),
    enPrecierre: items
      .filter((p) => etapaDe(p) === ETAPA_PRECIERRE)
      .reduce((s, p) => s + (prima(p) ?? 0), 0),
    diasRestantes: ultimo - Number(hoy.slice(8, 10)),
    comision: Math.round(delMes.reduce((a, p) => a + (comisionDe(p, comisiones)?.monto ?? 0), 0) * 100) / 100,
  };
}

export function nombreMes(mes: string): string {
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return meses[Number(mes.slice(5, 7)) - 1] ?? mes;
}
