/**
 * Centro de Gestión: contactos nuevos y prospectos abiertos, uno por uno.
 * Cada gestión exige un resumen; con él la app recomienda cómo seguir (o dar
 * fin a la gestión). Todo se calcula en el dispositivo, sin IA.
 */
import { CONTACTOS_MAX, ETAPA_INICIAL, ETAPA_PERDIDO } from "../config/ficha";
import { normalizar } from "./biblioteca";
import { activo, origenContacto, type ContactoNuevo } from "./contactos";
import { diasHasta } from "./fechas";
import { etapaDe, nuevoId, txt, vendido } from "./ficha";
import { reunionDe } from "./mensajes";
import { estadoSeguimiento } from "./seguimiento";
import type { Gestion, Prospecto, ResultadoGestion } from "./tipos";

export const RESULTADOS: readonly { id: ResultadoGestion; l: string; ic: string }[] = [
  { id: "no_contesto", l: "No contestó", ic: "📵" },
  { id: "volver", l: "Volver a contactar", ic: "🔁" },
  { id: "info", l: "Pidió información", ic: "📄" },
  { id: "interesado", l: "Interesado", ic: "🙂" },
  { id: "reunion", l: "Agendó reunión", ic: "📅" },
  { id: "no_interesado", l: "No interesado", ic: "🚫" },
];

export const RESULTADO_L: Readonly<Record<string, string>> = Object.fromEntries(RESULTADOS.map((r) => [r.id, r.l]));

/** Mínimo de caracteres del resumen para poder continuar. */
export const MIN_RESUMEN = 10;

/** Vista común de un contacto nuevo o de una ficha, para gestionarlos igual. */
export interface Gestionable {
  tipo: "contacto" | "ficha";
  id: string;
  nombre: string;
  edad: string;
  ciudad: string;
  telefono: string;
  correo: string;
  origen: string;
  referidor: string;
  relacion: string;
  /** Etapa (solo fichas). */
  etapa: string | null;
  gestiones: Gestion[];
  soltado: boolean;
  /** Tiene tu número registrado (las fichas, sí). */
  registrado?: boolean;
  /** La misma persona con forma de ficha, para reuniones, seguimiento y mensajes. */
  ficha: Prospecto;
}

export function desdeContacto(c: ContactoNuevo): Gestionable {
  return {
    tipo: "contacto",
    id: c.id,
    nombre: c.nombre,
    edad: c.edad,
    ciudad: c.ciudad ?? "",
    telefono: c.celular,
    correo: c.correo,
    origen: origenContacto(c),
    referidor: c.referidor ?? "",
    relacion: c.relacion ?? "",
    etapa: null,
    gestiones: c.gestiones ?? [],
    soltado: !!c.soltado,
    registrado: c.registrado !== false,
    ficha: {
      id: c.id,
      creado: c.creado,
      mod: c.mod,
      tipo: "nuevo",
      etapa: c.reunion ? "Primera reunión" : c.gestiones?.length || c.seguimiento?.length ? "Cuadrar cita" : ETAPA_INICIAL,
      nombre: c.nombre,
      edad: c.edad,
      whatsapp: c.celular,
      correo: c.correo,
      reunion: c.reunion ?? "",
      reunionLugar: c.reunionLugar ?? "",
      reunionModo: c.reunionModo ?? "",
      reunionLink: c.reunionLink ?? "",
      ...(c.recordatorios ? { recordatorios: c.recordatorios } : {}),
      seguimiento: c.seguimiento ?? [],
      ...(c.segRespondio ? { segRespondio: c.segRespondio } : {}),
      ...(c.segVueltas ? { segVueltas: c.segVueltas } : {}),
    },
  };
}

export function desdeFicha(p: Prospecto): Gestionable {
  return {
    tipo: "ficha",
    id: p.id,
    nombre: txt(p, "nombre"),
    edad: txt(p, "edad"),
    ciudad: txt(p, "ciudad"),
    telefono: txt(p, "whatsapp"),
    correo: txt(p, "correo"),
    origen: txt(p, "origen") || "Otro",
    referidor: txt(p, "referidor"),
    relacion: txt(p, "relacion"),
    etapa: etapaDe(p),
    gestiones: Array.isArray(p.gestiones) ? p.gestiones : [],
    soltado: !!p.soltado,
    ficha: p,
  };
}

export function ultimaGestion(g: Gestionable): Gestion | null {
  return g.gestiones[g.gestiones.length - 1] ?? null;
}

