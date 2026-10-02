import type { Prospecto, Tipo } from "./tipos";

/** Ficha de prueba con consentimiento y los campos indicados. */
export function ficha(tipo: Tipo, campos: Record<string, unknown> = {}): Prospecto {
  return {
    id: "p-test",
    creado: 1,
    mod: 1,
    tipo,
    etapa: "Primer contacto",
    consentimiento: { ts: 1 },
    ...campos,
  };
}

export const HOY = "2026-09-30";

/** Historial con `n` contactos. */
export function hist(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: "c" + i,
    fecha: `2026-09-${String(i + 1).padStart(2, "0")}`,
    canal: "WhatsApp" as const,
    nota: "",
    ts: i,
  }));
}
