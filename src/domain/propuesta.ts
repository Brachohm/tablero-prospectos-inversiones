/**
 * Informe de la segunda reunión: la propuesta trabajada (plan, aporte, plazo,
 * proyección en tres escenarios y bonos) y preguntas frecuentes pensadas para las
 * objeciones que planteó en la reunión (sin nombrarlas), reforzadas con tus
 * argumentos y con los riesgos de su trabajo. Corto y fácil de leer. Nada de datos de salud.
 */
import { saludoMensaje } from "./inicio";
import { OBJECIONES_REUNION } from "../config/objeciones";
import { VALIDAR } from "../config/saludsa";
import type { Perfil } from "./ajustes";
import { argumentosPara, lineas, normalizar, type Argumento, type Documento, type Plan } from "./biblioteca";
import { fichaPlan, LETRA_CHICA_VACIA, type Bondad, type Carencia, type Destacado, type FichaPlan } from "./bondades";
import { catalogo } from "./recomendar";
import { productosDe } from "./cierre";
import { fmtFecha, hoyISO } from "./fechas";
import { esCambio, num, tipoDe, txt } from "./ficha";
import { firma } from "./herramientas";
import { riesgosInforme, type RiesgosInforme } from "./informe";
import type { Vitality } from "./vitality";
import { proyeccionDe, type Proyeccion } from "./proyeccion";
import type { Escenarios } from "../config/proyeccion";
import { fmtUSD, ofertaDe, ofertaInforme, planDeOferta, valorUSD, type OfertaInforme } from "./oferta";
import type { Prospecto } from "./tipos";
import { TIPOS } from "../config/ficha";

export interface ProductoPropuesta {
  nombre: string;
  mensual: number | null;
  deducible: number | null;
  coberturas: string[];
  /** Resumen gráfico: lo más importante de su tabla de coberturas. */
  destacados: Destacado[];
  /** Bondades tangibles sacadas de sus documentos (argumentos de cierre). */
  bondades: Bondad[];
  /** Lo que debe saber (sin ocultar nada): deducible y copago de la tabla, carencias y exclusiones. */
  deducibleTxt: string | null;
  copago: string | null;
  carencias: Carencia[];
  exclusiones: { t: string; fuente: string }[];
  /** Si el plan tiene Vitality: sus beneficios semanales, mensuales y anuales (de los documentos). */
  vitality: Vitality | null;
}

export interface RespuestaObjecion {
  /** La pregunta frecuente. */
  titulo: string;
  respuesta: string;
  /** Argumento de tu Biblioteca que la refuerza. */
  apoyo: string | null;
}

export interface Propuesta {
  n: 2;
  cliente: string;
  fecha: string;
  asesor: Perfil;
  tipo: string;
  /** Lo que busca, con sus palabras (máximo 2). */
  busca: string[];
  productos: ProductoPropuesta[];
  total: number | null;
  /** Lo que gana (frente a su plan actual o por incluir el plan). */
  gana: string[];
  /** Preguntas frecuentes pensadas para las objeciones que planteó (sin nombrarlas). */
  objeciones: RespuestaObjecion[];
  riesgos: RiesgosInforme | null;
  /** La oferta irresistible del final, armada sola. */
  oferta: OfertaInforme;
  /** Cambio de seguro: lo que paga hoy frente a lo que pagará, con su encuadre de valor. */
  comparativo: Comparativo | null;
  /** Cambio de seguro desde un masivo o corporativo: por qué conviene uno propio. */
  poliza: { titulo: string; puntos: string[] } | null;
  pasos: string[];
  /** Proyección del plan en tres escenarios (supuestos, no garantizados). */
  proyeccion: Proyeccion | null;
  /** Tipo de plan y plazo del pre-cierre. */
  plan: { tipo: string; plazo: number | null } | null;
  /** Aún no hay productos ni plan en la oferta. */
  pendiente: boolean;
}

export type TipoComparativo = "ahorro" | "igual" | "inversion";

export interface Comparativo {
  hoy: number;
  nuevo: number;
  /** nuevo - hoy (negativo = ahorra). */
  diferencia: number;
  /** La diferencia en un año y en un día (siempre positivas). */
  anual: number;
  porDia: number;
  tipo: TipoComparativo;
  titular: string;
  mensaje: string;
  /** Lo que gana con el cambio (de la comparación de coberturas, lo que anotaste y las bondades con dato). */
  ganancias: string[];
  /** Coberturas y beneficios concretos del plan nuevo. */
  prestaciones: number;
}

/** Diferencias menores a esto se toman como "lo mismo". */
const IGUAL_USD = 1;

