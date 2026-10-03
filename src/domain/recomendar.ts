/**
 * Recomendación de planes con lo que dicen los PDF de la Biblioteca.
 *
 * 1. Catálogo: los planes guardados y, además, los que salen solos de los
 *    documentos cargados (anexos y tarifas de cada plan), sin tener que
 *    precargarlos a mano.
 * 2. Necesidades: se leen de la ficha (aporte, capital, plazo, liquidez,
 *    dependientes, perfil de riesgo, motivos de quien ya invierte).
 * 3. Cada plan se revisa necesidad por necesidad: primero su tabla de
 *    datos, luego sus listas y, por último, el texto de sus PDF. Cada
 *    razón cita el documento y la página. Lo que no aparece queda "por
 *    confirmar": nunca se supone que sí cubre.
 */
import { CONCEPTO_BY, interpretar, primaPlanDe, tablaDe } from "./comparar";
import { ESPERA, NECESIDADES, NIEGA, RECONOCER_MODALIDAD, type IdNecesidad, type Modalidad } from "../config/recomendar";
import { crearPlan, lineas, normalizar, type Documento, type Plan } from "./biblioteca";
import { aplicarPrecarga, precargaDesdeDocumento } from "./extraer";
import { esCambio, motivosDe, num, txt } from "./ficha";
import { aniosHorizonte } from "./analisis";
import { perfilEfectivo } from "./finanzas";
import { usd } from "./fechas";
import type { Prospecto } from "./tipos";

/* ---------- 1. Catálogo ---------- */

export interface PlanCatalogo {
  plan: Plan;
  /** Armado solo desde los PDF (aún no está guardado en Planes). */
  virtual: boolean;
  /** Documentos de este plan (para buscar en su texto). */
  docs: Documento[];
}

/** Nombre del plan de un documento: el escrito al cargarlo; un anexo sin plan usa su nombre. */
function planDelDoc(d: Documento): string {
  return d.plan.trim() || (d.tipo === "anexo" ? d.nombre.trim() : "");
}

export function catalogo(planes: readonly Plan[], docs: readonly Documento[]): PlanCatalogo[] {
  const deDocs = new Map<string, Documento[]>();
  for (const d of docs) {
    const n = planDelDoc(d);
    if (!n) continue;
    const k = normalizar(n);
    deDocs.set(k, [...(deDocs.get(k) ?? []), d]);
  }
  const usados = new Set<string>();
  const out: PlanCatalogo[] = planes
    .filter((pl) => pl.nombre.trim())
    .map((pl) => {
      const k = normalizar(pl.nombre.trim());
      usados.add(k);
      const propios = (deDocs.get(k) ?? []).concat(docs.filter((d) => !planDelDoc(d) && pl.fuente.includes(d.nombre)));
      return { plan: pl, virtual: false, docs: propios };
    });
  for (const [k, ds] of deDocs) {
    if (usados.has(k)) continue;
    const base: Plan = { ...crearPlan(0), id: "doc:" + k, nombre: planDelDoc(ds[0]) };
    const plan = ds.reduce((pl, d) => aplicarPrecarga(pl, precargaDesdeDocumento(d), d), base);
    out.push({ plan, virtual: true, docs: ds });
  }
  return out;
}

/* ---------- 2. Necesidades de la ficha ---------- */

export interface Necesidad {
  id: IdNecesidad;
  l: string;
  /** 1 = conviene, 2 = importante, 3 = clave. */
  peso: number;
  /** De dónde sale (para mostrarlo). */
  por: string;
  /** Palabras extra para buscar en los PDF. */
  extra: string[];
  /** Tope numérico (p. ej. lo que puede aportar): si el valor del plan lo supera, no cumple. */
  tope?: number;
}

