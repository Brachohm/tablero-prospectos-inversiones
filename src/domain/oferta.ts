/**
 * Armador de ofertas tipo Hormozi ("$100M Offers"):
 *   valor = (resultado soñado × probabilidad percibida) / (tiempo × esfuerzo)
 * más una pila de bonos, una garantía y una urgencia. Todo debe ser real:
 * lo que dependa de la aseguradora sale del catálogo del asesor y se marca
 * "validar con la aseguradora"; los bonos del asesor son compromisos propios.
 */
import { BONOS_ASESOR } from "../config/biblioteca";
import { EDAD_MAYOR } from "../config/ficha";
import { VALIDAR } from "../config/saludsa";
import { argumentosPara, lineas, normalizar, type Argumento, type Plan } from "./biblioteca";
import { productosDe } from "./cierre";
import { riesgosDe } from "./ocupacion";
import { fmtFecha } from "./fechas";
import { esCambio, nuevoId, num, txt } from "./ficha";
import type { Bono, Oferta, Prospecto } from "./tipos";

export function ofertaDe(p: Prospecto): Oferta {
  return p.oferta && typeof p.oferta === "object" ? p.oferta : {};
}

export function bonosDe(o: Oferta): Bono[] {
  return Array.isArray(o.bonos) ? o.bonos : [];
}

export function nuevoBono(t: string, valor = ""): Bono {
  return { id: nuevoId(), t, valor };
}

