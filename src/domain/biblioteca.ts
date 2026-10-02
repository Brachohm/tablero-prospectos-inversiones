/**
 * Biblioteca: documentos (texto por página para buscar sin conexión),
 * catálogo de planes y argumentos de venta. Todo lo carga el asesor desde el
 * material oficial; nada de esto viene de SaludSA ni sale del dispositivo.
 */
import { EDAD_MAYOR } from "../config/ficha";
import { motivosDe, nuevoId, num, txt } from "./ficha";
import type { Prospecto } from "./tipos";

export type TipoDoc = "condiciones" | "anexo" | "tarifas" | "otro";

export interface Documento {
  id: string;
  nombre: string;
  tipo: TipoDoc;
  /** Plan al que corresponde (texto libre; vacío si es general). */
  plan: string;
  /** Texto de cada página, para buscar. */
  paginas: string[];
  /** Hay un archivo (PDF) guardado para abrirlo. */
  archivo: boolean;
  bytes: number;
  creado: number;
  mod: number;
}

/** Un plan del catálogo. Los campos de lista se escriben una línea por punto. */
export interface Plan {
  id: string;
  nombre: string;
  /** Para quién es (avatar): "Familias jóvenes", "Persona sola"… */
  publico: string;
  /** Modalidad: Abierta, Mixta o Red cerrada. Si está vacía se busca en el nombre y los PDF del producto. */
  modalidad?: string;
  /** Precio de referencia (texto: "desde 85 USD al mes"). */
  precio: string;
  coberturas: string;
  carencias: string;
  exclusiones: string;
  /** Beneficios y servicios incluidos: se proponen como bonos de la oferta. */
  beneficios: string;
  /** Garantías que SaludSA sí ofrece por escrito. */
  garantias: string;
  notas: string;
  /** De dónde salió (documento y página). */
  fuente: string;
  /** Tabla de coberturas para comparar (conceptos de config/coberturas). */
  tabla?: Partial<Record<string, string>>;
  creado: number;
  mod: number;
}

export interface Argumento {
  id: string;
  titulo: string;
  texto: string;
  etiquetas: string[];
  fuente: string;
  creado: number;
  mod: number;
}

export const CAMPOS_PLAN: readonly { k: keyof Plan; l: string; lista?: boolean; ph?: string }[] = [
  { k: "nombre", l: "Nombre del plan" },
  { k: "publico", l: "¿Para quién es?", ph: "Familias jóvenes, persona sola, mayores de 55…" },
  { k: "modalidad", l: "Modalidad", ph: "Abierta, Mixta o Red cerrada" },
  { k: "precio", l: "Precio de referencia", ph: "Desde 85 USD al mes" },
  { k: "coberturas", l: "Coberturas principales", lista: true, ph: "Una por línea" },
  { k: "carencias", l: "Carencias (tiempos de espera)", lista: true, ph: "Maternidad: 10 meses…" },
  { k: "exclusiones", l: "Exclusiones", lista: true },
  { k: "beneficios", l: "Beneficios y servicios incluidos", lista: true, ph: "Se proponen como bonos de la oferta" },
  { k: "garantias", l: "Garantías por escrito", lista: true },
  { k: "notas", l: "Notas" },
  { k: "fuente", l: "Fuente", ph: "Anexo del plan, página 4" },
];

export function crearPlan(ahora = Date.now()): Plan {
  return {
    id: nuevoId(ahora),
    nombre: "",
    publico: "",
    precio: "",
    coberturas: "",
    carencias: "",
    exclusiones: "",
    beneficios: "",
    garantias: "",
    notas: "",
    fuente: "",
    creado: ahora,
    mod: ahora,
  };
}

export function crearArgumento(ahora = Date.now(), base: Partial<Argumento> = {}): Argumento {
  return { id: nuevoId(ahora), titulo: "", texto: "", etiquetas: [], fuente: "", ...base, creado: ahora, mod: ahora };
}

/** Líneas no vacías de un campo de lista (quita viñetas al inicio). */
export function lineas(s: string | undefined): string[] {
  return (s ?? "")
    .split(/\r?\n/)
    .map((x) => x.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);
}

