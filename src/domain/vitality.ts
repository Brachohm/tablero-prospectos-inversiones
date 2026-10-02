/**
 * Vitality: si un plan lo tiene (en sus datos o en sus PDF), una mini sección
 * con sus beneficios semanales, mensuales y anuales, sacados tal cual de los
 * documentos de la Biblioteca que hablan de Vitality.
 */
import { BENEFICIO_VITALITY, MAX_POR_PERIODO, PERIODOS_VITALITY, RE_VITALITY } from "../config/vitality";
import { NIEGA } from "../config/recomendar";
import { normalizar, type Documento } from "./biblioteca";
import { esTitulo, LEGAL, limpiar } from "./bondades";
import type { PlanCatalogo } from "./recomendar";

export interface LineaVitality {
  t: string;
  fuente: string;
}

export interface Vitality {
  semanal: LineaVitality[];
  mensual: LineaVitality[];
  anual: LineaVitality[];
  /** Otros beneficios del programa (sin periodo). */
  otros: LineaVitality[];
}

const conV = (s: string | undefined) => RE_VITALITY.test(normalizar(s ?? ""));

/** El plan tiene Vitality: lo dicen sus datos o sus PDF. */
export function tieneVitality(item: PlanCatalogo): boolean {
  const pl = item.plan;
  if ([pl.nombre, pl.beneficios, pl.coberturas, pl.notas, pl.garantias].some(conV)) return true;
  return item.docs.some((d) => d.paginas.some(conV));
}

/** Beneficios de Vitality en los documentos (los del plan y los que tratan de Vitality). */
export function vitalityDe(item: PlanCatalogo, todos: readonly Documento[] = []): Vitality | null {
  if (!tieneVitality(item)) return null;
  const docs = [...item.docs, ...todos.filter((d) => !item.docs.includes(d))];
  const out: Vitality = { semanal: [], mensual: [], anual: [], otros: [] };
  const vistas = new Set<string>();
  for (const d of docs) {
    const deVitality = conV(d.nombre) || conV(d.plan);
    d.paginas.forEach((pag, i) => {
      // De un documento de Vitality, todo; de otro, solo desde donde menciona Vitality hasta el siguiente título.
      if (!deVitality && !conV(pag)) return;
      let zona = deVitality;
      for (const bruta of pag.split(/\r?\n/)) {
        const t = limpiar(bruta);
        const n = normalizar(t);
        if (conV(t)) zona = true;
        else if (!deVitality && t && esTitulo(t)) zona = false;
        if (!zona) continue;
        if (t.length < 12 || t.length > 200 || esTitulo(t) || NIEGA.test(n) || LEGAL.test(n) || vistas.has(n)) continue;
        // Mencionar Vitality no es un beneficio: tiene que decir qué da.
        if (!BENEFICIO_VITALITY.test(n.replace(/vitality/g, ""))) continue;
        const per = PERIODOS_VITALITY.find((x) => x.re.test(n));
        const lista = per ? out[per.id] : out.otros;
        if (lista.length >= (per ? MAX_POR_PERIODO : 3)) continue;
        vistas.add(n);
        lista.push({ t, fuente: `${d.nombre}, pág. ${i + 1}` });
      }
    });
  }
  return out;
}
