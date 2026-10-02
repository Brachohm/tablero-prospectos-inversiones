/** Exportación a CSV (todas las fichas, una fila por ficha). */
import { CAMPOS_FICHA, TIPOS } from "../config/ficha";
import { CAMPOS_CLIENTE, POSVENTA } from "../config/crm";
import { campoActivo, historialDe, motivosDe, MOTIVO_BY, tipoDe, txt } from "./ficha";
import { esCliente } from "./crm";
import { preTexto } from "./pre";
import { fichaPct, fichaXp } from "./xp";
import type { Prospecto } from "./tipos";

export function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function fechaHora(ms: number): string {
  const d = new Date(ms);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16).replace("T", " ");
}

/** CSV con BOM para que Excel respete los acentos. Los campos que no aplican salen en blanco. */
export function exportarCSV(items: readonly Prospecto[]): string {
  const cols = CAMPOS_FICHA;
  const nombres = new Map(items.map((p) => [p.id, txt(p, "nombre")] as const));
  const head = [
    "Tipo",
    "Consentimiento",
    ...cols.map((c) => c.l),
    "Historial de contactos",
    "Referido por",
    ...CAMPOS_CLIENTE.map((c) => c.l),
    ...POSVENTA.map((x) => x.l),
    "Preexistencias declaradas",
    "XP",
    "Avance %",
  ]
    .map(csvCell)
    .join(",");
  const rows = items.map((p) => {
    const celdas = cols.map((c) => {
      if (!campoActivo(c, p)) return "";
      if (c.t === "motivos") return motivosDe(p).map((id) => MOTIVO_BY[id]?.l ?? id).join("; ");
      if (c.t === "check") return p[c.k] === true ? "Sí" : "No";
      if (c.t === "contactos") return String(historialDe(p).length);
      const v = p[c.k];
      return v == null || typeof v === "object" ? "" : String(v);
    });
    return [
      TIPOS[tipoDe(p)].n,
      p.consentimiento?.ts ? fechaHora(p.consentimiento.ts) : "",
      ...celdas,
      historialDe(p)
        .map((c) => `${c.fecha} ${c.canal}${c.nota ? ": " + c.nota : ""}`)
        .join(" | "),
      p.referidoPor ? nombres.get(p.referidoPor) || "(ficha eliminada)" : "",
      ...CAMPOS_CLIENTE.map((c) => (esCliente(p) ? txt(p, c.k) : "")),
      ...POSVENTA.map((x) => (esCliente(p) ? (p[x.k] === true ? "Sí" : "No") : "")),
      preTexto(p),
      fichaXp(p),
      fichaPct(p),
    ]
      .map(csvCell)
      .join(",");
  });
  return "﻿" + [head, ...rows].join("\n");
}
