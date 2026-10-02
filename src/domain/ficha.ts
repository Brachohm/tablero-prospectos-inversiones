/** Acceso a los campos de una ficha y reglas de "campo activo". */
import { CODIGO_PAIS } from "../config/crm";
import {
  CAMPOS_FICHA,
  CONTACTOS_MAX,
  DOCS_CIERRE,
  ETAPA_CERRADO,
  ETAPA_INICIAL,
  ETAPA_VENTA,
  ETAPA_PERDIDO,
  ETAPA_PRECIERRE,
  ETAPAS,
  ETAPAS_ANTERIORES,
  MOTIVOS,
} from "../config/ficha";
import type { Campo, Contacto, MotivoId, Prospecto, ReunionHecha, Tipo } from "./tipos";

export const CAMPO: Readonly<Record<string, Campo>> = Object.fromEntries(
  CAMPOS_FICHA.map((c) => [c.k, c] as const),
);

export const MOTIVO_BY: Readonly<Record<string, (typeof MOTIVOS)[number]>> = Object.fromEntries(
  MOTIVOS.map((m) => [m.id, m] as const),
);

export function tipoDe(p: Prospecto): Tipo {
  return p.tipo === "cambio" ? "cambio" : "nuevo";
}

export function esCambio(p: Prospecto): boolean {
  return tipoDe(p) === "cambio";
}

const ORDEN: readonly string[] = ETAPAS;

/** Etapa guardada en la ficha (las de versiones anteriores se traducen). */
export function etapaGuardada(p: Prospecto): string {
  const e = ETAPAS_ANTERIORES[p.etapa] ?? p.etapa;
  return ORDEN.includes(e) ? e : ETAPA_INICIAL;
}

export function reunionesDe(p: Prospecto): ReunionHecha[] {
  return Array.isArray(p.reunionesHechas) ? p.reunionesHechas : [];
}

/** Se marcó "Venta exitosa" (cuenta para el objetivo, es cliente). */
export function vendido(p: Prospecto): boolean {
  const g = etapaGuardada(p);
  return g === ETAPA_CERRADO || g === ETAPA_VENTA;
}

/** El cierre está completo: número de contrato, fecha de emisión y los documentos. */
export function cierreCompleto(p: Prospecto): boolean {
  return (
    !!txt(p, "cli_contrato") && !!txt(p, "cli_afiliacion") && DOCS_CIERRE.every((d) => !!p.docsCierre?.[d.id])
  );
}

/** Ya hubo algún contacto (llamada, mensaje, gestión o seguimiento). */
export function yaContactado(p: Prospecto): boolean {
  return (
    historialDe(p).length > 0 ||
    (Array.isArray(p.gestiones) && p.gestiones.length > 0) ||
    (Array.isArray(p.seguimiento) && p.seguimiento.length > 0)
  );
}

/**
 * Etapa de la ficha. Avanza sola con la gestión: tras el primer contacto,
 * "Cuadrar cita"; con una reunión agendada, "Primera reunión"; con la primera
 * hecha, "Segunda reunión". Pre-cierre, Venta exitosa y Perdido se marcan a
 * mano y mandan; la venta pasa a "Cerrado" cuando el cierre está completo.
 */
export function etapaDe(p: Prospecto): string {
  const g = etapaGuardada(p);
  if (vendido(p)) return cierreCompleto(p) ? ETAPA_CERRADO : ETAPA_VENTA;
  if (g === ETAPA_PERDIDO || g === ETAPA_PRECIERRE) return g;
  const n = reunionesDe(p).length;
  const auto =
    n >= 1 ? "Segunda reunión" : txt(p, "reunion") ? "Primera reunión" : yaContactado(p) ? "Cuadrar cita" : ETAPA_INICIAL;
  return ORDEN.indexOf(auto) > ORDEN.indexOf(g) ? auto : g;
}

export function motivosDe(p: Prospecto): MotivoId[] {
  return Array.isArray(p.motivos) ? p.motivos.filter((m) => m in MOTIVO_BY) : [];
}

export function tieneMotivo(p: Prospecto, m: MotivoId): boolean {
  return motivosDe(p).includes(m);
}

/** Valor de un campo tal como se escribió (para mostrarlo en el campo, con sus espacios). */
export function crudo(p: Prospecto, k: string): string {
  const v = p[k];
  if (v === undefined || v === null || typeof v === "object") return "";
  return String(v);
}

