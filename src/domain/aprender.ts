/**
 * Argumentos que crea el sistema a partir de lo cargado: beneficios que solo
 * tiene un plan, el mejor plan en cada concepto de las tablas, lo aprendido de
 * las comparaciones con planes actuales de clientes y frases clave de los
 * documentos. Honestos: solo dicen lo que está en el material, citan la fuente
 * y se recalculan cuando cambia la Biblioteca.
 */
import { CONCEPTOS, type IdConcepto } from "../config/coberturas";
import { VALIDAR } from "../config/saludsa";
import { lineas, normalizar, type Argumento, type Documento, type Plan } from "./biblioteca";
import { analizarPlan, comparar, conceptosLlenos, interpretar, recomendarPlanes, tablaDe } from "./comparar";
import { tipoDe } from "./ficha";
import type { Prospecto } from "./tipos";

export type OrigenAuto = "exclusivo" | "mejor" | "comparaciones" | "documento";

export interface ArgumentoAuto extends Argumento {
  auto: true;
  origen: OrigenAuto;
}

export const ORIGEN_AUTO_L: Record<OrigenAuto, string> = {
  exclusivo: "Beneficio exclusivo",
  mejor: "El mejor de tus planes",
  comparaciones: "Aprendido de tus comparaciones",
  documento: "De tus documentos",
};

const REGLAS_ETIQUETA: [RegExp, string][] = [
  [/rendimiento|rentabilidad|interes|crec/, "mot:rendimiento"],
  [/comision|costo|cargo|administracion/, "mot:costos"],
  [/rescate|retiro|liquidez|penalidad|permanencia/, "mot:liquidez"],
  [/estado de cuenta|transparen|informe|reporte/, "mot:transparencia"],
  [/riesgo|volatil|caida|perfil/, "mot:riesgo"],
  [/aporte|presupuesto|cuota|no me alcanza/, "obj:No tengo dinero ahora"],
  [/confian|regulad|segur[oa] mi dinero|respaldo/, "obj:Desconfío de las inversiones"],
  [/hij|famili|educacion|universidad/, "familia"],
  [/emergencia|imprevist/, "emergencia"],
  [/asesor|seguimiento|atencion|app\b|linea/, "mot:atencion"],
  [/retiro|jubilacion|pension/, "mayor"],
];

/** Etiquetas de argumento según las palabras del texto. */
export function etiquetasDeTexto(t: string): string[] {
  const n = normalizar(t);
  const e = REGLAS_ETIQUETA.filter(([r]) => r.test(n)).map(([, x]) => x);
  return e.length ? [...new Set(e)] : ["general"];
}

const ETIQUETA_CONCEPTO: Partial<Record<IdConcepto, string[]>> = {
  prima: ["obj:No tengo dinero ahora"],
  unico: ["obj:Ya tengo ahorros"],
  admin: ["mot:costos"],
  entrada: ["mot:costos"],
  rescate: ["mot:liquidez"],
  sinPenalidad: ["mot:liquidez"],
  retiros: ["mot:liquidez", "emergencia"],
  vida: ["familia"],
  fondos: ["mot:riesgo", "mot:rendimiento"],
  bono: ["mot:rendimiento"],
  estado: ["mot:transparencia", "obj:Desconfío de las inversiones"],
};

function auto(origen: OrigenAuto, clave: string, titulo: string, texto: string, etiquetas: string[], fuente: string): ArgumentoAuto {
  return {
    id: "auto:" + origen + ":" + normalizar(clave).replace(/[^a-z0-9]+/g, "-").slice(0, 80),
    titulo,
    texto,
    etiquetas: [...new Set(etiquetas)],
    fuente: `${fuente} · ${VALIDAR}`,
    creado: 0,
    mod: 0,
    auto: true,
    origen,
  };
}

/** Beneficios que solo un plan incluye (entre los de tu Biblioteca). */
function exclusivos(planes: readonly Plan[]): ArgumentoAuto[] {
  if (planes.length < 2) return [];
  const out: ArgumentoAuto[] = [];
  const todos = planes.map((p) => ({ p, bs: lineas(p.beneficios) }));
  for (const { p, bs } of todos)
    for (const b of bs) {
      const nb = normalizar(b);
      const otros = todos.filter((x) => x.p.id !== p.id).some((x) => x.bs.some((y) => normalizar(y) === nb));
      if (otros) continue;
      out.push(
        auto(
          "exclusivo",
          p.id + b,
          `Solo ${p.nombre} incluye: ${b}`,
          `Entre los planes que manejo, ${p.nombre} es el único que incluye ${b.charAt(0).toLowerCase() + b.slice(1)}.`,
          etiquetasDeTexto(b),
          /^plan\b/i.test(p.nombre) ? p.nombre : `Plan ${p.nombre}`,
        ),
      );
    }
  return out;
}