/** Número de un texto como "120", "120 USD", "$1.200,50". */
export function valorUSD(s: string | undefined): number | null {
  const m = (s ?? "").replace(/\s/g, "").match(/\d[\d.,]*/);
  if (!m) return null;
  let t = m[0];
  // "1.200,50" o "1,200.50": el último separador con 1-2 decimales es el decimal.
  const dec = t.match(/[.,](\d{1,2})$/);
  const entero = dec ? t.slice(0, -dec[0].length) : t;
  t = entero.replace(/[.,]/g, "") + (dec ? "." + dec[1] : "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface Sugerencias {
  nombre: string[];
  sueno: string[];
  prueba: string[];
  tiempo: string[];
  esfuerzo: string[];
  bonos: string[];
  garantia: string[];
  urgencia: string[];
}

/** Ideas sacadas de la ficha, del plan y de los argumentos. El asesor elige y edita. */
export function sugerencias(p: Prospecto, plan?: Plan, args: readonly Argumento[] = []): Sugerencias {
  const cambio = esCambio(p);
  const depende = txt(p, "depende");
  const edad = num(p, "edad");

  const avatar = depende ? "Familia" : edad !== null && edad >= EDAD_MAYOR ? "Tranquilidad 55+" : "Salud";
  const meta = cambio ? "sin sorpresas" : depende ? "protegida" : "en orden";
  const nombre = [`${avatar} ${meta}`];
  if (plan?.nombre) nombre.push(`${avatar} ${meta} · ${plan.nombre}`);

  const sueno: string[] = [];
  if (txt(p, "porque")) sueno.push(txt(p, "porque"));
  if (depende) sueno.push(`Que ${depende} esté protegido si algo pasa`);
  if (txt(p, "costoEvento") || txt(p, "emergencia"))
    sueno.push("Que una cirugía o una emergencia no se lleve sus ahorros");
  if (txt(p, "noPerder")) sueno.push(`Cambiarse sin perder ${txt(p, "noPerder")}`);
  if (txt(p, "grieta")) sueno.push(`Dejar atrás esto: ${txt(p, "grieta")}`);
  const riesgos = riesgosDe(p);
  if (riesgos) sueno.push(`Que un accidente o una lesión por su trabajo no le quite ingresos ni ahorros`);

  const prueba = [
    ...argumentosPara(p, args)
      .slice(0, 3)
      .map((a) => a.titulo || a.texto),
    ...lineas(plan?.coberturas).slice(0, 3),
    ...(riesgos ? [riesgos.perfil.argumento] : []),
  ];

  const tiempo = ["Le envío la cotización y la comparación hoy mismo"];
  if (cambio) tiempo.push("Coordinamos fechas para que no quede ni un día sin cobertura");

  const esfuerzo = [
    "Yo me encargo de los trámites: usted solo firma",
    "Le ayudo a llenar la declaración de salud",
    "Le acompaño en cada reembolso",
  ];
  if (cambio) esfuerzo.push("Comparo su póliza actual línea por línea por usted");

  const bonos = [...lineas(plan?.beneficios), ...BONOS_ASESOR];

  const garantia = [
    ...lineas(plan?.garantias),
    "Antes de firmar revisamos juntos lo que cubre y lo que no, sin letra chica",
  ];

  const urgencia: string[] = [];
  if (!cambio) urgencia.push("Las carencias corren desde que contrata: cada mes que espera, se corren un mes más");
  const ren = txt(p, "renovacion");
  if (cambio && ren) urgencia.push(`Su póliza actual renueva el ${fmtFecha(ren)}: decidir antes evita otro año igual`);

  return { nombre, sueno, prueba, tiempo, esfuerzo, bonos, garantia, urgencia };
}

export function fmtUSD(n: number): string {
  return (
    "$" +
    n.toLocaleString("es-EC", { minimumFractionDigits: 0, maximumFractionDigits: Number.isInteger(n) ? 0 : 2 })
  );
}

/* ---------- La oferta irresistible de los informes ---------- */

/** Oferta lista para el cierre de cada informe: se arma sola, sin llenar nada. */
export interface OfertaInforme {
  nombre: string;
  /** Plan de la Biblioteca en que se apoya (si hay). */
  plan: string | null;
  /** El resultado que busca. */
  sueno: string;
  /** Por qué funciona: sus argumentos y coberturas del plan. */
  prueba: string[];
  /** Desde cuándo lo siente. */
  tiempo: string;
  /** Lo que el asesor hace por él. */
  esfuerzo: string[];
  bonos: { t: string; valor: number | null }[];
  totalBonos: number;
  garantia: string;
  urgencia: string;
  /** Inversión mensual (solo en la propuesta). */
  inversion: number | null;
}

const SUENO_BASE = "Que un imprevisto de salud no afecte su tranquilidad ni sus ahorros";
const TIEMPO_BASE = `Desde que su póliza está vigente; algunas coberturas tienen tiempos de espera (${VALIDAR})`;
const URGENCIA_CAMBIO = "Revisarlo con tiempo le permite decidir con calma, antes de la próxima renovación de su póliza";

/** Plan de la oferta: el primero del pre-cierre que esté en la Biblioteca o el elegido al comparar coberturas. */
export function planDeOferta(p: Prospecto, planes: readonly Plan[]): Plan | undefined {
  for (const x of productosDe(p)) {
    const pl = planes.find((y) => (x.planId && y.id === x.planId) || (!!x.nombre.trim() && normalizar(y.nombre) === normalizar(x.nombre.trim())));
    if (pl) return pl;
  }
  const o = ofertaDe(p);
  return planes.find((x) => x.id === o.planId);
}

/** Primeras palabras: "Le acompaño en cada reembolso" y "… hasta que se pague" son lo mismo. */
const clave = (x: string) => normalizar(x).split(/\s+/).slice(0, 3).join(" ");

const unico = (xs: string[]) => xs.filter((x, i) => x.trim() && xs.findIndex((y) => normalizar(y) === normalizar(x)) === i);

/**
 * Oferta del informe, solo con lo que ya hay: la ficha, el plan de la
 * Biblioteca y los argumentos. Si en una ficha antigua se escribió la oferta
 * a mano, eso manda. Los bonos sin valor escrito no llevan monto (no se inventa).
 */
export function ofertaInforme(
  p: Prospecto,
  plan?: Plan,
  args: readonly Argumento[] = [],
  inversion: number | null = null,
): OfertaInforme {
  const o = ofertaDe(p);
  const sug = sugerencias(p, plan, args);
  const propio = (x: string | undefined) => x?.trim() || "";

  const guardados = bonosDe(o)
    .filter((b) => b.t.trim())
    .map((b) => ({ t: b.t.trim(), valor: valorUSD(b.valor) }));
  const bonos = (guardados.length ? guardados : unico(sug.bonos).map((t) => ({ t, valor: null }))).slice(0, 4);

  return {
    nombre: propio(o.nombre) || sug.nombre[0],
    plan: plan?.nombre.trim() || null,
    sueno: propio(o.sueno) || sug.sueno[0] || SUENO_BASE,
    prueba: unico([propio(o.prueba), ...sug.prueba]).slice(0, 3),
    tiempo: propio(o.tiempo) || (esCambio(p) ? sug.tiempo[sug.tiempo.length - 1] : TIEMPO_BASE),
    // Lo que ya va como bono no se repite en "lo que hago por usted".
    esfuerzo: unico([propio(o.esfuerzo), ...sug.esfuerzo])
      .filter((x) => !bonos.some((b) => clave(b.t) === clave(x)))
      .slice(0, 3),
    bonos,
    totalBonos: bonos.reduce((a, b) => a + (b.valor ?? 0), 0),
    garantia: propio(o.garantia) || sug.garantia[0],
    urgencia: propio(o.urgencia) || sug.urgencia[0] || URGENCIA_CAMBIO,
    inversion,
  };
}
