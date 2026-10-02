/**
 * Camino de la ficha hasta el cierre: dos reuniones (más solo en casos
 * especiales), tres referidos, pre-cierre con los productos elegidos (y su
 * simulación en el objetivo del mes) y los documentos del cierre.
 */
import {
  DOCS_CIERRE,
  ETAPA_CERRADO,
  ETAPA_PRECIERRE,
  MAX_MB_DOC_CIERRE,
  REFERIDOS_PEDIR,
  REUNIONES,
  REUNIONES_NORMALES,
  TIPOS_DOC_CIERRE,
} from "../config/ficha";
import { crearContacto, type ContactoNuevo } from "./contactos";
import { nuevoId, reunionesDe, telefonoDe, txt, vendido } from "./ficha";
import { conEtapa, objetivoMes, type Objetivo, type ObjetivoConfig } from "./objetivos";
import { valorUSD } from "./oferta";
import type { ProductoCierre, Prospecto, ReferidoPedido } from "./tipos";

/* ---------- Reuniones ---------- */

/** Número de la próxima reunión (1, 2, o 3+ en casos especiales). */
export function numeroReunion(p: Prospecto): number {
  return reunionesDe(p).length + 1;
}

/** Ya se hicieron las dos reuniones: otra solo como caso especial (con motivo). */
export function requiereCasoEspecial(p: Prospecto): boolean {
  return numeroReunion(p) > REUNIONES_NORMALES;
}

export function nombreReunion(n: number): string {
  return REUNIONES.find((r) => r.n === n)?.l ?? `Reunión ${n} (caso especial)`;
}

export function cortoReunion(n: number): string {
  return REUNIONES.find((r) => r.n === n)?.corto ?? `Reunión ${n}`;
}

/** Marca como realizada la reunión en curso y deja libre la agenda para la siguiente. */
export function marcarReunionHecha(p: Prospecto, hoy: string): Prospecto {
  const n = numeroReunion(p);
  return {
    ...p,
    reunionesHechas: [...reunionesDe(p), { n, fecha: hoy }],
    reunion: "",
    reunionLugar: "",
    reunionLink: "",
    reunionExtra: "",
  };
}

/* ---------- Referidos ---------- */

export function referidosDe(p: Prospecto): ReferidoPedido[] {
  const rs = Array.isArray(p.referidos) ? p.referidos : [];
  const out = rs.slice(0, REFERIDOS_PEDIR);
  while (out.length < REFERIDOS_PEDIR) out.push({ id: "r" + out.length, nombre: "", celular: "", relacion: "" });
  return out;
}

/** Referido con lo mínimo para guardarlo: nombre y un celular válido. */
export function referidoListo(r: ReferidoPedido): boolean {
  return !!r.nombre.trim() && telefonoDe(r.celular) !== null;
}

export function referidosListos(p: Prospecto): number {
  return referidosDe(p).filter(referidoListo).length;
}

/** Cuándo pedirlos: en la primera reunión; si no se pudo, en la segunda. */
export function momentoReferidos(p: Prospecto): "primera" | "segunda" | "listos" | "tarde" {
  if (referidosListos(p) >= REFERIDOS_PEDIR) return "listos";
  const n = reunionesDe(p).length;
  return n === 0 ? "primera" : n === 1 ? "segunda" : "tarde";
}

/** Contacto para la Base de datos: entra como referido de esta persona (activa la cadena de mensajes). */
export function contactoDeReferido(p: Prospecto, r: ReferidoPedido, ahora = Date.now()): ContactoNuevo {
  return crearContacto(
    {
      nombre: r.nombre.trim(),
      celular: r.celular.trim(),
      referidor: txt(p, "nombre"),
      relacion: r.relacion,
      origen: "Referido",
      ciudad: txt(p, "ciudad"),
    },
    ahora,
  );
}

export function nuevoReferido(): ReferidoPedido {
  return { id: nuevoId(), nombre: "", celular: "", relacion: "" };
}

/* ---------- Pre-cierre ---------- */

export function productosDe(p: Prospecto): ProductoCierre[] {
  // El primero vacío lleva un id fijo: así lo que se escribe se guarda en él.
  return Array.isArray(p.productos) && p.productos.length ? p.productos : [{ id: "prod-1", nombre: "", deducible: "", mensual: "" }];
}

