/**
 * Mensajes de seguimiento según la etapa del prospecto y recordatorios de la
 * próxima reunión, listos para WhatsApp o SMS.
 */
import { ajustarSaludo, deseoHora, saludoMensaje } from "./inicio";
import { MENSAJES_ETAPA, RECORDATORIO_2, RECORDATORIOS_REUNION, type Plantilla } from "../config/mensajes";
import { perfilDe, type Perfil } from "./ajustes";
import { renovacionCliente } from "./crm";
import { diasHasta, fmtFecha, hoyISO } from "./fechas";
import { contactosDe, etapaDe, num, reunionesDe, telefonoParaLlamar, txt } from "./ficha";
import { lugarFrase, lugarTexto } from "./reunion";
import { sinEmojis } from "./texto";
import type { Prospecto } from "./tipos";

export interface Reunion {
  /** AAAA-MM-DD */
  fecha: string;
  /** HH:MM ("" si no se puso la hora). */
  hora: string;
  lugar: string;
  /** Días desde hoy. */
  dias: number;
  /** "hoy", "mañana" o "el jueves 9 de octubre". */
  cuando: string;
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "el jueves 9 de octubre" */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `el ${DIAS[dia]} ${d} de ${MESES[m - 1]}`;
}

/** Próxima reunión de la ficha (también si ya pasó; `dias` lo dice). */
export function reunionDe(p: Prospecto, hoy: string = hoyISO()): Reunion | null {
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(txt(p, "reunion"));
  if (!m) return null;
  const fecha = m[1];
  const dias = diasHasta(fecha, hoy);
  return {
    fecha,
    hora: m[2] ?? "",
    lugar: lugarTexto(p),
    dias,
    cuando: dias === 0 ? "hoy" : dias === 1 ? "mañana" : fechaLarga(fecha),
  };
}

export function variables(
  p: Prospecto,
  hoy: string,
  items: readonly Prospecto[] = [],
  perfil: Perfil = perfilDe(undefined),
): Record<string, string> {
  const r = reunionDe(p, hoy);
  const ref = p.referidoPor ? items.find((x) => x.id === p.referidoPor) : undefined;
  const precio = num(p, "precio");
  const plan = txt(p, "plan");
  const ren = renovacionCliente(p, hoy);
  return {
    nombre: txt(p, "nombre").split(/\s+/)[0] ?? "",
    asesor: perfil.apodo,
    rol: perfil.rol,
    fecha: r ? (r.dias === 0 ? "hoy" : r.dias === 1 ? "mañana" : r.cuando) : "",
    referente: ref ? txt(ref, "nombre").split(/\s+/)[0] || "Un cliente" : "Un cliente",
    porque: (txt(p, "porque") || txt(p, "grieta")).replace(/[.\s]+$/, ""),
    plan: plan && plan !== "Otro" ? ` (plan ${plan})` : "",
    precio: precio ? ` por $${precio} al mes` : "",
    aporte: txt(p, "proxTxt"),
    cuando: r?.cuando ?? "",
    hora: r?.hora ?? "",
    lugar: r ? lugarFrase(p) : "",
    renovacion: ren ? fmtFecha(ren.fecha) : "",
  };
}

export function rellenar(t: string, v: Record<string, string>): string {
  // {saludo} y {deseo} salen de la hora, y un saludo escrito a mano se ajusta a la hora.
  const hora = new Date().getHours();
  const vars: Record<string, string> = { saludo: saludoMensaje(hora), deseo: deseoHora(hora), ...v };
  return ajustarSaludo(t, hora)
    .replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "")
    .replace(/Hola ,/g, "Hola,")
    .replace(/ {2,}/g, " ")
    .trim();
}

function cumple(pl: Plantilla, p: Prospecto, v: Record<string, string>, r: Reunion | null, hoy: string): boolean {
  if (pl.objecion && txt(p, "objecion") !== pl.objecion) return false;
  switch (pl.si) {
    case "referido":
      return !!p.referidoPor;
    case "porque":
      return !!v.porque;
    case "aporte":
      return !!v.aporte;
    case "insistente":
      return contactosDe(p) >= 3;
    case "renovacion": {
      const ren = renovacionCliente(p, hoy);
      return !!ren && diasHasta(ren.fecha, hoy) <= 60;
    }
    case "hoy":
      return r?.dias === 0;
    default:
      return true;
  }
}

