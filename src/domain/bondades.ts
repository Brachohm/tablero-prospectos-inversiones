/**
 * Lo que vale la pena mostrar de cada plan en la propuesta, estudiando todo lo
 * cargado: su tabla de coberturas (resumen gráfico) y sus bondades tangibles
 * (frases con un dato o un servicio concreto) de sus listas y del texto de sus
 * PDF, para usarlas como argumentos de cierre. Solo frases escritas en el
 * material, tal cual, con su fuente: no se reescriben ni se inventan.
 */
import { CATEGORIAS, DESTACADOS, MAX_BONDADES, MAX_DESTACADOS, ORDEN_CLASIFICAR, TANGIBLE, type IdCategoria } from "../config/bondades";
import type { IdConcepto } from "../config/coberturas";
import { ESPERA, MODALIDADES, NIEGA } from "../config/recomendar";
import { lineas, normalizar, type Documento, type Plan } from "./biblioteca";
import { interpretar, tablaDe, tablaDesdeTexto } from "./comparar";
import { precargaDesdeDocumento } from "./extraer";
import { modalidadDe, type PlanCatalogo } from "./recomendar";

export interface Destacado {
  id: IdConcepto | "modalidad";
  l: string;
  /** El valor tal como está en la tabla ("100%", "$50.000", "30 días"). */
  v: string;
}

export interface Bondad {
  t: string;
  categoria: IdCategoria;
  fuente: string;
  /** Trae un dato concreto (%, $, días…): pesa más como argumento. */
  dato: boolean;
}

export interface Carencia {
  /** "Maternidad" (lo que espera) y la línea completa tal cual. */
  l: string;
  t: string;
  /** Meses de espera (null si la línea no dice cuánto). */
  meses: number | null;
  fuente: string;
}

export interface LetraChica {
  /** Lo que dice la tabla del plan sobre el deducible y el copago (tal cual). */
  deducible: string | null;
  copago: string | null;
  carencias: Carencia[];
  exclusiones: { t: string; fuente: string }[];
}

export interface FichaPlan extends LetraChica {
  destacados: Destacado[];
  bondades: Bondad[];
}

export const LETRA_CHICA_VACIA: LetraChica = { deducible: null, copago: null, carencias: [], exclusiones: [] };

/** Resumen gráfico: los conceptos de la tabla que el plan sí tiene (y su modalidad). */
export function destacadosDe(item: PlanCatalogo): Destacado[] {
  const t = tablaDe(item.plan.tabla);
  const out: Destacado[] = [];
  for (const d of DESTACADOS) {
    const v = t[d.id]?.trim();
    if (!v || interpretar(v).tipo === "no") continue;
    out.push({ id: d.id, l: d.l, v });
  }
  const mod = modalidadDe(item);
  const res = out.slice(0, MAX_DESTACADOS - (mod ? 1 : 0));
  // "Modalidad abierta" → "Abierta"; "Red cerrada" queda igual.
  if (mod) res.push({ id: "modalidad", l: "Modalidad", v: MODALIDADES[mod.m].l.replace(/^Modalidad (\p{L})/u, (_, c: string) => c.toUpperCase()) });
  return res;
}

export const LEGAL = /\b(articulo|clausula|literal|numeral|el asegurado debera|la compania|contratante|poliza de seguro|condiciones generales|vigencia del contrato|ley\b|reglamento)\b/;

