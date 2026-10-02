/**
 * CRM: canales de contacto, cartera de clientes y agenda.
 * Todo es PROPUESTA del asesor: ajustar libremente. Las fechas de renovación
 * dependen de la póliza real (validar con la aseguradora).
 */
import type { Campo, Canal } from "../domain/tipos";

export const CANALES: readonly Canal[] = ["WhatsApp", "SMS", "Llamada", "Reunión", "Correo", "Otro"];

/** Campos del cliente (fichas en etapa "Cerrado"). No suman XP ni avance. */
export const CAMPOS_CLIENTE: readonly Campo[] = [
  { k: "cli_plan", l: "Plan contratado", t: "text", xp: 0, ancho: true },
  { k: "cli_contrato", l: "Número de contrato", t: "text", xp: 0, ph: "Letras y números" },
  { k: "cli_afiliacion", l: "Fecha de emisión", t: "date", xp: 0 },
  {
    k: "cli_renovacion",
    l: "Fecha de renovación",
    t: "date",
    xp: 0,
    ph: "Si la dejas vacía, se estima un año después de la emisión",
  },
];

/** Checklist de acompañamiento después de la venta (booleanos `pv_*`). */
export const POSVENTA: readonly { k: string; l: string }[] = [
  { k: "pv_bienvenida", l: "Bienvenida: le expliqué cómo usar su plan y a quién llamar" },
  { k: "pv_reembolso", l: "Le expliqué el proceso de reembolso y qué documentos guardar" },
  { k: "pv_primeruso", l: "Lo acompañé en su primer uso o primera autorización" },
  { k: "pv_revision", l: "Revisión antes de la renovación: ¿el plan sigue siendo el correcto?" },
  { k: "pv_referidos", l: "Le pedí referidos" },
];

/** Días hacia adelante que muestra la agenda en "Esta semana". */
export const AGENDA_DIAS = 7;

/** Días antes de una renovación para que aparezca en la agenda. */
export const AVISO_RENOVACION_DIAS = 45;

/** Código de país para abrir WhatsApp con números escritos sin él (p. ej. "099…" → 593 99…). */
export const CODIGO_PAIS = "593";
