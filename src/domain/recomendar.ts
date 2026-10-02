/**
 * Recomendación de planes con lo que dicen los PDF de la Biblioteca.
 *
 * 1. Catálogo: los planes guardados y, además, los que salen solos de los
 *    documentos cargados (anexos y tarifas de cada plan), sin tener que
 *    precargarlos a mano.
 * 2. Necesidades: se leen de la ficha (quién depende, edad, ocupación,
 *    preexistencias, motivos, presupuesto, lo que contó).
 * 3. Cada plan se revisa necesidad por necesidad: primero su tabla de
 *    coberturas, luego sus listas y, por último, el texto de sus PDF. Cada
 *    razón cita el documento y la página. Lo que no aparece queda "por
 *    confirmar": nunca se supone que sí cubre.
 */
import { CONCEPTO_BY, interpretar, primaPlanDe, tablaDe } from "./comparar";
import { EDAD_MAYOR } from "../config/ficha";
import { ESPERA, MODALIDADES, NECESIDADES, NIEGA, RECONOCER_MODALIDAD, type IdNecesidad, type Modalidad } from "../config/recomendar";
import { crearPlan, lineas, normalizar, type Documento, type Plan } from "./biblioteca";
import { aplicarPrecarga, precargaDesdeDocumento } from "./extraer";
import { esCambio, motivosDe, num, tipoDe, txt } from "./ficha";
import { riesgosDe } from "./ocupacion";
import { personasDe, preResumen, preStats } from "./pre";
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
  /** Palabras extra para buscar en los PDF (p. ej. sus condiciones declaradas). */
  extra: string[];
}

const FAMILIA = /\b(hij[oa]s?|bebe|embaraz|esposa|pareja|novia|familia|maternidad)/;
const NINOS = /\b(hij[oa]s?|bebe|nin[oa]s?|recien nacid)/;
const VIAJE = /\b(viaj|exterior|extranjer|fuera del pais)/;

/** Palabras comunes que no sirven para reconocer a un médico o un lugar. */
const GENERICAS = new Set(["doctor", "doctora", "medico", "medica", "clinica", "consultorio", "hospital", "centro", "especialista"]);

/** Palabras sueltas útiles de un texto (para buscarlas en los PDF). */
function palabrasDe(s: string): string[] {
  return normalizar(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 5 && !GENERICAS.has(w));
}

/* ---------- Médico de cabecera ---------- */

export interface MedicoCabecera {
  tiene: boolean;
  /** No tiene problema en atenderse en la red de convenio. */
  aceptaRed: boolean;
  nombre: string;
  especialidad: string;
  lugar: string;
}

export function medicoDe(p: Prospecto): MedicoCabecera {
  return {
    tiene: txt(p, "medicoCabecera") === "Sí",
    aceptaRed: txt(p, "redConvenio") === "Sí",
    nombre: txt(p, "medicoNombre"),
    especialidad: txt(p, "medicoEspecialidad"),
    lugar: txt(p, "medicoLugar"),
  };
}

/** Qué modalidad le conviene, en una línea (para el pre-cierre y la recomendación). */
export function consejoModalidad(m: MedicoCabecera): string {
  if (!m.tiene) return "";
  return m.aceptaRed
    ? "No tiene problema con la red de convenio: puedes recomendar planes de modalidad Abierta o Mixta y también de red cerrada."
    : "Tiene médico de cabecera: lo más recomendable son los planes de modalidad Abierta o Mixta.";
}

export function necesidadesDe(p: Prospecto): Necesidad[] {
  const out = new Map<IdNecesidad, Necesidad>();
  const add = (id: IdNecesidad, peso: number, por: string, extra: string[] = []) => {
    const x = out.get(id);
    if (x && x.peso >= peso) return void x.extra.push(...extra);
    out.set(id, { id, l: NECESIDADES[id].l, peso, por, extra: [...(x?.extra ?? []), ...extra] });
  };
  const v = (k: string) => txt(p, k);
  const texto = normalizar([v("porque"), v("depende"), v("grieta"), v("emergencia"), v("notas")].join(" "));
  const edad = num(p, "edad");
  const edades = [edad, ...personasDe(p).map((x) => Number(x.edad))].filter((n): n is number => n !== null && Number.isFinite(n) && n > 0);

  const evento = v("costoEvento") || v("emergencia");
  add("hospital", evento ? 3 : 2, evento ? `Dijo: “${evento}”` : "Lo esencial: un evento grande es lo que más afecta los ahorros");
  add("emergencias", 2, "Lo esencial en cualquier plan");
  add("medicinas", 1, "Lo que más se usa en el día a día");

  const r = riesgosDe(p);
  if (r) add("accidentes", 2, `Por su trabajo (${r.ocupacion.toLowerCase()})`);
  if (FAMILIA.test(texto) && (edad === null || edad <= 45)) add("maternidad", 2, v("depende") ? `Depende: ${v("depende")}` : "Planes de familia");
  if (NINOS.test(normalizar(v("depende"))) || edades.some((e) => e < 18)) add("ninos", 2, "Hay niños en la familia");
  if (/iess|seguro social/i.test(v("cobertura"))) add("ambulatorio", 1, "Complemento a su IESS");
  if (edades.some((e) => e >= EDAD_MAYOR)) add("cronicas", 2, `Hay personas de ${EDAD_MAYOR} años o más`);
  if (VIAJE.test(texto)) add("exterior", 1, "Mencionó viajes o el exterior");

  // Preexistencias: sus condiciones declaradas se buscan por nombre en los PDF.
  const conPre = tipoDe(p) === "nuevo" ? preStats(p).condiciones > 0 : v("declaro") === "Sí";
  if (conPre) {
    const condiciones = preResumen(p).flatMap((x) => x.con.flatMap((c) => c.items.map((i) => i.c)));
    add("preexistencias", 3, condiciones.length ? `Declaró: ${condiciones.slice(0, 3).join(", ")}` : "Declaró condiciones de salud", condiciones.flatMap(palabrasDe));
  }

  // Cambio de seguro: lo que hoy le falla pesa más.
  if (esCambio(p))
    for (const m of motivosDe(p)) {
      if (m === "atencion") add("telemedicina", 2, "Hoy le falla la atención");
    }
  if (v("red_falta") && !out.has("red")) add("red", 2, `Busca: ${v("red_falta")}`, palabrasDe(v("red_falta")));

  // Médico de cabecera: si no quiere la red de convenio, pide modalidad Abierta o Mixta.
  const med = medicoDe(p);
  if (med.tiene && !med.aceptaRed)
    add(
      "medico",
      3,
      `Su médico de cabecera${med.nombre ? `: ${med.nombre}` : ""}${med.especialidad ? ` (${med.especialidad})` : ""}`,
      palabrasDe(`${med.nombre} ${med.lugar}`),
    );

  return [...out.values()].sort((a, b) => b.peso - a.peso);
}

