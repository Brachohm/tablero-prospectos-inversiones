/** CRM: historial de contactos, cartera de clientes y agenda. */
import { AGENDA_DIAS, AVISO_RENOVACION_DIAS, POSVENTA } from "../config/crm";
import { ETAPA_PERDIDO } from "../config/ficha";
import { etapaDe, historialDe, nuevoId, tipoDe, txt, vendido } from "./ficha";
import { diasHasta, hoyISO } from "./fechas";
import { estadoSeguimiento } from "./seguimiento";
import { lugarTexto } from "./reunion";
import type { Canal, Contacto, Prospecto } from "./tipos";

/* ---------- Historial ---------- */

/** Devuelve una copia de la ficha con el contacto agregado (ordenado por fecha). */
export function registrarContacto(
  p: Prospecto,
  c: { fecha: string; canal: Canal; nota?: string },
  ahora: number = Date.now(),
): Prospecto {
  const nuevo: Contacto = { id: nuevoId(ahora), fecha: c.fecha, canal: c.canal, nota: (c.nota ?? "").trim(), ts: ahora };
  const historial = [...historialDe(p), nuevo].sort((a, b) => (a.fecha === b.fecha ? a.ts - b.ts : a.fecha < b.fecha ? -1 : 1));
  return { ...p, historial, mod: ahora };
}

/** Toques repetidos del mismo botón dentro de este tiempo cuentan como un solo contacto. */
export const VENTANA_REPETIDO_MS = 10 * 60 * 1000;

/**
 * Registro automático al tocar Llamar o WhatsApp: agrega un contacto de hoy
 * con ese canal (y una nota opcional, p. ej. "Llamada por WhatsApp"). Si ya
 * hay uno igual (mismo canal y nota) de hace menos de 10 minutos, no agrega
 * otro. Devuelve la ficha y el contacto nuevo (o null si no se agregó).
 */
export function registrarContactoRapido(
  p: Prospecto,
  canal: Canal,
  hoy: string,
  ahora: number = Date.now(),
  nota = "",
): { ficha: Prospecto; nuevo: Contacto | null } {
  const repetido = historialDe(p).some(
    (c) => c.canal === canal && c.nota === nota && c.fecha === hoy && ahora - c.ts < VENTANA_REPETIDO_MS,
  );
  if (repetido) return { ficha: p, nuevo: null };
  const ficha = registrarContacto(p, { fecha: hoy, canal, nota }, ahora);
  const nuevo = historialDe(ficha).find((c) => c.ts === ahora && c.canal === canal && c.nota === nota) ?? null;
  return { ficha, nuevo };
}

export function borrarContacto(p: Prospecto, id: string, ahora: number = Date.now()): Prospecto {
  return { ...p, historial: historialDe(p).filter((c) => c.id !== id), mod: ahora };
}

export function ultimoContacto(p: Prospecto): Contacto | null {
  const h = historialDe(p);
  return h.length ? h[h.length - 1] : null;
}

/** Días desde el último contacto, o `null` si nunca se contactó. */
export function diasSinContacto(p: Prospecto, hoy: string = hoyISO()): number | null {
  const u = ultimoContacto(p);
  return u ? -diasHasta(u.fecha, hoy) : null;
}

/* ---------- Cartera ---------- */

export function esCliente(p: Prospecto): boolean {
  return vendido(p);
}

export function clientes(items: readonly Prospecto[]): Prospecto[] {
  return items.filter(esCliente);
}

export function prospectosAbiertos(items: readonly Prospecto[]): Prospecto[] {
  return items.filter((p) => !esCliente(p) && etapaDe(p) !== ETAPA_PERDIDO);
}

function sumarAnios(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  // 29 de febrero → 28 de febrero en años no bisiestos
  const fin = new Date(Date.UTC(a + n, m - 1, 1));
  const ultimo = new Date(Date.UTC(a + n, m, 0)).getUTCDate();
  fin.setUTCDate(Math.min(d, ultimo));
  return fin.toISOString().slice(0, 10);
}

export interface Renovacion {
  fecha: string;
  /** true si se calculó desde el inicio de vigencia (validar con la aseguradora). */
  estimada: boolean;
}

/**
 * Próxima renovación del cliente: la fecha escrita, o el siguiente aniversario
 * del inicio de vigencia (hoy o después).
 */
