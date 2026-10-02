import type { FilaComision } from "../config/comisiones";
import { comisionDe, normalizarComisiones } from "./comisiones";
import { ficha } from "./test-utils";

const T: FilaComision[] = [
  { plan: "Contribución regular", desde: 5, pct: 20 },
  { plan: "Contribución regular", desde: 10, pct: 30 },
  { plan: "Contribución única", desde: 1, pct: 2 },
  { plan: "Contribución única", desde: 5, pct: 3 },
];

describe("comisiones", () => {
  it("regular: aporte anual por la tasa del plazo", () => {
    expect(comisionDe(ficha("nuevo", { tipoPlan: "Contribución regular", plazo: "12", precio: "100" }), T)).toEqual({
      base: 1200,
      pct: 30,
      monto: 360,
    });
  });
  it("única: sobre el aporte total", () => {
    expect(comisionDe(ficha("nuevo", { tipoPlan: "Contribución única", plazo: "5", precio: "10000" }), T)?.monto).toBe(300);
  });
  it("sin tabla, sin datos o plazo bajo el mínimo: null", () => {
    const p = ficha("nuevo", { tipoPlan: "Contribución regular", plazo: "12", precio: "100" });
    expect(comisionDe(p)).toBeNull();
    expect(comisionDe(ficha("nuevo", { precio: "100" }), T)).toBeNull();
    expect(comisionDe(ficha("nuevo", { tipoPlan: "Contribución regular", plazo: "3", precio: "100" }), T)).toBeNull();
  });
  it("normaliza: quita inválidas y repetidas, ordena", () => {
    const n = normalizarComisiones([
      { plan: "Contribución regular", desde: 10, pct: 30 },
      { plan: "Contribución regular", desde: 10, pct: 35 },
      { plan: "Contribución regular", desde: 5, pct: 0 },
      { plan: "Otro" as never, desde: 1, pct: 5 },
    ]);
    expect(n).toEqual([{ plan: "Contribución regular", desde: 10, pct: 30 }]);
  });
});