/** Montos: enteros sin decimales; si no, con dos ($0,50). */
const usd2 = (n0: number) => {
  const n = Math.round(n0 * 100) / 100;
  return Number.isInteger(n) ? fmtUSD(n) : "$" + n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Lo que paga hoy frente a lo que pagará. Si paga menos, se resalta lo
 * económico para el nivel de prestaciones; si paga más, lo que esa diferencia
 * le da. En los dos casos, con lo que de verdad gana (nada inventado).
 */
export function comparativo(hoy: number, nuevo: number, ganancias: string[], prestaciones: number): Comparativo {
  const diferencia = Math.round((nuevo - hoy) * 100) / 100;
  const abs = Math.abs(diferencia);
  const tipo: TipoComparativo = abs < IGUAL_USD ? "igual" : diferencia < 0 ? "ahorro" : "inversion";
  const anual = Math.round(abs * 12 * 100) / 100;
  const porDia = Math.round((abs / 30) * 100) / 100;
  const cuantas = prestaciones ? `${prestaciones} coberturas y beneficios concretos` : "una protección más completa";
  const titular =
    tipo === "ahorro"
      ? `Paga ${usd2(abs)} menos al mes`
      : tipo === "igual"
        ? "Por lo mismo que paga hoy"
        : `Por ${usd2(abs)} más al mes: ${usd2(porDia)} al día`;
  const mensaje =
    tipo === "ahorro"
      ? `Son ${usd2(anual)} al año a su favor y, aun así, tiene ${cuantas}.`
      : tipo === "igual"
        ? `Con el mismo pago tiene ${cuantas}.`
        : `Esa diferencia, ${usd2(porDia)} al día, se convierte en ${cuantas}.`;
  return { hoy, nuevo, diferencia, anual, porDia, tipo, titular, mensaje, ganancias, prestaciones };
}

/** Objeciones que planteó en la segunda reunión (ids de OBJECIONES_REUNION). */
export function objecionesDe(p: Prospecto): string[] {
  return Array.isArray(p.objeciones2) ? p.objeciones2.filter((x): x is string => typeof x === "string") : [];
}

function planDe(planes: readonly Plan[], id: string | undefined, nombre: string): Plan | undefined {
  return planes.find((x) => (id && x.id === id) || normalizar(x.nombre) === normalizar(nombre.trim()));
}

export function propuesta(
  p: Prospecto,
  perfil: Perfil,
  hoy: string = hoyISO(),
  planes: readonly Plan[] = [],
  argumentos: readonly Argumento[] = [],
  docs: readonly Documento[] = [],
  escenarios?: Partial<Escenarios>,
): Propuesta {
  // Cada plan con sus PDF (también los que aún no se guardaron en Planes).
  const cat = catalogo(planes, docs);
  const ficha = (id: string | undefined, nombre: string) => {
    const item = cat.find((x) => (id && x.plan.id === id) || normalizar(x.plan.nombre) === normalizar(nombre.trim()));
    const f: FichaPlan = item ? fichaPlan(item) : { destacados: [], bondades: [], ...LETRA_CHICA_VACIA };
    // El deducible de la tabla va aparte: el del pre-cierre es un número.
    const { deducible, ...resto } = f;
    return { ...resto, deducibleTxt: deducible, vitality: null };
  };
  const v = (k: string) => txt(p, k);
  const o = ofertaDe(p);

  const busca: string[] = [];
  for (const x of [v("porque"), v("grieta"), o.sueno?.trim() ?? "", v("noPerder") && `No perder ${v("noPerder")}`])
    if (x && busca.length < 2 && !busca.includes(x)) busca.push(x);

  // Productos: los del pre-cierre; si no hay, el plan de la oferta con el precio de la ficha.
  let productos: ProductoPropuesta[] = productosDe(p)
    .filter((x) => x.nombre.trim())
    .map((x) => {
      const pl = planDe(planes, x.planId, x.nombre) ?? cat.find((c) => normalizar(c.plan.nombre) === normalizar(x.nombre.trim()))?.plan;
      return {
        nombre: x.nombre.trim(),
        mensual: valorUSD(x.mensual),
        deducible: valorUSD(x.deducible),
        coberturas: lineas(pl?.coberturas).slice(0, 4),
        ...ficha(x.planId, x.nombre),
      };
    });
  const planOferta = planes.find((x) => x.id === o.planId);
  if (!productos.length && planOferta)
    productos = [
      {
        nombre: planOferta.nombre,
        mensual: num(p, "precio"),
        deducible: null,
        coberturas: lineas(planOferta.coberturas).slice(0, 4),
        ...ficha(planOferta.id, planOferta.nombre),
      },
    ];
  const conPrecio = productos.filter((x) => x.mensual !== null);
  const total = conPrecio.length ? Math.round(conPrecio.reduce((a, x) => a + x.mensual!, 0) * 100) / 100 : null;

  const gana = esCambio(p)
    ? v("gana")
        .split(/;|\n/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 4)
    : productos
        .flatMap((x) => lineas(planDe(planes, undefined, x.nombre)?.beneficios))
        .slice(0, 3);

  const riesgos = riesgosInforme(p);
  const args = argumentosPara(p, argumentos);
  const objeciones: RespuestaObjecion[] = objecionesDe(p).flatMap((id) => {
    const ob = OBJECIONES_REUNION.find((x) => x.id === id);
    if (!ob) return [];
    const apoyoArg = args.find((a) => a.etiquetas.includes(ob.etiqueta)) ?? argumentos.find((a) => a.etiquetas.includes(ob.etiqueta));
    let respuesta = ob.respuesta;
    if (id === "dinero" && v("costoEvento")) respuesta += ` Y si no empieza, su plan B era: ${v("costoEvento")}.`;
    return [{ titulo: ob.titulo, respuesta, apoyo: apoyoArg ? apoyoArg.titulo || apoyoArg.texto : null }];
  });
  const otra = v("objecionOtra");
  if (otra)
    objeciones.push({
      titulo: "¿Y si tengo otra duda?",
      respuesta: "Escríbame cuando lo desee: la revisamos juntos y le doy una respuesta clara y por escrito antes de que decida.",
      apoyo: null,
    });

  const oferta = ofertaInforme(p, planDeOferta(p, planes), argumentos, total);

  const comp: Comparativo | null = null;
  const proyeccion = proyeccionDe(p, escenarios);
  const tipoPlan = v("tipoPlan");
  const plazo = num(p, "plazo");

  const pasos = [
    "Revise esta propuesta con calma (y con quien decide con usted).",
    "Confírmeme el plan que elige y preparamos su contratación.",
    ...(esCambio(p) ? ["No retire ni cancele su inversión actual hasta revisar juntos el costo de salir."] : []),
  ];

  return {
    n: 2,
    cliente: v("nombre"),
    fecha: hoy,
    asesor: perfil,
    tipo: TIPOS[tipoDe(p)].n,
    busca,
    productos,
    total,
    gana,
    objeciones,
    riesgos,
    oferta,
    pasos,
    pendiente: productos.length === 0,
    comparativo: comp,
    poliza: null,
    proyeccion,
    plan: tipoPlan ? { tipo: tipoPlan, plazo } : null,
  };
}

export const NOTA_PROPUESTA = `Propuesta referencial preparada con la información de nuestras reuniones. Las proyecciones usan rendimientos supuestos: no son una promesa ni están garantizadas. Costos, rescates y condiciones sujetos a la aseguradora (${VALIDAR}).`;

/** Mensaje que acompaña a la propuesta. Sin emojis. `whatsapp` = false lleva la firma completa. */
export function textoPropuesta(pr: Propuesta, whatsapp = true): string {
  const nombre = pr.cliente.split(/\s+/)[0] || "";
  const r: string[] = [];
  r.push(`Hola${nombre ? " " + nombre : ""}, ${saludoMensaje()}. Muchas gracias por su tiempo en nuestra segunda reunión.`);
  r.push(
    "Le comparto el resumen de la propuesta que trabajamos para usted" +
      (pr.objeciones.length ? ", con algunas preguntas frecuentes que le pueden servir." : "."),
  );
  if (pr.productos.length) {
    r.push("");
    const unico = pr.plan?.tipo === "Contribución única";
    for (const x of pr.productos)
      r.push(`- ${x.nombre}${x.mensual !== null ? (unico ? `: aporte único de ${usd2(x.mensual)}` : `: ${usd2(x.mensual)} al mes`) : ""}`);
    if (pr.plan?.plazo) r.push(`Plazo: ${pr.plan.plazo} años.`);
  }
  const py = pr.proyeccion;
  if (py) {
    r.push("");
    r.push(
      `Como referencia, con un rendimiento supuesto de ${py.tasas.moderado}% anual podría acumular cerca de ${usd2(Math.round(py.final.moderado))} en ${py.anios} años (aportando ${usd2(py.final.aportado)}). No es una promesa: los rendimientos no están garantizados.`,
    );
  }
  r.push("");
  r.push("Revísela con calma y cuénteme qué plan elige para preparar su contratación.");
  r.push("");
  r.push("¿Cómo calificaría la asesoría de hoy, del 1 al 5? Su opinión me ayuda a mejorar.");
  r.push("");
  if (whatsapp) r.push(`${pr.asesor.apodo}${pr.asesor.rol ? ", " + pr.asesor.rol : ""}`);
  else r.push(firma(pr.asesor));
  return r.join("\n");
}

export function asuntoPropuesta(pr: Propuesta): string {
  return `Su propuesta de inversión${pr.cliente ? " – " + pr.cliente : ""} (${fmtFecha(pr.fecha)})`;
}