export function nuevoProducto(): ProductoCierre {
  return { id: nuevoId(), nombre: "", deducible: "", mensual: "" };
}

/** Suma de los valores mensuales de los productos elegidos. */
export function totalMensual(ps: readonly ProductoCierre[]): number {
  return Math.round(ps.reduce((a, x) => a + (valorUSD(x.mensual) ?? 0), 0) * 100) / 100;
}

/** El plan ya está entre los productos (por id o por nombre). */
export function tieneProducto(p: Prospecto, plan: { id: string; nombre: string }): boolean {
  const n = plan.nombre.trim().toLowerCase();
  return productosDe(p).some((x) => (!!x.planId && x.planId === plan.id) || (!!n && x.nombre.trim().toLowerCase() === n));
}

/**
 * Suma un plan a los productos del pre-cierre: usa la fila vacía si la hay y
 * nunca lo duplica. Así se pueden elegir varios planes para la propuesta.
 */
export function agregarProducto(p: Prospecto, plan: { id: string; nombre: string }, mensual: number | null): Prospecto {
  if (tieneProducto(p, plan)) return p;
  const ps = productosDe(p).filter((x) => x.nombre.trim() || x.mensual.trim() || x.deducible.trim());
  const id = ps.length ? nuevoId() : "prod-1";
  return conProductos(p, [...ps, { id, planId: plan.id, nombre: plan.nombre, deducible: "", mensual: mensual === null ? "" : String(mensual) }]);
}

/** Clave de un plan en los valores por recomendación. */
const claveRec = (nombre: string) => nombre.trim().toLowerCase();

const esDe = (x: ProductoCierre, plan: { id: string; nombre: string }) =>
  (!!x.planId && x.planId === plan.id) || (!!plan.nombre.trim() && x.nombre.trim().toLowerCase() === claveRec(plan.nombre));

/**
 * Valor mensual de un plan recomendado: el del producto si ya está en la
 * propuesta; si no, el que se escribió para esa recomendación; si no, el
 * precio que traen sus documentos.
 */
export function valorRecomendado(p: Prospecto, plan: { id: string; nombre: string }, precioDocs: number | null): string {
  const enPropuesta = productosDe(p).find((x) => esDe(x, plan));
  if (enPropuesta) return enPropuesta.mensual;
  const escrito = (p.valoresRec as Record<string, string> | undefined)?.[claveRec(plan.nombre)];
  if (typeof escrito === "string") return escrito;
  return precioDocs === null ? "" : String(precioDocs);
}

/** Guarda el valor mensual de una recomendación (y lo pone en su producto si ya está en la propuesta). */
export function fijarValorRec(p: Prospecto, plan: { id: string; nombre: string }, valor: string): Prospecto {
  const valores = { ...((p.valoresRec as Record<string, string> | undefined) ?? {}), [claveRec(plan.nombre)]: valor };
  const g = { ...p, valoresRec: valores };
  if (!productosDe(p).some((x) => esDe(x, plan))) return g;
  return conProductos(g, productosDe(p).map((x) => (esDe(x, plan) ? { ...x, mensual: valor } : x)));
}

/** Quita el producto de ese plan. */
export function quitarProducto(p: Prospecto, plan: { id: string; nombre: string }): Prospecto {
  const n = plan.nombre.trim().toLowerCase();
  const ps = productosDe(p).filter((x) => !((!!x.planId && x.planId === plan.id) || (!!n && x.nombre.trim().toLowerCase() === n)));
  return conProductos(p, ps.length ? ps : [{ id: "prod-1", nombre: "", deducible: "", mensual: "" }]);
}

/**
 * Guarda los productos y deja el total como "precio" de la ficha (lo usan el
 * objetivo del mes, los mensajes y el informe) y sus nombres como "plan".
 */
export function conProductos(p: Prospecto, ps: ProductoCierre[]): Prospecto {
  const total = totalMensual(ps);
  const nombres = ps.map((x) => x.nombre.trim()).filter(Boolean);
  return {
    ...p,
    productos: ps,
    precio: total > 0 ? String(total) : "",
    plan: nombres.join(" + "),
  };
}