/** Presupuesto y criterio de precio. */
export function presupuestoDe(p: Prospecto): { limite: number | null; porPrecio: boolean } {
  const limite = num(p, "pre_limite");
  return {
    limite: limite && limite > 0 ? limite : null,
    porPrecio: txt(p, "criterio") === "Precio" || txt(p, "objecion") === "Precio" || motivosDe(p).includes("costos"),
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

/** Seguir con su médico: su médico en los PDF del plan, o la modalidad. */
function revisarMedico(item: PlanCatalogo, n: Necesidad): RevisionNecesidad {
  if (n.extra.length) {
    const d = enDocs(item.docs, n.extra);
    if (d.cubre) return { n, veredicto: "cubre", ev: { t: `Su médico aparece en el plan: ${d.cubre.t}`, fuente: d.cubre.fuente }, avisos: [] };
  }
  const mod = modalidadDe(item);
  if (!mod) return { n, veredicto: "?", ev: null, avisos: [] };
  const ev = { t: MODALIDADES[mod.m].ev, fuente: mod.fuente };
  return mod.m === "cerrada"
    ? { n, veredicto: "falta", ev, avisos: [{ t: "Solo si su médico está en la red de convenio", fuente: VALIDAR_RED }] }
    : { n, veredicto: "cubre", ev, avisos: mod.m === "mixta" ? [{ t: "Confirma cómo se cubre la atención fuera de la red", fuente: VALIDAR_RED }] : [] };
}

const VALIDAR_RED = "validar con la aseguradora";

export function revisarNecesidad(item: PlanCatalogo, n: Necesidad): RevisionNecesidad {
  if (n.id === "medico") return revisarMedico(item, n);
  const { plan, docs } = item;
  const def = NECESIDADES[n.id];
  const palabras = [...def.palabras, ...n.extra];
  const avisos: Evidencia[] = [];
  for (const c of lineas(plan.carencias)) if (coincide(c, palabras)) avisos.push({ t: `Tiempo de espera: ${corto(c)}`, fuente: citar(item, c) });
  const exclusion = lineas(plan.exclusiones).find((x) => coincide(x, palabras));
  if (exclusion) avisos.push({ t: `Exclusión: ${corto(exclusion)}`, fuente: citar(item, exclusion) });

  // 1. Tabla de coberturas del plan
  const t = tablaDe(plan.tabla);
  for (const c of def.conceptos) {
    const val = t[c]?.trim();
    if (!val) continue;
    const l = CONCEPTO_BY[c]?.l ?? c;
    const ev = { t: `${l}: ${val}`, fuente: citar(item, val, palabras) };
    return { n, veredicto: interpretar(val).tipo === "no" ? "falta" : "cubre", ev, avisos };
  }
  // 2. Coberturas, beneficios y garantías escritos en el plan
  const lista = [...lineas(plan.coberturas), ...lineas(plan.beneficios), ...lineas(plan.garantias)].find(
    (x) => coincide(x, palabras) && !NIEGA.test(normalizar(x)),
  );
  if (lista) return { n, veredicto: "cubre", ev: { t: corto(lista), fuente: citar(item, lista) }, avisos };
  // 3. El texto de sus PDF
  const d = enDocs(docs, palabras);
  if (d.espera && !avisos.length) avisos.push({ t: `Tiempo de espera: ${d.espera.t}`, fuente: d.espera.fuente });
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
    const noApta = revision.some((r) => r.n.id === "medico" && r.veredicto === "falta");
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
