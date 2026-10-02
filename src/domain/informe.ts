/**
 * Informes post reunión (para el cliente), cortos y visuales:
 *  1. Primera reunión: su perfil, lo que contó, su protección hoy, los riesgos
 *     de su trabajo y la estrategia recomendada (un plan, dos planes o plan +
 *     complemento). Sin productos ni tarifas: eso va en la segunda reunión.
 *  2. Segunda reunión: la propuesta trabajada (productos, cuota, coberturas,
 *     bonos) y las respuestas a las objeciones que planteó.
 * Nunca promete rendimientos.
 */
import { saludoMensaje } from "./inicio";
import type { Riesgo } from "../config/ocupaciones";
import { EDAD_MAYOR, MOTIVOS, TIPOS } from "../config/ficha";
import { VALIDAR } from "../config/saludsa";
import type { Perfil } from "./ajustes";
import { firma } from "./herramientas";
import { fmtFecha, hoyISO } from "./fechas";
import { esCambio, motivosDe, num, tipoDe, txt } from "./ficha";
import { aniosHorizonte, perfilIncoherente } from "./analisis";
import { reunionDe } from "./mensajes";
import { fmtUSD, ofertaInforme, planDeOferta, type OfertaInforme } from "./oferta";
import type { Argumento, Plan } from "./biblioteca";
import type { Prospecto } from "./tipos";

export type TipoEstrategia = "un plan" | "dos planes" | "plan + complemento";

export interface Estrategia {
  tipo: TipoEstrategia;
  titulo: string;
  porque: string[];
  complementos: string[];
  costoBeneficio: string[];
}

export type EstadoCobertura = "si" | "parcial" | "no" | "?";

export interface RiesgosInforme {
  ocupacion: string;
  grupo: string;
  laborales: readonly Riesgo[];
  ergonomicos: readonly Riesgo[];
  atencion: readonly string[];
  argumento: string;
}

export interface Informe {
  n: 1;
  cliente: string;
  fecha: string;
  asesor: Perfil;
  tipo: string;
  resumen: { l: string; v: string }[];
  dijo: string[];
  analisis: string[];
  estrategia: Estrategia;
  segunda: string | null;
  pedidos: string[];
  pasos: string[];
  /** Su protección hoy en lo esencial (para el gráfico). */
  proteccion: { l: string; estado: EstadoCobertura }[];
  /** Nivel estimado de protección hoy (0-100), con lo que contó. */
  nivel: number;
  riesgos: RiesgosInforme | null;
  /** La oferta irresistible del final (sin precio: eso va en la propuesta). */
  oferta: OfertaInforme;
}

/** Lo esencial que revisamos en "Su situación hoy": su base financiera para invertir. */
export function proteccionHoy(p: Prospecto): { l: string; estado: EstadoCobertura }[] {
  const v = (k: string) => txt(p, k);
  const sn = (x: string, si: string[], parcial: string[] = []): EstadoCobertura =>
    !x ? "?" : si.includes(x) ? "si" : parcial.includes(x) ? "parcial" : "no";
  return [
    { l: "Fondo de emergencia", estado: sn(v("emergencia"), ["Sí"], ["Parcial"]) },
    { l: "Meta definida", estado: v("meta") ? (v("metaMonto") ? "si" : "parcial") : "?" },
    { l: "Plazo claro", estado: v("horizonte") ? "si" : "?" },
    { l: "Aporte que puede sostener", estado: num(p, "aporte") || num(p, "capital") ? "si" : "?" },
    { l: "Perfil de riesgo", estado: sn(v("perfil"), ["Conservador", "Moderado", "Arriesgado"], ["No sabe"]) },
  ];
}

export function nivelProteccion(xs: readonly { estado: EstadoCobertura }[]): number {
  if (!xs.length) return 0;
  const v = { si: 1, parcial: 0.5, "?": 0.5, no: 0 } as const;
  return Math.round((xs.reduce((a, x) => a + v[x.estado], 0) / xs.length) * 100);
}

export function riesgosInforme(_p: Prospecto): RiesgosInforme | null {
  return null;
}