/** Todos los que se pueden gestionar: contactos activos y prospectos abiertos, sin soltar. */
export function gestionables(items: readonly Prospecto[], contactos: readonly ContactoNuevo[]): Gestionable[] {
  return [
    ...contactos.filter(activo).map(desdeContacto),
    ...items
      .filter((p) => !vendido(p) && etapaDe(p) !== ETAPA_PERDIDO && !p.soltado)
      .map(desdeFicha),
  ];
}

export interface Filtro {
  origen: string;
  tipo: "todos" | "contacto" | "ficha";
}

export function filtrarGestion(gs: readonly Gestionable[], f: Filtro): Gestionable[] {
  return gs.filter((g) => (f.origen === "Todos" || g.origen === f.origen) && (f.tipo === "todos" || g.tipo === f.tipo));
}

/** Prioridad (menor = antes): reunión cercana, seguimiento que toca, próximo contacto vencido, nunca gestionado, el resto. */
export function prioridad(g: Gestionable, hoy: string): number {
  const r = reunionDe(g.ficha, hoy);
  if (r && r.dias >= 0 && r.dias <= 1) return 0;
  const s = estadoSeguimiento(g.ficha, hoy);
  if (s.enviados.length > 0 && s.hoy) return 1;
  const prox = txt(g.ficha, "prox");
  if (prox && diasHasta(prox, hoy) <= 0) return 1;
  if (!g.gestiones.length) return 2;
  return 3;
}

export interface Cola {
  /** Por gestionar hoy, en orden. */
  pendientes: Gestionable[];
  /** Ya gestionados hoy. */
  hechos: Gestionable[];
}

export function cola(gs: readonly Gestionable[], hoy: string): Cola {
  const hechos = gs.filter((g) => ultimaGestion(g)?.fecha === hoy);
  const pendientes = gs
    .filter((g) => ultimaGestion(g)?.fecha !== hoy)
    .map((g) => ({ g, p: prioridad(g, hoy), u: ultimaGestion(g)?.ts ?? 0 }))
    .sort((a, b) => a.p - b.p || a.u - b.u || a.g.nombre.localeCompare(b.g.nombre))
    .map((x) => x.g);
  return { pendientes, hechos };
}

export function crearGestion(
  resultado: ResultadoGestion,
  resumen: string,
  acciones: string[],
  hoy: string,
  ahora = Date.now(),
): Gestion {
  return { id: nuevoId(ahora), fecha: hoy, ts: ahora, resultado, resumen: resumen.trim(), acciones };
}

export function errorGestion(resumen: string, resultado: ResultadoGestion | null): string {
  if (!resultado) return "Elige cómo terminó la gestión";
  if (resumen.trim().length < MIN_RESUMEN) return "Escribe un resumen de la gestión para continuar";
  return "";
}

/* ---------- Recomendación ---------- */

export type NivelRecomendacion = "seguir" | "cerrar" | "soltar" | "inicio";

export interface Recomendacion {
  nivel: NivelRecomendacion;
  /** Posibilidad de cerrar el negocio. */
  posibilidad: "alta" | "media" | "baja" | "nula" | "sin datos";
  titulo: string;
  pasos: string[];
}

function rachaNoContesto(gs: Gestion[]): number {
  let n = 0;
  for (let i = gs.length - 1; i >= 0 && gs[i].resultado === "no_contesto"; i--) n++;
  return n;
}

const tiene = (texto: string, ...palabras: string[]) => {
  const t = normalizar(texto);
  return palabras.some((p) => t.includes(p));
};