/** Valor de un campo como texto recortado ("" si está vacío). Para decidir y analizar, no para editar. */
export function txt(p: Prospecto, k: string): string {
  const v = p[k];
  if (v === undefined || v === null || typeof v === "object") return "";
  return String(v).trim();
}

/** Valor numérico de un campo, o `null` si no es un número. */
export function num(p: Prospecto, k: string): number | null {
  const s = txt(p, k).replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function vacio(p: Prospecto, k: string): boolean {
  if (k === "motivos") return motivosDe(p).length === 0;
  return txt(p, k) === "";
}

export function historialDe(p: Prospecto): Contacto[] {
  return Array.isArray(p.historial) ? p.historial : [];
}

/** Contactos registrados que cuentan para XP y avance (máximo 5). */
export function contactosDe(p: Prospecto): number {
  return Math.min(CONTACTOS_MAX, historialDe(p).length);
}

/** Un campo aplica si es de este tipo de ficha y, si depende de un motivo, ese motivo está elegido. */
export function campoActivo(c: Campo, p: Prospecto): boolean {
  if (c.solo && c.solo !== tipoDe(p)) return false;
  if (c.motivo && !tieneMotivo(p, c.motivo)) return false;
  if (c.cuando && (c.cuando.v === "*" ? !txt(p, c.cuando.k) : txt(p, c.cuando.k) !== c.cuando.v)) return false;
  return true;
}

export function valorLleno(c: Campo, p: Prospecto): boolean {
  if (c.t === "motivos") return motivosDe(p).length > 0;
  if (c.t === "contactos") return contactosDe(p) > 0;
  if (c.t === "check") return p[c.k] === true;
  return txt(p, c.k) !== "";
}

export function tieneConsentimiento(p: Prospecto): boolean {
  return typeof p.consentimiento?.ts === "number" && p.consentimiento.ts > 0;
}

let contador = 0;
export function nuevoId(ahora: number = Date.now()): string {
  contador = (contador + 1) % 1296;
  return "p" + ahora.toString(36) + Math.random().toString(36).slice(2, 6) + contador.toString(36);
}

/** Crea una ficha vacía. La ficha no guarda datos personales hasta que se registra el consentimiento. */
export function crearProspecto(tipo: Tipo, ahora: number = Date.now()): Prospecto {
  return { id: nuevoId(ahora), creado: ahora, mod: ahora, tipo, etapa: ETAPA_INICIAL, historial: [] };
}

/**
 * Número listo para un enlace `tel:` a partir de lo escrito en "WhatsApp":
 * quita espacios, guiones, puntos y paréntesis; conserva el "+" inicial.
 * Devuelve `null` si no parece un teléfono (menos de 7 dígitos).
 */
export function telefonoParaLlamar(p: Prospecto): string | null {
  return telefonoDe(txt(p, "whatsapp"));
}

/** Igual que `telefonoParaLlamar`, a partir de un número escrito. */
export function telefonoDe(texto: string): string | null {
  const s = texto.trim();
  const mas = s.startsWith("+");
  const digitos = s.replace(/\D/g, "");
  if (digitos.length < 7 || digitos.length > 15) return null;
  return (mas ? "+" : "") + digitos;
}

/**
 * Número en formato internacional (solo dígitos) para abrir el chat de WhatsApp.
 * "099 123 4567" → "593991234567" (código de país de la configuración);
 * "+593 99…" o "00593 99…" se respetan. `null` si no parece un número.
 */
export function numeroWhatsApp(p: Prospecto, codigoPais: string = CODIGO_PAIS): string | null {
  return whatsAppDe(txt(p, "whatsapp"), codigoPais);
}

/** Igual que `numeroWhatsApp`, a partir de un número escrito. */
export function whatsAppDe(texto: string, codigoPais: string = CODIGO_PAIS): string | null {
  const s = texto.trim();
  let d = s.replace(/\D/g, "");
  if (!d) return null;
  if (s.startsWith("+")) {
    /* ya es internacional */
  } else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith(codigoPais) && d.length >= codigoPais.length + 8) {
    /* ya trae el código de país */
  } else if (d.startsWith("0")) d = codigoPais + d.slice(1);
  else if (d.length <= 9) d = codigoPais + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}
