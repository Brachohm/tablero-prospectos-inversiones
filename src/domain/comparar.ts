/**
 * Cambio de seguro: comparar la tabla de coberturas del plan actual con las
 * tablas de los planes de la Biblioteca, recomendar uno según lo que paga hoy
 * (y su presupuesto) y destacar los beneficios que gana. Nada de esto es dato
 * de SaludSA: sale de lo que el asesor cargó, y se valida con la aseguradora.
 */
import { CONCEPTOS, CONCEPTOS_POR_MOTIVO, type IdConcepto } from "../config/coberturas";
import { VALIDAR } from "../config/saludsa";
import { lineas, normalizar, type Plan } from "./biblioteca";
import { motivosDe, num, txt } from "./ficha";
import type { Celda } from "./importar";
import { fmtUSD, valorUSD } from "./oferta";
import type { Prospecto } from "./tipos";

export type TablaCoberturas = Partial<Record<IdConcepto, string>>;

export const CONCEPTO_BY: Readonly<Record<string, (typeof CONCEPTOS)[number]>> = Object.fromEntries(
  CONCEPTOS.map((c) => [c.id, c]),
);

export function tablaDe(x: unknown): TablaCoberturas {
  return x && typeof x === "object" ? (x as TablaCoberturas) : {};
}

export function conceptosLlenos(t: TablaCoberturas): IdConcepto[] {
  return CONCEPTOS.filter((c) => t[c.id]?.trim()).map((c) => c.id);
}

/* ---------- Interpretar un valor ---------- */

export type Valor =
  | { tipo: "vacio" }
  | { tipo: "no" }
  | { tipo: "si" }
  | { tipo: "ilimitado" }
  | { tipo: "num"; n: number; pct: boolean }
  | { tipo: "texto" };

export function interpretar(v: string | undefined): Valor {
  const s = normalizar((v ?? "").trim());
  if (!s) return { tipo: "vacio" };
  if (/^(no|ninguno|ninguna|n\/a|-)(\b|$)|no (cubre|incluye|aplica|tiene|cubierto)|excluid|sin cobertura/.test(s))
    return { tipo: "no" };
  if (/ilimitad|sin limite|sin tope/.test(s)) return { tipo: "ilimitado" };
  if (/\d/.test(s)) {
    const n = valorUSD(s);
    if (n !== null) return { tipo: "num", n, pct: s.includes("%") };
  }
  if (/^(si|incluye|incluido|cubierto|cubre)\b/.test(s)) return { tipo: "si" };
  return { tipo: "texto" };
}

export type Resultado = "mejor" | "peor" | "igual" | "?";

/** Resultado desde el punto de vista del plan propuesto frente al actual. */
export function comparar(id: IdConcepto, actual: string | undefined, propuesto: string | undefined): Resultado {
  const c = CONCEPTO_BY[id];
  const a = interpretar(actual);
  const b = interpretar(propuesto);
  if (a.tipo === "vacio" || b.tipo === "vacio") return "?";
  if (c.mejor === "texto") return normalizar(actual!.trim()) === normalizar(propuesto!.trim()) ? "igual" : "?";
  // Valor numérico comparable: "no" vale 0 (no cubre / no tiene deducible).
  const rango = (v: Valor): number | null =>
    v.tipo === "no" ? 0 : v.tipo === "num" ? v.n : v.tipo === "ilimitado" ? (c.mejor === "mas" ? Infinity : null) : null;
  if (a.tipo === "num" && b.tipo === "num" && a.pct !== b.pct) return "?";
  if (c.mejor === "mas" && (a.tipo === "si" || b.tipo === "si")) {
    if (a.tipo === b.tipo) return "igual";
    if (a.tipo === "no") return "mejor";
    if (b.tipo === "no") return "peor";
    return "?";
  }
  const ra = rango(a);
  const rb = rango(b);
  if (ra === null || rb === null) return "?";
  if (ra === rb) return "igual";
  const planMayor = rb > ra;
  return (c.mejor === "mas") === planMayor ? "mejor" : "peor";
}

/* ---------- Analizar y recomendar ---------- */

export interface FilaComparacion {
  id: IdConcepto;
  l: string;
  actual: string;
  plan: string;
  res: Resultado;
  /** Importa más por sus motivos de inconformidad. */
  clave: boolean;
}