export function necesidadesDe(p: Prospecto): Necesidad[] {
  const out = new Map<IdNecesidad, Necesidad>();
  const add = (id: IdNecesidad, peso: number, por: string) => {
    const x = out.get(id);
    if (x && x.peso >= peso) return;
    out.set(id, { id, l: NECESIDADES[id].l, peso, por, extra: [] });
  };
  const v = (k: string) => txt(p, k);
  const aporte = num(p, "precio") ?? num(p, "aporte");
  const capital = num(p, "capital");
  const unico = v("tipoPlan") === "Contribución única" || (capital !== null && capital > 0);

  if (unico) add("unico", 3, capital ? `Tiene ${usd(capital)} para un aporte único` : "Eligió contribución única");
  if (v("tipoPlan") !== "Contribución única" && aporte) {
    add("aporte", 3, `Puede aportar ${usd(aporte)} al mes`);
    out.get("aporte")!.tope = aporte;
  }
  if (v("horizonte") || v("plazo")) add("plazo", 2, v("plazo") ? `Plazo elegido: ${v("plazo")} años` : `Su meta: ${v("horizonte").toLowerCase()}`);
  add("costos", 2, "Lo esencial: saber cuánto le cuesta el plan");

  const anios = aniosHorizonte(p);
  if (v("emergencia") !== "Sí" || (anios !== null && anios < 10) || v("ingresoEstable") === "Muy variable")
    add("liquidez", v("emergencia") === "No" ? 3 : 2, v("emergencia") === "No" ? "No tiene fondo de emergencia" : "Podría necesitar su dinero antes");
  if (v("tipoIngreso") === "Independiente o profesional" || v("tipoIngreso") === "Negocio propio" || v("ingresoEstable") !== "Estable")
    add("extra", 1, "Ingreso variable: aportes extra en los buenos meses");
  if (v("ingresoEstable") === "Muy variable") add("retiros", 1, "Ingreso muy variable");

  if (v("depende"))
    add("vida", v("seguroVida") === "No" ? 3 : 2, v("seguroVida") === "No" ? `Dependen de él o ella (${v("depende")}) y no tiene seguro de vida` : `Dependen de él o ella: ${v("depende")}`);

  const perfil = perfilEfectivo(p);
  if (perfil === "Conservador") add("conservador", 3, "Perfil conservador");
  else if (perfil === "Arriesgado") add("crecimiento", 2, "Perfil arriesgado");
  else if (perfil === "Moderado") {
    add("conservador", 1, "Perfil moderado");
    add("crecimiento", 1, "Perfil moderado");
  }
  if (anios !== null && anios >= 10) add("bono", 1, "Plazo largo: puede aprovechar un bono de permanencia");
  if (v("confianza") === "Ver su estado de cuenta cuando quiera") add("estado", 2, "Quiere ver su estado de cuenta cuando quiera");

  // Ya invierte: lo que hoy le falla pesa más.
  if (esCambio(p))
    for (const m of motivosDe(p)) {
      if (m === "costos") add("costos", 3, "Hoy paga costos que no conoce o le parecen altos");
      if (m === "liquidez") add("liquidez", 3, "Hoy no puede disponer de su dinero sin penalidad");
      if (m === "transparencia") add("estado", 3, "Hoy no sabe cómo va su inversión");
      if (m === "riesgo") add("conservador", 3, "Hoy le preocupa la volatilidad");
      if (m === "rendimiento") add("crecimiento", 2, "Hoy su dinero rinde poco");
    }

  return [...out.values()].sort((a, b) => b.peso - a.peso);
}

/** Presupuesto y criterio de precio. */
export function presupuestoDe(p: Prospecto): { limite: number | null; porPrecio: boolean } {
  // El "precio" de un plan es su aporte mínimo: no entra si pide más de lo que puede aportar.
  const limite = txt(p, "tipoPlan") === "Contribución única" ? null : (num(p, "precio") ?? num(p, "aporte"));
  return {
    limite: limite && limite > 0 ? limite : null,
    porPrecio: txt(p, "objecion") === "No tengo dinero ahora" || motivosDe(p).includes("costos"),
  };
}

/* ---------- 3. Revisar cada plan ---------- */

export interface Evidencia {
  t: string;
  /** "Anexo Plan X, pág. 3" o la fuente del plan. */
  fuente: string;
}

export type Veredicto = "cubre" | "falta" | "?";

export interface RevisionNecesidad {
  n: Necesidad;
  veredicto: Veredicto;
  /** Lo que lo respalda (o lo que dice que no). */
  ev: Evidencia | null;
  /** Ojo: tiempos de espera o exclusiones relacionadas. */
  avisos: Evidencia[];
}