/** Estrategia recomendada: el plan que mejor acompaña su meta, su plazo y su perfil. */
export function estrategia(p: Prospecto): Estrategia {
  const v = (k: string) => txt(p, k);
  const aporte = num(p, "aporte");
  const capital = num(p, "capital");
  const edad = num(p, "edad");
  const porque: string[] = [];
  const complementos: string[] = [];
  const costoBeneficio: string[] = [];

  let tipo: TipoEstrategia = "un plan";
  let titulo = "Un plan de contribución regular";
  if (capital && capital > 0 && aporte && aporte > 0) {
    tipo = "plan + complemento";
    titulo = "Contribución regular + un aporte único";
    porque.push("El aporte único pone a trabajar desde hoy el capital que ya tiene; el regular construye la meta mes a mes.");
  } else if (capital && capital > 0) {
    titulo = "Un plan de contribución única";
    porque.push("Su capital disponible empieza a trabajar desde el primer día, con un plazo acorde a su meta.");
  } else {
    porque.push("Un aporte mensual constante convierte su meta en un hábito, y el tiempo hace el resto.");
  }
  if (v("meta")) porque.push(`Pensado para su meta: ${v("meta").toLowerCase()}${v("horizonte") ? `, en ${v("horizonte").toLowerCase()}` : ""}.`);

  const pf = v("perfil");
  if (pf === "Conservador" || v("reaccion") === "Retiraría todo")
    complementos.push("Fondos conservadores, para que las subidas y bajadas no le quiten el sueño.");
  else if (pf === "Moderado") complementos.push("Una mezcla de fondos que equilibra crecimiento y estabilidad.");
  else if (pf === "Arriesgado") complementos.push("Fondos de mayor crecimiento, aceptando más variación en el camino.");
  if (v("depende")) complementos.push(`Beneficiarios definidos y una suma asegurada que respalde a ${v("depende")}.`);
  if (edad !== null && edad >= EDAD_MAYOR) complementos.push("A medida que se acerque la meta, mover el dinero a fondos más estables.");
  if (v("emergencia") === "No") complementos.push("Primero, un fondo de emergencia: así no tendrá que retirar antes de tiempo.");

  costoBeneficio.push("Un aporte que pueda sostener sin apretar su presupuesto: la constancia vale más que el monto.");
  if (aporte) costoBeneficio.push(`Partimos de lo que nos dijo que puede aportar: ${fmtUSD(aporte)} al mes.`);
  costoBeneficio.push(`Le explico todos los costos y la tabla de rescates antes de firmar (${VALIDAR}).`);
  if (esCambio(p)) costoBeneficio.push("Calculamos el costo de salir de su inversión actual antes de mover nada.");
  return { tipo, titulo, porque, complementos, costoBeneficio };
}