export interface AnalisisPlan {
  plan: Plan;
  filas: FilaComparacion[];
  mejoras: number;
  peores: number;
  primaPlan: number | null;
  /** Diferencia mensual frente a lo que paga hoy (positivo = paga más). */
  diferencia: number | null;
  fueraPresupuesto: boolean;
  puntos: number;
}

export function primaActualDe(p: Prospecto, t: TablaCoberturas): number | null {
  const v = interpretar(t.prima);
  if (v.tipo === "num") return v.n;
  return num(p, "primaActual");
}

export function primaPlanDe(plan: Plan): number | null {
  const v = interpretar(plan.tabla?.prima);
  if (v.tipo === "num") return v.n;
  return valorUSD(plan.precio);
}

export function conceptosClave(p: Prospecto): Set<IdConcepto> {
  return new Set(motivosDe(p).flatMap((m) => CONCEPTOS_POR_MOTIVO[m] ?? []));
}

export function analizarPlan(p: Prospecto, actual: TablaCoberturas, plan: Plan): AnalisisPlan {
  const claves = conceptosClave(p);
  const t = tablaDe(plan.tabla);
  const filas: FilaComparacion[] = CONCEPTOS.filter((c) => c.id !== "prima" && (actual[c.id]?.trim() || t[c.id]?.trim())).map(
    (c) => ({
      id: c.id,
      l: c.l,
      actual: actual[c.id]?.trim() ?? "",
      plan: t[c.id]?.trim() ?? "",
      res: comparar(c.id, actual[c.id], t[c.id]),
      clave: claves.has(c.id),
    }),
  );
  const peso = (f: FilaComparacion) => (f.clave ? 2 : 1);
  const mejoras = filas.filter((f) => f.res === "mejor");
  const peores = filas.filter((f) => f.res === "peor");
  const pa = primaActualDe(p, actual);
  const pp = primaPlanDe(plan);
  const diferencia = pa !== null && pp !== null ? Math.round((pp - pa) * 100) / 100 : null;
  const presupuesto = num(p, "pre_limite");
  const fueraPresupuesto = pp !== null && presupuesto !== null && presupuesto > 0 && pp > presupuesto;
  let puntos = mejoras.reduce((s, f) => s + peso(f), 0) - peores.reduce((s, f) => s + peso(f) * 1.5, 0);
  if (diferencia !== null && pa) {
    // Cada 10% más caro resta medio punto (el doble si el precio es su motivo); más barato suma.
    puntos -= (diferencia / pa) * 5 * (claves.has("prima") ? 2 : 1);
  }
  return {
    plan,
    filas,
    mejoras: mejoras.length,
    peores: peores.length,
    primaPlan: pp,
    diferencia,
    fueraPresupuesto,
    puntos: Math.round(puntos * 10) / 10,
  };
}

/** Planes con tabla, del más recomendable al menos (los que exceden su presupuesto, al final). */
export function recomendarPlanes(p: Prospecto, actual: TablaCoberturas, planes: readonly Plan[]): AnalisisPlan[] {
  return planes
    .filter((pl) => conceptosLlenos(tablaDe(pl.tabla)).length > 0)
    .map((pl) => analizarPlan(p, actual, pl))
    .sort(
      (a, b) =>
        Number(a.fueraPresupuesto) - Number(b.fueraPresupuesto) ||
        b.puntos - a.puntos ||
        (a.primaPlan ?? Infinity) - (b.primaPlan ?? Infinity),
    );
}

/** Lo que gana con el plan: primero lo que le importa por sus motivos, luego el resto y los beneficios incluidos. */
export function beneficios(a: AnalisisPlan): string[] {
  const out = a.filas
    .filter((f) => f.res === "mejor")
    .sort((x, y) => Number(y.clave) - Number(x.clave))
    .map((f) => {
      const antes = interpretar(f.actual).tipo === "no" ? "hoy no lo tiene" : `hoy ${f.actual}`;
      return `${f.l}: ${f.plan} (${antes})`;
    });
  // Lo que hoy no tiene registrado y el plan sí incluye.
  for (const f of a.filas)
    if (!f.actual && f.plan && !["no"].includes(interpretar(f.plan).tipo)) out.push(`${f.l}: ${f.plan}`);
  for (const b of lineas(a.plan.beneficios)) out.push(`Incluye: ${b}`);
  if (a.diferencia !== null && a.diferencia < 0) out.unshift(`Paga ${fmtUSD(-a.diferencia)} menos al mes`);
  return out;
}

