/**
 * Informes post reunión (para el cliente), cortos y visuales:
 *  1. Primera reunión: su perfil, lo que contó, su protección hoy, los riesgos
 *     de su trabajo y la estrategia recomendada (un plan, dos planes o plan +
 *     complemento). Sin productos ni tarifas: eso va en la segunda reunión.
 *  2. Segunda reunión: la propuesta trabajada (productos, cuota, coberturas,
 *     bonos) y las respuestas a las objeciones que planteó.
 * Los datos de salud no se detallan en ningún informe.
 */
import { saludoMensaje } from "./inicio";
import { CONCEPTOS, type IdConcepto } from "../config/coberturas";
import type { Riesgo } from "../config/ocupaciones";
import { EDAD_MAYOR, MOTIVOS, TIPOS } from "../config/ficha";
import { VALIDAR } from "../config/saludsa";
import type { Perfil } from "./ajustes";
import { firma } from "./herramientas";
import { interpretar, primaActualDe, tablaDe } from "./comparar";
import { fmtFecha, hoyISO } from "./fechas";
import { esCambio, motivosDe, num, tieneMotivo, tipoDe, txt } from "./ficha";
import { reunionDe } from "./mensajes";
import { fmtUSD, ofertaInforme, planDeOferta, type OfertaInforme } from "./oferta";
import type { Argumento, Plan } from "./biblioteca";
import { personasDe, preStats } from "./pre";
import { riesgosDe } from "./ocupacion";
import { argumentoPoliza } from "./poliza";
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

/** Lo esencial que revisamos en "Su protección hoy". */
const ESENCIALES: readonly IdConcepto[] = ["hospitalaria", "emergencias", "ambulatoria", "medicinas", "examenes"];

export function proteccionHoy(p: Prospecto): { l: string; estado: EstadoCobertura }[] {
  const l = (id: IdConcepto) => CONCEPTOS.find((c) => c.id === id)!.l;
  if (esCambio(p)) {
    const t = tablaDe(p.planActual?.tabla);
    return ESENCIALES.map((id) => {
      const v = interpretar(t[id]);
      return { l: l(id), estado: v.tipo === "vacio" ? "?" : v.tipo === "no" ? "no" : "si" };
    });
  }
  const c = txt(p, "cobertura");
  const estado: EstadoCobertura = /iess|seguro social|publica/i.test(c)
    ? "parcial"
    : !c || /ningun|no tengo|nada|^no$/i.test(c)
      ? "no"
      : "?";
  return ESENCIALES.map((id) => ({ l: l(id), estado }));
}

export function nivelProteccion(xs: readonly { estado: EstadoCobertura }[]): number {
  if (!xs.length) return 0;
  const v = { si: 1, parcial: 0.5, "?": 0.5, no: 0 } as const;
  return Math.round((xs.reduce((a, x) => a + v[x.estado], 0) / xs.length) * 100);
}

export function riesgosInforme(p: Prospecto): RiesgosInforme | null {
  const r = riesgosDe(p);
  if (!r) return null;
  return {
    ocupacion: r.ocupacion,
    grupo: r.perfil.l,
    laborales: r.perfil.laborales,
    ergonomicos: r.perfil.ergonomicos,
    atencion: r.perfil.atencion,
    argumento: r.perfil.argumento,
  };
}

const PADRES = /\b(padre|madre|papa|mama|papá|mamá|padres|suegr[oa]s?|abuel[oa]s?)\b/i;