export interface Mensaje {
  id: string;
  l: string;
  texto: string;
  reunion: boolean;
}

/**
 * Grupo de mensajes según la etapa. En "Segunda reunión", antes de la reunión
 * se agradece y se prepara la propuesta; después, se da seguimiento a la
 * decisión. La venta exitosa usa los de cliente.
 */
function grupoMensajes(p: Prospecto): string {
  const e = etapaDe(p);
  // Fichas de antes que ya tenían la propuesta presentada también van a seguimiento.
  const propuesta = reunionesDe(p).length >= 2 || ["Presentado", "Objeción", "Seguimiento"].includes(p.etapa);
  if (e === "Segunda reunión" && propuesta) return "Seguimiento";
  if (e === "Venta exitosa") return "Cerrado";
  return e;
}

/** Mensajes sugeridos para la ficha: primero los de la reunión (si viene), luego los de su etapa. */
export function mensajesPara(
  p: Prospecto,
  hoy: string = hoyISO(),
  items: readonly Prospecto[] = [],
  perfil?: Perfil,
): Mensaje[] {
  const v = variables(p, hoy, items, perfil);
  const r = reunionDe(p, hoy);
  const out: Mensaje[] = [];
  if (r && r.dias >= 0) {
    for (const pl of RECORDATORIOS_REUNION)
      if (cumple(pl, p, v, r, hoy)) out.push({ id: pl.id, l: pl.l, texto: rellenar(pl.t, v), reunion: true });
    // El de hoy reemplaza a "Confirmar" el mismo día.
  }
  if (r?.dias === 0) out.splice(0, out.length, ...out.filter((m) => m.id !== "r-confirmar"));
  const lista = MENSAJES_ETAPA[grupoMensajes(p)] ?? [];
  // Si hay una variante específica (referido, con su "porqué"…), se omite la genérica del mismo grupo.
  for (const pl of lista) {
    if (!cumple(pl, p, v, r, hoy)) continue;
    out.push({ id: pl.id, l: pl.l, texto: rellenar(pl.t, v), reunion: false });
  }
  return quitarGenericas(out);
}

/** Si hay "Primer contacto (referido)", sobra "Primer contacto"; igual con los "Gracias…" y la objeción general. */
function quitarGenericas(ms: Mensaje[]): Mensaje[] {
  const ids = new Set(ms.map((m) => m.id));
  const sobra = new Set<string>();
  if (ids.has("n-referido")) sobra.add("n-primero");
  if (ids.has("d-gracias")) sobra.add("d-gracias2");
  if (ms.some((m) => m.id.startsWith("o-") && m.id !== "o-general")) sobra.add("o-general");
  return ms.filter((m) => !sobra.has(m.id));
}

/** Recordatorio principal de la reunión (para la agenda). */
export function recordatorioReunion(p: Prospecto, hoy: string = hoyISO(), perfil?: Perfil): string | null {
  return mensajesPara(p, hoy, [], perfil).find((m) => m.reunion)?.texto ?? null;
}

/** Enlace para enviar un SMS con el texto listo (Android e iPhone aceptan `?body=`). */
export function enlaceSMS(p: Prospecto, texto: string): string | null {
  const tel = telefonoParaLlamar(p);
  return tel ? `sms:${tel}?body=${encodeURIComponent(sinEmojis(texto))}` : null;
}

/** Texto del recordatorio 2 (1 hora antes). */
export function textoRecordatorio2(p: Prospecto, hoy: string = hoyISO(), perfil?: Perfil): string | null {
  const r = reunionDe(p, hoy);
  if (!r || r.dias < 0 || !r.hora) return null;
  return sinEmojis(rellenar(RECORDATORIO_2.t, variables(p, hoy, [], perfil)));
}