export function limpiar(l: string): string {
  return l.replace(/^\s*([-•*·▪●◦]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim();
}

/** Encabezados y líneas sin contenido propio. */
export function esTitulo(l: string): boolean {
  return /:$/.test(l) || (l === l.toUpperCase() && !/\d/.test(l));
}

/** Clasifica una línea como bondad (o null si no sirve como argumento). */
export function clasificar(l0: string): { categoria: IdCategoria; dato: boolean } | null {
  const l = limpiar(l0);
  if (l.length < 12 || l.length > 200 || esTitulo(l)) return null;
  const n = normalizar(l);
  if (NIEGA.test(n) || LEGAL.test(n) || !TANGIBLE.test(n)) return null;
  // Tiempos de espera: van como aviso, no como bondad.
  if (ESPERA.test(n) && /carencia|espera/.test(n)) return null;
  // El aporte mínimo y los cargos son costos, no bondades (salvo "sin cargo" o "sin penalidad").
  const tb = tablaDesdeTexto(l);
  if (tb.prima || tb.unico || ((tb.admin || tb.entrada || tb.rescate) && !/\bsin (cargo|penalidad|costo|comision)/.test(n))) return null;
  const cat = ORDEN_CLASIFICAR.find((id) => CATEGORIAS.find((c) => c.id === id)!.re.test(n));
  if (!cat) return null;
  return { categoria: cat, dato: /\d/.test(n) || /ilimitad|sin costo|gratuit|24\s?\/\s?7/.test(n) };
}

const fuentePlan = (pl: Plan) => (pl.fuente ?? "").trim() || `${pl.nombre} (Biblioteca)`;

/** Página exacta del PDF donde está escrita la línea (o la fuente del plan). */
function citar(item: PlanCatalogo, linea: string): string {
  const buscada = normalizar(limpiar(linea));
  for (const d of item.docs)
    for (let i = 0; i < d.paginas.length; i++)
      if (d.paginas[i].split(/\r?\n/).some((l) => normalizar(limpiar(l)).includes(buscada))) return `${d.nombre}, pág. ${i + 1}`;
  return fuentePlan(item.plan);
}

/** Bondades tangibles: beneficios, garantías y coberturas del plan, y lo que dicen sus PDF. */
export function bondadesDe(item: PlanCatalogo, max = MAX_BONDADES): Bondad[] {
  const vistas = new Set<string>();
  // Lo que el plan o sus PDF ponen como carencia o exclusión nunca es una bondad.
  const noSon = new Set(
    [
      ...lineas(item.plan.carencias),
      ...lineas(item.plan.exclusiones),
      ...item.docs.flatMap((d) => {
        const x = precargaDesdeDocumento(d).campos;
        return [...(x.carencias ?? []), ...(x.exclusiones ?? [])];
      }),
    ].map((l) => normalizar(limpiar(l))),
  );
  const out: (Bondad & { orden: number })[] = [];
  const agregar = (l: string, fuente: string, extra: number) => {
    const c = clasificar(l);
    if (!c) return;
    const t = limpiar(l);
    if (noSon.has(normalizar(t))) return;
    const k = normalizar(t).replace(/[^a-z0-9%$]+/g, " ").trim();
    if (vistas.has(k) || [...vistas].some((v) => v.includes(k) || k.includes(v))) return;
    vistas.add(k);
    out.push({ t, fuente, ...c, orden: (c.dato ? 2 : 0) + extra });
  };
  const pl = item.plan;
  for (const l of lineas(pl.beneficios)) agregar(l, citar(item, l), 2);
  for (const l of lineas(pl.garantias)) agregar(l, citar(item, l), 2);
  for (const l of lineas(pl.coberturas)) agregar(l, citar(item, l), 1);
  for (const d of item.docs as Documento[])
    d.paginas.forEach((texto, i) => {
      for (const l of texto.split(/\r?\n/)) agregar(l, `${d.nombre}, pág. ${i + 1}`, 0);
    });
  const orden = (c: IdCategoria) => CATEGORIAS.findIndex((x) => x.id === c);
  // Lo más concreto primero; se reparte entre grupos para no llenar todo con uno solo.
  const elegidas = [...out].sort((a, b) => b.orden - a.orden).slice(0, max);
  return elegidas.sort((a, b) => orden(a.categoria) - orden(b.categoria) || b.orden - a.orden).map((b) => ({ t: b.t, categoria: b.categoria, fuente: b.fuente, dato: b.dato }));
}

export function fichaPlan(item: PlanCatalogo): FichaPlan {
  return { destacados: destacadosDe(item), bondades: bondadesDe(item), ...letraChicaDe(item) };
}

/** Meses de espera de una línea: "10 meses", "90 días", "2 años" (null si no lo dice). */
export function mesesDe(linea: string): number | null {
  const n = normalizar(linea);
  const m = /(\d+(?:[.,]\d+)?)\s*(mes|meses|dia|dias|ano|anos)\b/.exec(n);
  if (!m) return null;
  const v = Number(m[1].replace(",", "."));
  if (!Number.isFinite(v)) return null;
  const meses = m[2].startsWith("mes") ? v : m[2].startsWith("dia") ? v / 30 : v * 12;
  return Math.round(meses * 10) / 10;
}

const MAX_EXCLUSIONES = 8;

/**
 * Lo que la persona debe saber antes de decidir, sin ocultar nada: deducible,
 * copago, tiempos de espera (carencias) y exclusiones, tal como los dicen el
 * plan y sus PDF.
 */
export function letraChicaDe(item: PlanCatalogo): LetraChica {
  const t = tablaDe(item.plan.tabla);
  const deDocs = item.docs.map((d) => precargaDesdeDocumento(d).campos);
  const unir = (xs: string[]) => {
    const vistas = new Set<string>();
    return xs.map(limpiar).filter((x) => x && !vistas.has(normalizar(x)) && (vistas.add(normalizar(x)), true));
  };
  const carencias = unir([...lineas(item.plan.carencias), ...deDocs.flatMap((x) => x.carencias ?? [])]).map((x) => {
    const l = x.split(/:\s*/)[0].trim();
    return { l: l.length <= 50 && l !== x ? l : x, t: x, meses: mesesDe(x), fuente: citar(item, x) };
  });
  const exclusiones = unir([...lineas(item.plan.exclusiones), ...deDocs.flatMap((x) => x.exclusiones ?? [])])
    .slice(0, MAX_EXCLUSIONES)
    .map((x) => ({ t: x, fuente: citar(item, x) }));
  // La línea del PDF dice más que el valor de la tabla ("Deducible anual: $300" → es por año).
  const lineaDoc = (re: RegExp) => {
    for (const d of item.docs)
      for (const p of d.paginas)
        for (const l of p.split(/\r?\n/)) {
          const x = limpiar(l);
          const n = normalizar(x);
          if (re.test(n) && /\d/.test(n) && x.length <= 120 && !NIEGA.test(n)) return x;
        }
    return null;
  };
  return {
    deducible: lineaDoc(/\b(administracion|cargo anual|comision anual)/) ?? (t.admin?.trim() || null),
    copago: lineaDoc(/\b(rescate|penalidad)/) ?? (t.rescate?.trim() || null),
    carencias: carencias.sort((a, b) => (a.meses ?? Infinity) - (b.meses ?? Infinity)),
    exclusiones,
  };
}

export function nombreCategoria(c: IdCategoria): string {
  return CATEGORIAS.find((x) => x.id === c)!.l;
}
