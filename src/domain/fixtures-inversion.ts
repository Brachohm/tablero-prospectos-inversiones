/** Documento de ejemplo de un plan unit linked, solo para pruebas. */
import type { Documento } from "./biblioteca";

export const docPlan = (id: string, plan: string, paginas: string[], extra: Partial<Documento> = {}): Documento => ({
  id,
  nombre: `Condiciones ${plan}`,
  tipo: "anexo",
  plan,
  paginas,
  archivo: true,
  bytes: 1,
  creado: 1,
  mod: 1,
  ...extra,
});

export const condicionesFuturo = docPlan("d1", "Plan Futuro", [
  [
    "CONDICIONES DEL PLAN FUTURO",
    "CARACTERÍSTICAS",
    "- Plazos de 10 a 30 años",
    "- Fondos disponibles: conservador, moderado y agresivo",
    "- Cobertura por fallecimiento: $20.000 o el saldo, el mayor",
    "Aporte mínimo mensual: $50",
    "Aporte único mínimo: $5.000",
  ].join("\n"),
  [
    "COSTOS",
    "Cargo de administración: 1,5% anual",
    "Cargo inicial: 5% del aporte",
    "",
    "",
    "RESCATES",
    "Penalidad por rescate anticipado: 10% el primer año",
    "Sin penalidad desde el año 6",
    "",
    "",
    "BENEFICIOS ADICIONALES",
    "Estado de cuenta en línea cada mes",
    "Bono de permanencia: 2% al año 10",
    "Aportes extraordinarios desde $100",
    "Artículo 5: el contratante deberá firmar la solicitud",
  ].join("\n"),
]);

export const condicionesAhorro = docPlan("d2", "Plan Ahorro", [
  ["CARACTERÍSTICAS", "Plazos de 5 a 15 años", "Fondo conservador de renta fija", "Aporte mínimo mensual: $80"].join("\n"),
  ["RESCATES", "Penalidad por rescate anticipado: 20% el primer año", "No permite retiros parciales"].join("\n"),
]);