/** Minúsculas y sin tildes, para comparar. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Texto de una página extraída: une espacios repetidos y guiones de fin de línea. */
export function limpiarTexto(s: string): string {
  return s
    .replace(/-\n(?=\p{Ll})/gu, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Divide un texto pegado a mano en "páginas" de ~3000 caracteres (por párrafos). */
export function paginarTexto(s: string, max = 3000): string[] {
  const parrafos = limpiarTexto(s).split(/\n\s*\n/);
  const pags: string[] = [];
  let actual = "";
  for (const p of parrafos) {
    if (actual && actual.length + p.length > max) {
      pags.push(actual);
      actual = "";
    }
    actual = actual ? actual + "\n\n" + p : p;
  }
  if (actual) pags.push(actual);
  return pags;
}

export interface Resultado {
  docId: string;
  doc: string;
  /** Página (desde 1). */
  pagina: number;
  /** Fragmento alrededor de la coincidencia. */
  fragmento: string;
  puntos: number;
}

function terminos(consulta: string): string[] {
  return [...new Set(normalizar(consulta).split(/[^\p{L}\p{N}%]+/u).filter((t) => t.length >= 2))];
}

function contar(texto: string, t: string): number {
  let n = 0;
  for (let i = texto.indexOf(t); i >= 0; i = texto.indexOf(t, i + t.length)) n++;
  return n;
}

/**
 * Busca en el texto de los documentos. Una página coincide si contiene todas
 * las palabras (sin importar tildes ni mayúsculas). Ordena por coincidencias.
 */
export function buscar(docs: readonly Documento[], consulta: string, max = 30, radio = 110): Resultado[] {
  const ts = terminos(consulta);
  if (!ts.length) return [];
  const out: Resultado[] = [];
  for (const d of docs) {
    d.paginas.forEach((pag, i) => {
      // La normalización NFD + quitar marcas conserva la longitud en español
      // (á → a), así que las posiciones sirven para recortar el original.
      const n = normalizar(pag);
      if (n.length !== pag.length) return buscarLento(d, pag, i, ts, out, radio);
      if (!ts.every((t) => n.includes(t))) return;
      const pos = n.indexOf(ts[0]);
      out.push({
        docId: d.id,
        doc: d.nombre,
        pagina: i + 1,
        fragmento: recortar(pag, pos, radio),
        puntos: ts.reduce((a, t) => a + contar(n, t), 0),
      });
    });
  }
  return out.sort((a, b) => b.puntos - a.puntos || a.doc.localeCompare(b.doc) || a.pagina - b.pagina).slice(0, max);
}

/** Caso raro (caracteres que cambian de largo al normalizar): fragmento desde el inicio. */
function buscarLento(d: Documento, pag: string, i: number, ts: string[], out: Resultado[], radio: number) {
  const n = normalizar(pag);
  if (!ts.every((t) => n.includes(t))) return;
  out.push({
    docId: d.id,
    doc: d.nombre,
    pagina: i + 1,
    fragmento: recortar(pag, 0, radio),
    puntos: ts.reduce((a, t) => a + contar(n, t), 0),
  });
}

function recortar(s: string, pos: number, radio: number): string {
  const ini = Math.max(0, pos - radio);
  const fin = Math.min(s.length, pos + radio * 2);
  let f = s.slice(ini, fin).replace(/\s+/g, " ").trim();
  if (ini > 0) f = "…" + f.replace(/^\S*\s/, "");
  if (fin < s.length) f = f.replace(/\s\S*$/, "") + "…";
  return f;
}

/** Partes de un texto marcando las palabras buscadas (para resaltarlas). */
export function resaltar(texto: string, consulta: string): { t: string; m: boolean }[] {
  const ts = terminos(consulta);
  const n = normalizar(texto);
  if (!ts.length || n.length !== texto.length) return [{ t: texto, m: false }];
  const marcas = new Array<boolean>(texto.length).fill(false);
  for (const t of ts) for (let i = n.indexOf(t); i >= 0; i = n.indexOf(t, i + 1)) marcas.fill(true, i, i + t.length);
  const out: { t: string; m: boolean }[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ult = out[out.length - 1];
    if (ult && ult.m === marcas[i]) ult.t += texto[i];
    else out.push({ t: texto[i], m: marcas[i] });
  }
  return out;
}

/** Etiquetas de argumento que corresponden a esta ficha. */
export function etiquetasDeFicha(p: Prospecto): string[] {
  const e = new Set<string>(["general"]);
  const obj = txt(p, "objecion");
  if (obj && obj !== "Ninguna") e.add("obj:" + obj);
  for (const m of motivosDe(p)) e.add("mot:" + m);
  if (txt(p, "depende")) e.add("familia");
  const edad = num(p, "edad");
  if (edad !== null && edad >= EDAD_MAYOR) e.add("mayor");
  if (txt(p, "emergencia") === "No" || txt(p, "emergencia") === "Parcial") e.add("emergencia");
  return [...e];
}

/**
 * Argumentos útiles para esta ficha: primero los que coinciden con más
 * etiquetas específicas; los "general" al final.
 */
export function argumentosPara(p: Prospecto, args: readonly Argumento[]): Argumento[] {
  const e = new Set(etiquetasDeFicha(p));
  const puntos = (a: Argumento) =>
    a.etiquetas.reduce((n, x) => n + (e.has(x) ? (x === "general" ? 1 : 10) : 0), 0);
  return args
    .map((a) => ({ a, n: puntos(a) }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n || y.a.mod - x.a.mod)
    .map((x) => x.a);
}