/** Qué falta para marcar la venta como exitosa ("" si está listo). */
export function errorVenta(p: Prospecto): string {
  const ps = productosDe(p).filter((x) => x.nombre.trim() || x.mensual.trim() || x.deducible.trim());
  if (!ps.length) return "Elige al menos un producto";
  if (ps.some((x) => !x.nombre.trim())) return "Falta el nombre de un producto";
  if (ps.some((x) => !((valorUSD(x.mensual) ?? 0) > 0))) return "Falta el valor a pagar mensual";
  return "";
}

export function irAPrecierre(p: Prospecto): Prospecto {
  return { ...p, etapa: ETAPA_PRECIERRE };
}

/** Antes de cerrar: deja los productos limpios y propone el plan contratado. */
export function prepararVenta(p: Prospecto): Prospecto {
  const productos = productosDe(p).filter((x) => x.nombre.trim());
  const x = conProductos(p, productos);
  return txt(x, "cli_plan") ? x : { ...x, cli_plan: productos.map((y) => y.nombre.trim()).join(" + ") };
}

/** Venta exitosa: pasa a Cerrado (registra el día) con el plan contratado. */
export function ventaExitosa(p: Prospecto, hoy: string): Prospecto {
  return conEtapa(prepararVenta(p), ETAPA_CERRADO, hoy);
}

export interface Simulacion {
  hoy: Objetivo;
  con: Objetivo;
  /** Aporte de esta venta al mes. */
  suma: number;
  /** Objetivos que se lograrían con esta venta (y aún no). */
  desbloquea: { prima: number; detalle: string }[];
}

/** Cómo quedaría el objetivo del mes si esta ficha se cierra hoy. */
export function simularCierre(
  items: readonly Prospecto[],
  p: Prospecto,
  hoy: string,
  objetivos?: readonly ObjetivoConfig[],
): Simulacion {
  const resto = items.filter((x) => x.id !== p.id);
  const base = vendido(p) ? items : resto;
  const antes = objetivoMes(base, hoy, objetivos);
  const cerrada = { ...conEtapa(conProductos(p, productosDe(p)), ETAPA_CERRADO, hoy), cerradoEn: hoy };
  const con = objetivoMes([...resto, cerrada], hoy, objetivos);
  return {
    hoy: antes,
    con,
    suma: Math.round((con.prima - antes.prima) * 100) / 100,
    desbloquea: con.escalones
      .filter((e, i) => e.logrado && !antes.escalones[i].logrado)
      .map((e) => ({ prima: e.prima, detalle: e.detalle })),
  };
}

/* ---------- Documentos del cierre ---------- */

export function idDocCierre(fichaId: string, doc: string): string {
  return `cierre:${fichaId}:${doc}`;
}

/** "" si el archivo sirve; si no, por qué. */
export function errorDocCierre(f: { type: string; size: number; name: string }): string {
  const tipo = f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : /\.jpe?g$/i.test(f.name) ? "image/jpeg" : "");
  if (!(TIPOS_DOC_CIERRE as readonly string[]).includes(tipo)) return "Carga el archivo en JPEG o PDF";
  if (f.size > MAX_MB_DOC_CIERRE * 1024 * 1024) return `El archivo pasa de ${MAX_MB_DOC_CIERRE} MB`;
  return "";
}

export function docsCierreListos(p: Prospecto): { hechos: number; total: number; faltan: string[] } {
  const d = p.docsCierre ?? {};
  const faltan = DOCS_CIERRE.filter((x) => !d[x.id]).map((x) => x.l);
  return { hechos: DOCS_CIERRE.length - faltan.length, total: DOCS_CIERRE.length, faltan };
}

/** Qué falta para pasar de "Venta exitosa" a "Cerrado". */
export function faltaCierre(p: Prospecto): string[] {
  const f: string[] = [];
  if (!txt(p, "cli_contrato")) f.push("Número de contrato");
  if (!txt(p, "cli_afiliacion")) f.push("Fecha de emisión");
  return [...f, ...docsCierreListos(p).faltan];
}