/** Lo que debe saber antes de decidir (honestidad). */
export function avisos(a: AnalisisPlan): string[] {
  const out = a.filas.filter((f) => f.res === "peor").map((f) => `${f.l}: ${f.plan || "—"} (hoy ${f.actual || "—"})`);
  for (const c of lineas(a.plan.carencias)) out.push(`Carencia: ${c}`);
  for (const e of lineas(a.plan.exclusiones)) out.push(`Exclusión: ${e}`);
  if (a.fueraPresupuesto) out.unshift("Supera el máximo que dijo poder pagar");
  return out;
}

export function textoComparacion(p: Prospecto, a: AnalisisPlan): string {
  const nombre = txt(p, "nombre").split(/\s+/)[0] || "";
  const r: string[] = [];
  r.push(nombre ? `Hola ${nombre}, comparé su plan actual con *${a.plan.nombre}*:` : `Comparé su plan actual con *${a.plan.nombre}*:`);
  const pa = primaActualDe(p, tablaDe(p.planActual?.tabla));
  if (a.primaPlan !== null)
    r.push(
      `Inversión: ${fmtUSD(a.primaPlan)} al mes` +
        (pa !== null && a.diferencia !== null
          ? a.diferencia === 0
            ? " (lo mismo que paga hoy)"
            : ` (hoy paga ${fmtUSD(pa)}: ${a.diferencia > 0 ? "+" : "-"}${fmtUSD(Math.abs(a.diferencia))})`
          : ""),
    );
  const bs = beneficios(a).filter((b) => !b.startsWith("Paga "));
  if (bs.length) {
    r.push("");
    r.push("*Lo que gana:*");
    for (const b of bs.slice(0, 8)) r.push(`• ${b}`);
  }
  const av = a.filas.filter((f) => f.res === "peor");
  if (av.length) {
    r.push("");
    r.push("*Para que lo tenga claro:*");
    for (const f of av) r.push(`• ${f.l}: ${f.plan}`);
  }
  r.push("");
  r.push(`Condiciones sujetas a lo que establezca la aseguradora (${VALIDAR}).`);
  return r.join("\n");
}

/* ---------- Cargar una tabla ---------- */

/** Conceptos que califican a otros: "emergencias en el exterior" es del exterior, no de emergencias. */
const CALIFICAN: readonly IdConcepto[] = ["exterior", "preexistencias"];

function conceptoDe(texto: string): IdConcepto | null {
  const t = normalizar(texto);
  for (const id of CALIFICAN) if (CONCEPTOS.find((c) => c.id === id)!.claves.some((k) => t.includes(k))) return id;
  for (const c of CONCEPTOS) if (c.claves.some((k) => t.includes(k))) return c.id;
  return null;
}

/** Desde filas de Excel/CSV: la primera celda que nombra un concepto y la siguiente con valor. */
export function tablaDesdeFilas(filas: Celda[][]): TablaCoberturas {
  const t: TablaCoberturas = {};
  for (const fila of filas) {
    const celdas = fila.map((c) => (c === null || c === undefined ? "" : String(c).trim()));
    const i = celdas.findIndex((c) => c && conceptoDe(c));
    if (i < 0) continue;
    const id = conceptoDe(celdas[i])!;
    const valor = celdas.slice(i + 1).find((c) => c);
    if (valor && !t[id]) t[id] = valor;
  }
  return t;
}

/** Desde texto (PDF o pegado): cada línea con un concepto; el valor es lo que va después de ":" o al final. */
export function tablaDesdeTexto(texto: string): TablaCoberturas {
  const t: TablaCoberturas = {};
  for (const linea of texto.split(/\r?\n/)) {
    const l = linea.trim();
    if (!l || l.length > 160) continue;
    const id = conceptoDe(l);
    if (!id || t[id]) continue;
    let valor = "";
    const sep = l.split(/:|\t| {2,}| - | – /);
    if (sep.length > 1) valor = sep[sep.length - 1].trim();
    if (!valor || !/\d|no |si\b|sí|incluye|ilimitad/i.test(valor)) {
      const m = l.match(/(\$\s?[\d.,]+|[\d.,]+\s?%|[\d.,]+\s?d[ií]as|no (cubre|incluye|aplica)|ilimitad\w*|incluye|s[ií])\s*$/i);
      valor = m ? m[0].trim() : "";
    }
    if (valor) t[id] = valor;
  }
  return t;
}