export function informe(
  p: Prospecto,
  perfil: Perfil,
  hoy: string = hoyISO(),
  planes: readonly Plan[] = [],
  argumentos: readonly Argumento[] = [],
): Informe {
  const cambio = esCambio(p);
  const v = (k: string) => txt(p, k);
  const resumen: { l: string; v: string }[] = [];
  const add = (l: string, x: string) => x && resumen.push({ l, v: x });
  add("Edad", v("edad") ? `${v("edad")} años` : "");
  add("Ciudad", v("ciudad"));
  add("Ocupación", v("ocupacion"));
  add("Quiénes dependen de usted", v("depende"));
  if (cambio) {
    add("Dónde invierte hoy", [v("institucion"), v("producto")].filter(Boolean).join(" · "));
    add("Tiempo con esa inversión", v("tiempoCon"));
    const sa = num(p, "saldoActual");
    add("Saldo acumulado", sa ? fmtUSD(sa) : "");
  } else add("Dónde guarda hoy su dinero", v("ahorroHoy"));
  add("Su meta", v("meta"));
  add("Plazo", v("horizonte"));

  const dijo: string[] = [];
  if (v("porque")) dijo.push(`Por qué ahora: “${v("porque")}”`);
  if (v("grieta")) dijo.push(`Lo que le falla hoy: “${v("grieta")}”`);
  if (v("noPerder")) dijo.push(`Lo que no quiere perder: “${v("noPerder")}”`);
  if (v("costoEvento")) dijo.push(`Si no empieza a invertir: “${v("costoEvento")}”`);

  const analisis: string[] = [];
  const anios = aniosHorizonte(p);
  if (cambio) {
    const ms = motivosDe(p).map((m) => MOTIVOS.find((x) => x.id === m)?.l.toLowerCase()).filter(Boolean);
    if (ms.length) analisis.push(`Lo que hoy no le funciona: ${ms.join(", ")}.`);
    if (v("conoce") === "No" || v("conoce") === "Más o menos")
      analisis.push("Saber en qué está invertido su dinero es clave para decidir bien: lo revisaremos juntos.");
    analisis.push("Antes de mover su dinero calcularemos penalidades y bonos para que no pierda lo ganado.");
  } else {
    if (v("ahorroHoy") === "Cuenta de ahorros" || v("ahorroHoy") === "Efectivo")
      analisis.push("Hoy su dinero está seguro pero quieto: la inflación le quita poder de compra cada año.");
    if (v("ahorroHoy") === "No logra ahorrar") analisis.push("El primer paso es convertir el ahorro en un hábito automático.");
  }
  if (v("emergencia") === "No") analisis.push("Aún no tiene fondo de emergencia: lo tendremos en cuenta para no comprometer su liquidez.");
  if (perfilIncoherente(p)) analisis.push("Prefiere no ver su dinero bajar: elegiremos fondos acordes a esa tranquilidad.");
  if (anios !== null && anios >= 10) analisis.push("Su plazo es largo: el interés compuesto juega a su favor.");
  if (v("depende")) analisis.push(`Su meta también es la de ${v("depende")}.`);

  const r = reunionDe(p, hoy);
  const segunda =
    r && r.dias >= 0 ? `${r.cuando[0].toUpperCase()}${r.cuando.slice(1)}${r.hora ? ` a las ${r.hora}` : ""}${r.lugar ? ` · ${r.lugar}` : ""}` : null;

  const pedidos = cambio
    ? [
        "Su último estado de cuenta.",
        "Las condiciones de su inversión actual: costos y penalidades por retiro anticipado.",
      ]
    : [];

  const pasos = [
    "Estamos trabajando en la mejor propuesta para usted.",
    segunda
      ? `En nuestra segunda reunión (${segunda[0].toLowerCase()}${segunda.slice(1)}) le presento las opciones concretas.`
      : "En nuestra segunda reunión le presento las opciones concretas.",
    ...(cambio ? ["No retire ni cancele su inversión actual hasta revisar juntos el costo de salir."] : []),
  ];

  const riesgos = riesgosInforme(p);
  const proteccion = proteccionHoy(p);

  return {
    n: 1,
    cliente: v("nombre"),
    fecha: hoy,
    asesor: perfil,
    tipo: TIPOS[tipoDe(p)].n,
    resumen,
    dijo,
    analisis,
    estrategia: estrategia(p),
    segunda,
    pedidos,
    pasos,
    proteccion,
    nivel: nivelProteccion(proteccion),
    riesgos,
    oferta: ofertaInforme(p, planDeOferta(p, planes), argumentos),
  };
}

export const NOTA_INFORME = `Este informe resume nuestra conversación y una estrategia recomendada. Aún no incluye productos ni proyecciones: los veremos en la segunda reunión. Los rendimientos no están garantizados; costos y condiciones sujetos a lo que establezca la aseguradora (${VALIDAR}).`;

/** Mensaje de WhatsApp o correo que acompaña al informe. */
/** `whatsapp` = false para el correo: lleva la firma completa. Sin emojis en ningún caso. */
export function textoPostReunion(inf: Informe, whatsapp = true): string {
  const nombre = inf.cliente.split(/\s+/)[0] || "";
  const r: string[] = [];
  r.push(`Hola${nombre ? " " + nombre : ""}, ${saludoMensaje()}. Muchas gracias por su tiempo hoy.`);
  r.push(
    "Le comparto el informe de nuestra reunión con el resumen de lo que conversamos, el análisis de su situación y la estrategia que le recomiendo para alcanzar su meta. Ya estamos trabajando en la mejor propuesta para usted.",
  );
  r.push("");
  r.push(
    inf.segunda
      ? `Nuestra segunda reunión ya quedó agendada: ${inf.segunda}. Le enviaré un recordatorio antes.`
      : `En los próximos días coordinamos nuestra segunda reunión.`,
  );
  if (inf.pedidos.length) {
    r.push("");
    r.push("Para preparar su propuesta, le agradecería compartirme:");
    inf.pedidos.forEach((x, i) => r.push(`${i + 1}. ${x}`));
  }
  r.push("");
  r.push(`¿Cómo calificaría la asesoría de hoy, del 1 al 5? Su opinión me ayuda a mejorar.`);
  r.push("");
  if (whatsapp) r.push(`${inf.asesor.apodo}${inf.asesor.rol ? ", " + inf.asesor.rol : ""}`);
  // En el correo va la firma completa (nombre, rol, WhatsApp y correo).
  else r.push(firma(inf.asesor));
  return r.join("\n");
}

export function asuntoPostReunion(inf: Informe): string {
  return `Informe de nuestra reunión${inf.cliente ? " – " + inf.cliente : ""} (${fmtFecha(inf.fecha)})`;
}