function edadesPersonas(p: Prospecto): number[] {
  return personasDe(p)
    .map((x) => Number(x.edad))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Estrategia de protección: máxima protección con el mejor costo-beneficio. */
export function estrategia(p: Prospecto): Estrategia {
  const depende = txt(p, "depende");
  const edad = num(p, "edad");
  const edades = edadesPersonas(p);
  const hayMayor = (edad !== null && edad >= EDAD_MAYOR) || edades.some((e) => e >= EDAD_MAYOR);
  const hayJoven = edades.some((e) => e < EDAD_MAYOR - 20) || /hij/i.test(depende);
  const familia = !!depende || personasDe(p).length > 1;
  const padresACargo = PADRES.test(depende);
  const precioSensible =
    txt(p, "criterio") === "Precio" || txt(p, "objecion") === "Precio" || tieneMotivo(p, "costos") || num(p, "pre_limite") !== null;
  const conIESS = /iess|seguro social/i.test(txt(p, "cobertura"));
  const conPre = tipoDe(p) === "nuevo" ? preStats(p).condiciones > 0 : txt(p, "declaro") === "Sí";
  const altoCosto = !!(txt(p, "costoEvento") || txt(p, "emergencia"));
  const actual = tablaDe(p.planActual?.tabla);
  const faltan = CONCEPTOS.filter((c) => interpretar(actual[c.id]).tipo === "no").map((c) => c.l.toLowerCase());

  let tipo: TipoEstrategia = "un plan";
  let titulo = familia ? "Un plan familiar integral" : "Un plan individual integral";
  const porque: string[] = [];
  if (familia && (padresACargo || (hayMayor && hayJoven))) {
    tipo = "dos planes";
    titulo = "Dos planes: uno para el grupo mayor y otro para el resto de la familia";
    porque.push(
      "Separar por grupos de edad suele optimizar el costo total sin bajar la protección de nadie.",
      "Cada grupo recibe las coberturas que más necesita.",
    );
  } else if (familia) {
    porque.push("Proteger a toda la familia en un solo plan simplifica el uso y suele mejorar el costo por persona.");
  } else {
    porque.push("Una cobertura integral pensada en su situación y en lo que es importante para usted.");
  }

  const complementos: string[] = [];
  if (altoCosto || precioSensible)
    complementos.push("Protección para eventos de alto costo (hospitalización, cirugías y enfermedades graves).");
  if (conIESS) complementos.push("Complemento a su cobertura del IESS para atención privada, más rápida y con libertad de elegir.");
  for (const f of faltan.slice(0, 3)) complementos.push(`Cubrir lo que hoy no tiene: ${f}.`);
  if (conPre) complementos.push("Opciones que tomen en cuenta su declaración de salud y sus tiempos de espera.");
  if (complementos.length && tipo === "un plan") {
    tipo = "plan + complemento";
    titulo = `${titulo} + un complemento`;
  }

  const costoBeneficio: string[] = [];
  if (precioSensible)
    costoBeneficio.push("Priorizar lo que más protege (hospitalización y cirugía) y ajustar el deducible para cuidar la cuota.");
  costoBeneficio.push("No pagar por coberturas que no va a usar.");
  const limite = num(p, "pre_limite");
  if (limite) costoBeneficio.push(`Mantener la inversión dentro de lo que se siente cómodo pagando (${fmtUSD(limite)} al mes).`);
  const pa = esCambio(p) ? primaActualDe(p, actual) : null;
  if (pa) costoBeneficio.push(`Tomar como referencia lo que paga hoy (${fmtUSD(pa)} al mes) y mostrarle qué gana por cada dólar.`);
  if (familia) costoBeneficio.push("Comparar un plan familiar frente a planes separados para elegir el más conveniente.");

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
    add("Aseguradora actual", v("aseguradora"));
    add("Tiempo con ella", v("tiempoCon"));
    add("Tipo de seguro", v("tipoPoliza"));
    const pa = primaActualDe(p, tablaDe(p.planActual?.tabla));
    add("Paga hoy", pa ? `${fmtUSD(pa)} al mes` : "");
  } else add("Cobertura actual", v("cobertura"));

  const dijo: string[] = [];
  if (v("porque")) dijo.push(`Por qué ahora: “${v("porque")}”`);
  if (v("grieta")) dijo.push(`Lo que le falla hoy: “${v("grieta")}”`);
  if (v("noPerder")) dijo.push(`Lo que no quiere perder: “${v("noPerder")}”`);
  if (v("emergencia")) dijo.push(`Si mañana hubiera una emergencia: “${v("emergencia")}”`);

  const analisis: string[] = [];
  if (cambio) {
    const ms = motivosDe(p).map((m) => MOTIVOS.find((x) => x.id === m)?.l.toLowerCase()).filter(Boolean);
    if (ms.length) analisis.push(`Lo que hoy no le funciona: ${ms.join(", ")}.`);
    const actual = tablaDe(p.planActual?.tabla);
    const faltan = CONCEPTOS.filter((c) => interpretar(actual[c.id]).tipo === "no").map((c) => c.l.toLowerCase());
    if (faltan.length) analisis.push(`Su plan actual no incluye: ${faltan.join(", ")}.`);
    if (v("conoce") === "No" || v("conoce") === "Más o menos")
      analisis.push("Conocer bien su cobertura y el proceso de reembolso es clave para aprovecharla: le acompañaré en eso.");
    const pol = argumentoPoliza(p);
    if (pol) analisis.push(pol.puntos[0]);
    analisis.push("Antes de cambiar revisaremos su antigüedad, carencias y preexistencias para que no pierda lo ganado.");
  } else {
    if (/iess|ninguna|no tengo|nada/i.test(v("cobertura")) || !v("cobertura"))
      analisis.push("Hoy depende de la cobertura pública o de pagar de su bolsillo ante un imprevisto.");
    if (v("costoEvento")) analisis.push(`Ante una hospitalización o cirugía: “${v("costoEvento")}”.`);
    if (v("depende")) analisis.push(`Su protección también es la de ${v("depende")}.`);
  }
  const edad = num(p, "edad");
  if (edad !== null && edad >= EDAD_MAYOR)
    analisis.push("A su edad conviene asegurar una cobertura estable para el largo plazo.");
  const conPre = tipoDe(p) === "nuevo" ? preStats(p).condiciones > 0 : v("declaro") === "Sí";
  if (conPre) analisis.push("Registramos su declaración de salud; la tendremos en cuenta en la propuesta.");

  const r = reunionDe(p, hoy);
  const segunda =
    r && r.dias >= 0 ? `${r.cuando[0].toUpperCase()}${r.cuando.slice(1)}${r.hora ? ` a las ${r.hora}` : ""}${r.lugar ? ` · ${r.lugar}` : ""}` : null;

  const pedidos = cambio
    ? [
        "El PDF de la tabla de coberturas de su plan actual.",
        "La sábana de reclamos (su historial de reclamos): puede solicitarla a su asesor o a su aseguradora.",
      ]
    : [];

  const pasos = [
    "Estamos trabajando en la mejor propuesta para usted.",
    segunda
      ? `En nuestra segunda reunión (${segunda[0].toLowerCase()}${segunda.slice(1)}) le presento las opciones concretas.`
      : "En nuestra segunda reunión le presento las opciones concretas.",
    ...(cambio ? ["Mantenga su póliza actual hasta que la nueva esté vigente."] : []),
  ];

  const riesgos = riesgosInforme(p);
  if (riesgos)
    analisis.push(
      `Por su trabajo (${riesgos.ocupacion.toLowerCase()}) conviene estar preparado para: ${riesgos.atencion.slice(0, 3).join(", ").toLowerCase()}.`,
    );
  const proteccion = proteccionHoy(p);

  return {
    n: 1,
    cliente: v("nombre"),
    fecha: hoy,
    asesor: perfil,
    tipo: cambio ? "Cambio de seguro" : TIPOS.nuevo.n,
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

export const NOTA_INFORME = `Este informe resume nuestra conversación y una estrategia recomendada. Aún no incluye productos ni tarifas: los veremos en la segunda reunión. Coberturas y condiciones sujetas a lo que establezca la aseguradora (${VALIDAR}).`;

/** Mensaje de WhatsApp o correo que acompaña al informe. */
/** `whatsapp` = false para el correo: lleva la firma completa. Sin emojis en ningún caso. */
export function textoPostReunion(inf: Informe, whatsapp = true): string {
  const nombre = inf.cliente.split(/\s+/)[0] || "";
  const r: string[] = [];
  r.push(`Hola${nombre ? " " + nombre : ""}, ${saludoMensaje()}. Muchas gracias por su tiempo hoy.`);
  r.push(
    "Le comparto el informe de nuestra reunión con el resumen de lo que conversamos, el análisis de su situación y la estrategia que le recomiendo para protegerle al máximo. Ya estamos trabajando en la mejor propuesta para usted.",
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