export function renovacionCliente(p: Prospecto, hoy: string = hoyISO()): Renovacion | null {
  const escrita = txt(p, "cli_renovacion");
  if (escrita) return { fecha: escrita, estimada: false };
  const inicio = txt(p, "cli_afiliacion");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return null;
  let n = 1;
  let f = sumarAnios(inicio, n);
  while (f < hoy) f = sumarAnios(inicio, ++n);
  return { fecha: f, estimada: true };
}

export function posventaHecha(p: Prospecto): { hechos: number; total: number } {
  return { hechos: POSVENTA.filter((x) => p[x.k] === true).length, total: POSVENTA.length };
}

/** Fichas que este cliente refirió. */
export function referidosDe(items: readonly Prospecto[], clienteId: string): Prospecto[] {
  return items.filter((p) => p.referidoPor === clienteId);
}

/* ---------- Agenda ---------- */

export type MotivoAgenda =
  /** Próximo contacto de un prospecto abierto. */
  | "contacto"
  /** Próximo contacto con un cliente (posventa). */
  | "posventa"
  /** Renovación de la póliza de un cliente. */
  | "renovacion"
  /** Renovación de la póliza actual de una persona asegurada que quiere cambiarse. */
  | "renovacionActual"
  /** Próxima reunión agendada (hoy o más adelante). */
  | "reunion"
  /** Toca el siguiente mensaje del seguimiento 1-2-3. */
  | "seguimiento";

export interface ItemAgenda {
  id: string;
  motivo: MotivoAgenda;
  fecha: string;
  /** Días desde hoy (negativo = vencido). */
  dias: number;
  /** El renglón "prox" + lo que le aportas, o el detalle de la renovación. */
  detalle: string;
  estimada?: boolean;
}

export interface Agenda {
  vencidos: ItemAgenda[];
  hoy: ItemAgenda[];
  semana: ItemAgenda[];
  /** Renovaciones más allá de la semana, dentro del aviso de renovación. */
  proximas: ItemAgenda[];
}

export function agenda(items: readonly Prospecto[], hoy: string = hoyISO()): Agenda {
  const out: ItemAgenda[] = [];
  for (const p of items) {
    const et = etapaDe(p);
    if (et === ETAPA_PERDIDO || p.soltado) continue;
    const cliente = esCliente(p);
    const prox = txt(p, "prox");
    if (prox) {
      out.push({
        id: p.id,
        motivo: cliente ? "posventa" : "contacto",
        fecha: prox,
        dias: diasHasta(prox, hoy),
        detalle: txt(p, "proxTxt"),
      });
    }
    const reu = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(txt(p, "reunion"));
    if (reu && diasHasta(reu[1], hoy) >= 0) {
      const lugar = lugarTexto(p);
      out.push({
        id: p.id,
        motivo: "reunion",
        fecha: reu[1],
        dias: diasHasta(reu[1], hoy),
        detalle: [reu[2], lugar].filter(Boolean).join(" · "),
      });
    }
    if (!cliente) {
      const seg = estadoSeguimiento(p, hoy);
      if (seg.enviados.length > 0 && seg.siguiente !== null && seg.desde)
        out.push({
          id: p.id,
          motivo: "seguimiento",
          fecha: seg.desde,
          dias: diasHasta(seg.desde, hoy),
          detalle: `Mensaje ${seg.siguiente + 1} de 3`,
        });
    }
    if (cliente) {
      const r = renovacionCliente(p, hoy);
      if (r) {
        const dias = diasHasta(r.fecha, hoy);
        if (dias <= AVISO_RENOVACION_DIAS)
          out.push({
            id: p.id,
            motivo: "renovacion",
            fecha: r.fecha,
            dias,
            detalle: "Renovación de su plan",
            estimada: r.estimada,
          });
      }
    } else if (tipoDe(p) === "cambio" && txt(p, "renovacion")) {
      const f = txt(p, "renovacion");
      const dias = diasHasta(f, hoy);
      if (dias >= 0 && dias <= AVISO_RENOVACION_DIAS)
        out.push({ id: p.id, motivo: "renovacionActual", fecha: f, dias, detalle: "Renueva su póliza actual" });
    }
  }
  out.sort((a, b) => (a.fecha === b.fecha ? a.motivo.localeCompare(b.motivo) : a.fecha < b.fecha ? -1 : 1));
  return {
    vencidos: out.filter((x) => x.dias < 0),
    hoy: out.filter((x) => x.dias === 0),
    semana: out.filter((x) => x.dias > 0 && x.dias <= AGENDA_DIAS),
    proximas: out.filter((x) => x.dias > AGENDA_DIAS && (x.motivo === "renovacion" || x.motivo === "renovacionActual")),
  };
}