export interface Recomendacion {
  item: PlanCatalogo;
  modalidad: { m: Modalidad; fuente: string } | null;
  /** Red cerrada para alguien que quiere seguir con su médico (y su médico no aparece en la red). */
  noApta: boolean;
  revision: RevisionNecesidad[];
  /** 0-100: cuánto de lo que necesita está respaldado por sus documentos. */
  ajuste: number;
  precio: number | null;
  fueraPresupuesto: boolean;
  puntos: number;
}

const MAX_TXT = 170;
const corto = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > MAX_TXT ? t.slice(0, MAX_TXT - 1).replace(/\s\S*$/, "") + "…" : t;
};
const pag = (d: Documento, i: number) => `${d.nombre}, pág. ${i + 1}`;
const fuentePlan = (pl: Plan) => (pl.fuente ?? "").trim() || `${pl.nombre} (Biblioteca)`;

function coincide(linea: string, palabras: readonly string[]): boolean {
  const n = normalizar(linea);
  return palabras.some((w) => n.includes(w));
}

/** Líneas de los PDF del plan que hablan de la necesidad. */
function enDocs(docs: readonly Documento[], palabras: readonly string[]) {
  const r: { cubre: Evidencia | null; niega: Evidencia | null; espera: Evidencia | null } = { cubre: null, niega: null, espera: null };
  for (const d of docs)
    d.paginas.forEach((texto, i) => {
      for (const l of texto.split(/\r?\n/)) {
        const t = l.trim();
        if (t.length < 4 || !coincide(t, palabras)) continue;
        const n = normalizar(t);
        const ev = { t: corto(t), fuente: pag(d, i) };
        if (NIEGA.test(n)) r.niega ??= ev;
        else if (ESPERA.test(n)) r.espera ??= ev;
        else r.cubre ??= ev;
      }
    });
  return r;
}

/** Página exacta del PDF donde está esa línea (o la fuente del plan si no se encuentra). */
function citar(item: PlanCatalogo, linea: string, palabras: readonly string[] = []): string {
  const buscada = normalizar(linea.replace(/\s+/g, " ").trim());
  for (const d of item.docs)
    for (let i = 0; i < d.paginas.length; i++)
      for (const l of d.paginas[i].split(/\r?\n/)) {
        const n = normalizar(l.replace(/\s+/g, " "));
        if (n.includes(buscada) && (!palabras.length || palabras.some((w) => n.includes(w)))) return pag(d, i);
      }
  return fuentePlan(item.plan);
}

/** Modalidad del producto: la escrita en el plan, su nombre o lo que dicen sus PDF. */
export function modalidadDe(item: PlanCatalogo): { m: Modalidad; fuente: string } | null {
  const reconocer = (t: string) => RECONOCER_MODALIDAD.find(([, re]) => re.test(normalizar(t)))?.[0];
  const escrita = reconocer(item.plan.modalidad ?? "");
  if (escrita) return { m: escrita, fuente: fuentePlan(item.plan) };
  const porNombre = reconocer(item.plan.nombre);
  if (porNombre) return { m: porNombre, fuente: `Nombre del plan: ${item.plan.nombre}` };
  for (const d of item.docs)
    for (let i = 0; i < d.paginas.length; i++)
      for (const l of d.paginas[i].split(/\r?\n/)) {
        const n = normalizar(l);
        if (!/modalidad|red cerrada|red abierta|red exclusiva|libre eleccion|(solo|unicamente|exclusivamente) (en|dentro de) (la|su) red/.test(n)) continue;
        const m = reconocer(l);
        if (m) return { m, fuente: pag(d, i) };
      }
  return null;
}