/** Para cada concepto, el plan con el mejor valor (si es uno solo). */
function mejores(planes: readonly Plan[]): ArgumentoAuto[] {
  const conTabla = planes.filter((p) => conceptosLlenos(tablaDe(p.tabla)).length > 0);
  if (conTabla.length < 2) return [];
  const out: ArgumentoAuto[] = [];
  for (const c of CONCEPTOS) {
    if (c.mejor === "texto") continue;
    const con = conTabla.filter((p) => interpretar(tablaDe(p.tabla)[c.id]).tipo !== "vacio");
    if (con.length < 2) continue;
    const gana = con.filter((p) =>
      con.every((q) => q.id === p.id || comparar(c.id, tablaDe(q.tabla)[c.id], tablaDe(p.tabla)[c.id]) === "mejor"),
    );
    if (gana.length !== 1) continue;
    const p = gana[0];
    const v = tablaDe(p.tabla)[c.id]!;
    out.push(
      auto(
        "mejor",
        p.id + c.id,
        `${p.nombre}: la opción ${c.mejor === "menos" ? "más baja" : "más alta"} en ${c.l.replace(/\s*\(.*\)/, "").toLowerCase()}`,
        `${c.l}: ${v} con ${p.nombre}, ${c.mejor === "menos" ? "el más bajo" : "el más alto"} entre los planes que manejo.`,
        ETIQUETA_CONCEPTO[c.id] ?? ["general"],
        `Tabla de coberturas de ${p.nombre}`,
      ),
    );
  }
  return out;
}

/** Lo que se repite al comparar con los planes actuales de tus clientes. */
function deComparaciones(fichas: readonly Prospecto[], planes: readonly Plan[]): ArgumentoAuto[] {
  const conActual = fichas.filter((p) => tipoDe(p) === "cambio" && conceptosLlenos(tablaDe(p.planActual?.tabla)).length > 0);
  if (!conActual.length) return [];
  const out: ArgumentoAuto[] = [];
  // Qué no tenían en su plan actual
  for (const c of CONCEPTOS) {
    const sin = conActual.filter((p) => interpretar(tablaDe(p.planActual?.tabla)[c.id]).tipo === "no").length;
    if (sin < 2) continue;
    out.push(
      auto(
        "comparaciones",
        "falta" + c.id,
        `A muchos les falta: ${c.l.toLowerCase()}`,
        `En ${sin} de ${conActual.length} planes actuales que revisé, ${c.l.toLowerCase()} no estaba incluido. Vale la pena revisar si el suyo lo tiene.`,
        ETIQUETA_CONCEPTO[c.id] ?? ["general"],
        `${conActual.length} comparaciones de cambio de seguro`,
      ),
    );
  }
  // Qué mejora más seguido el plan recomendado
  const conteo = new Map<string, { plan: string; c: IdConcepto; n: number }>();
  for (const p of conActual) {
    const r = recomendarPlanes(p, tablaDe(p.planActual?.tabla), planes)[0];
    if (!r) continue;
    for (const f of analizarPlan(p, tablaDe(p.planActual?.tabla), r.plan).filas)
      if (f.res === "mejor") {
        const k = r.plan.id + f.id;
        conteo.set(k, { plan: r.plan.nombre, c: f.id, n: (conteo.get(k)?.n ?? 0) + 1 });
      }
  }
  for (const [k, x] of conteo)
    if (x.n >= 2) {
      const l = CONCEPTOS.find((c) => c.id === x.c)!.l;
      out.push(
        auto(
          "comparaciones",
          "mejora" + k,
          `${x.plan} mejora ${l.toLowerCase()}`,
          `En ${x.n} comparaciones con planes actuales de clientes, ${x.plan} mejoró ${l.toLowerCase()}.`,
          ETIQUETA_CONCEPTO[x.c] ?? ["general"],
          `${conActual.length} comparaciones de cambio de seguro`,
        ),
      );
    }
  return out;
}

const POSITIVO = /\b(cubre|cubrimos|incluye|incluido|sin costo|gratuit|100 ?%|ilimitad|reembolso en|cobertura (de|del|hasta)|beneficio|asistencia|acceso a)\b/;
const NEGATIVO = /\b(no cubre|excluye|exclusion|no incluye|no se cubr|excepto)\b/;

/** Frases de los documentos que dicen lo que el plan sí da (máximo 3 por documento). */
function deDocumentos(docs: readonly Documento[]): ArgumentoAuto[] {
  const out: ArgumentoAuto[] = [];
  for (const d of docs) {
    let n = 0;
    d.paginas.forEach((pag, i) => {
      if (n >= 3) return;
      for (const frase of pag.replace(/\s+/g, " ").split(/(?<=[.;])\s+/)) {
        const f = frase.trim();
        const nf = normalizar(f);
        if (f.length < 40 || f.length > 220 || !POSITIVO.test(nf) || NEGATIVO.test(nf)) continue;
        out.push(
          auto("documento", d.id + i + f.slice(0, 30), f.length > 70 ? f.slice(0, 67) + "…" : f, `«${f}»`, etiquetasDeTexto(f), `${d.nombre}, pág. ${i + 1}`),
        );
        if (++n >= 3) break;
      }
    });
  }
  return out;
}

/** Todos los argumentos del sistema, sin repetir. */
export function argumentosDelSistema(planes: readonly Plan[], docs: readonly Documento[], fichas: readonly Prospecto[]): ArgumentoAuto[] {
  const todos = [...exclusivos(planes), ...mejores(planes), ...deComparaciones(fichas, planes), ...deDocumentos(docs)];
  const vistos = new Set<string>();
  return todos.filter((a) => (vistos.has(a.id) ? false : (vistos.add(a.id), true)));
}

export function esAuto(a: Argumento): a is ArgumentoAuto {
  return (a as ArgumentoAuto).auto === true;
}