/** Cómo seguir según la última gestión, su resumen y la historia del contacto. */
export function recomendacion(g: Gestionable, hoy: string): Recomendacion {
  const ult = ultimaGestion(g);
  if (!ult)
    return {
      nivel: "inicio",
      posibilidad: "sin datos",
      titulo: "Primer contacto",
      pasos: [
        g.referidor ? `Preséntate de parte de ${g.referidor.split(/\s+/)[0]} (cadena de referido).` : "Llámale o envíale tu saludo para presentarte.",
        "Escucha antes de ofrecer: pregunta qué metas tiene para su dinero y su familia.",
      ],
    };

  const r = ult.resultado;
  const res = ult.resumen;
  const noInteresado = g.gestiones.filter((x) => x.resultado === "no_interesado").length;
  const racha = rachaNoContesto(g.gestiones);
  const seg = estadoSeguimiento(g.ficha, hoy);
  const sigSeg = seg.siguiente !== null ? `Envía el mensaje ${seg.siguiente + 1} de seguimiento` : null;
  const etapa = g.etapa ?? "";
  const avanzada = ["Segunda reunión", "Pre-cierre"].includes(etapa);

  const extras: string[] = [];
  if (tiene(res, "caro", "precio", "presupuesto", "costoso", "plata", "dinero"))
    extras.push("Prepara una opción que se ajuste a su presupuesto (arma la oferta con bonos reales).");
  if (tiene(res, "ya tiene", "tiene ahorros", "ya invierte", "otro banco", "plazo fijo"))
    extras.push("Ofrece comparar su inversión actual sin compromiso.");
  if (tiene(res, "despues", "mas adelante", "proximo mes", "mes que viene", "no es el momento", "ahora no"))
    extras.push("Agenda el próximo contacto en 2 a 4 semanas, con algo de valor para compartir.");
  if (tiene(res, "esposa", "esposo", "pareja", "familia", "consultar"))
    extras.push("Propón una reunión con quien decide junto a la persona.");

  const rechazoFirme = tiene(res, "no me interesa", "no le interesa", "no quiere", "no volver", "no escribir", "no llamar");

  if (r === "no_interesado" || rechazoFirme) {
    if (noInteresado >= 2 || rechazoFirme)
      return {
        nivel: "soltar",
        posibilidad: "nula",
        titulo: "Recomiendo dar fin a la gestión",
        pasos: ["Agradece su tiempo y suelta el contacto: queda en tu base de datos por si vuelve.", ...extras],
      };
    return {
      nivel: "soltar",
      posibilidad: "baja",
      titulo: "No está interesado por ahora",
      pasos: [
        "Respeta su decisión: suelta el contacto o deja un último mensaje sin presionar en un mes.",
        ...extras,
      ],
    };
  }

  if (r === "no_contesto") {
    if (racha >= CONTACTOS_MAX)
      return {
        nivel: "soltar",
        posibilidad: "baja",
        titulo: `Sin respuesta en ${racha} intentos: recomiendo dar fin a la gestión`,
        pasos: ["Suelta el contacto; seguirá en tu base de datos."],
      };
    return {
      nivel: "seguir",
      posibilidad: racha >= 3 ? "baja" : "media",
      titulo: racha >= 3 ? "Cambia de canal y de horario" : "Intenta de nuevo",
      pasos: [
        racha >= 3 ? "Prueba un audio o un mensaje corto en otro horario (temprano o al final de la tarde)." : "Vuelve a intentar mañana a otra hora.",
        ...(sigSeg && seg.hoy ? [sigSeg + " hoy."] : sigSeg && seg.desde ? [`${sigSeg} desde el ${seg.desde}.`] : []),
        `Llevas ${racha} ${racha === 1 ? "intento" : "intentos"} sin respuesta (máximo ${CONTACTOS_MAX}).`,
      ],
    };
  }

  if (r === "reunion") {
    const reu = reunionDe(g.ficha, hoy);
    return {
      nivel: "cerrar",
      posibilidad: "alta",
      titulo: "Tiene reunión: prepárala",
      pasos: [
        reu && reu.dias >= 0 ? "Envía la invitación ahora y el recordatorio el día anterior." : "Pon la fecha de la reunión y envía la invitación.",
        g.tipo === "contacto" ? "Pásalo a prospecto para preparar el descubrimiento." : "Repasa su ficha y lleva las preguntas de descubrimiento.",
        ...extras,
      ],
    };
  }

  if (r === "interesado")
    return {
      nivel: "cerrar",
      posibilidad: avanzada ? "alta" : "media",
      titulo: avanzada ? "Buen momento para cerrar" : "Hay interés: agenda la reunión",
      pasos: avanzada
        ? ["Arma la oferta y pide el cierre con alternativa (individual o familiar).", ...extras]
        : [
            g.tipo === "contacto" ? "Pásalo a prospecto." : "Completa el descubrimiento.",
            "Agenda una reunión esta semana y envía la invitación.",
            ...extras,
          ],
    };

  if (r === "info")
    return {
      nivel: "seguir",
      posibilidad: "media",
      titulo: "Envía la información y da seguimiento",
      pasos: [
        "Envía hoy la información (usa tu Biblioteca y argumentos).",
        "Llama en 2 días para resolver dudas y proponer una reunión.",
        ...extras,
      ],
    };

  // volver
  return {
    nivel: "seguir",
    posibilidad: "media",
    titulo: "Vuelve a contactar",
    pasos: [
      txt(g.ficha, "prox") ? "Contacta en la fecha acordada (próximo contacto)." : "Acuerda una fecha y anótala como próximo contacto.",
      ...extras,
    ],
  };
}