export function revisarNecesidad(item: PlanCatalogo, n: Necesidad): RevisionNecesidad {
  const { plan, docs } = item;
  const def = NECESIDADES[n.id];
  const palabras = [...def.palabras, ...n.extra];
  const avisos: Evidencia[] = [];
  for (const c of lineas(plan.carencias)) if (coincide(c, palabras)) avisos.push({ t: `Costo: ${corto(c)}`, fuente: citar(item, c) });
  const exclusion = lineas(plan.exclusiones).find((x) => coincide(x, palabras));
  if (exclusion) avisos.push({ t: `Rescate: ${corto(exclusion)}`, fuente: citar(item, exclusion) });

  // 1. Tabla de datos del plan
  const t = tablaDe(plan.tabla);
  for (const c of def.conceptos) {
    const val = t[c]?.trim();
    if (!val) continue;
    const l = CONCEPTO_BY[c]?.l ?? c;
    const ev = { t: `${l}: ${val}`, fuente: citar(item, val, palabras) };
    const x = interpretar(val);
    const pasa = n.tope !== undefined && x.tipo === "num" && x.n > n.tope;
    // No repetir como aviso la misma línea que ya es la evidencia.
    const otros = avisos.filter((a) => !normalizar(a.t).includes(normalizar(val)));
    return { n, veredicto: x.tipo === "no" || pasa ? "falta" : "cubre", ev, avisos: otros };
  }
  // 2. Características, beneficios y garantías escritos en el plan
  const lista = [...lineas(plan.coberturas), ...lineas(plan.beneficios), ...lineas(plan.garantias)].find(
    (x) => coincide(x, palabras) && !NIEGA.test(normalizar(x)),
  );
  if (lista) return { n, veredicto: "cubre", ev: { t: corto(lista), fuente: citar(item, lista) }, avisos };
  // 3. El texto de sus PDF
  const d = enDocs(docs, palabras);
  if (d.espera && !avisos.length) avisos.push({ t: `Plazo o permanencia: ${d.espera.t}`, fuente: d.espera.fuente });
  if (d.cubre) {
    if (d.niega) avisos.push({ t: `Revisa: ${d.niega.t}`, fuente: d.niega.fuente });
    return { n, veredicto: "cubre", ev: d.cubre, avisos };
  }
  if (d.niega || exclusion) return { n, veredicto: "falta", ev: d.niega ?? avisos[avisos.length - 1], avisos: d.niega ? avisos : avisos.slice(0, -1) };
  // Solo habla de la espera: está, pero con tiempo de espera.
  if (d.espera) return { n, veredicto: "cubre", ev: d.espera, avisos };
  return { n, veredicto: "?", ev: null, avisos };
}

/**
 * Planes del más recomendable al menos: primero los que respetan su médico
 * de cabecera (modalidad Abierta o Mixta si no quiere la red de convenio) y
 * los que entran en su presupuesto; luego los que respaldan más de lo que necesita (lo clave pesa
 * más) y, si elige por precio, el más económico.
 */
export function recomendar(p: Prospecto, planes: readonly Plan[], docs: readonly Documento[]): Recomendacion[] {
  const necesidades = necesidadesDe(p);
  const { limite, porPrecio } = presupuestoDe(p);
  const total = necesidades.reduce((a, n) => a + n.peso, 0) || 1;
  const recs = catalogo(planes, docs).map((item) => {
    const revision = necesidades.map((n) => revisarNecesidad(item, n));
    const cubre = revision.filter((r) => r.veredicto === "cubre").reduce((a, r) => a + r.n.peso, 0);
    const falta = revision.filter((r) => r.veredicto === "falta").reduce((a, r) => a + r.n.peso, 0);
    const precio = primaPlanDe(item.plan);
    const fueraPresupuesto = precio !== null && limite !== null && precio > limite;
    const modalidad = modalidadDe(item);
    const noApta = false;
    return { item, modalidad, noApta, revision, ajuste: Math.round((cubre / total) * 100), precio, fueraPresupuesto, puntos: cubre - falta * 1.5 };
  });
  // Si elige por precio, el más económico suma hasta 2 puntos.
  const precios = recs.map((r) => r.precio).filter((x): x is number => x !== null);
  if (porPrecio && precios.length > 1) {
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    for (const r of recs) if (r.precio !== null && max > min) r.puntos += 2 * ((max - r.precio) / (max - min));
  }
  for (const r of recs) r.puntos = Math.round(r.puntos * 10) / 10;
  return recs.sort(
    (a, b) =>
      Number(a.noApta) - Number(b.noApta) ||
      Number(a.fueraPresupuesto) - Number(b.fueraPresupuesto) ||
      b.puntos - a.puntos ||
      (a.precio ?? Infinity) - (b.precio ?? Infinity) ||
      a.item.plan.nombre.localeCompare(b.item.plan.nombre),
  );
}

/** Razones a favor (lo clave primero), para mostrar y para "¿Qué gana?". */
export function razones(r: Recomendacion): string[] {
  return r.revision.filter((x) => x.veredicto === "cubre" && x.ev).map((x) => `${x.n.l}: ${x.ev!.t}`);
}
