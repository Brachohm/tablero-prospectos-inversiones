import { comisionDe } from "./comisiones";
import { ficha } from "./test-utils";

describe("comisiones", () => {
  it("regular: aporte anual por la tasa del plazo", () => {
    expect(comisionDe(ficha("nuevo", { tipoPlan: "Contribución regular", plazo: "12", precio: "100" }))).toEqual({
      base: 1200,
      pct: 30,
      monto: 360,
    });
  });
  it("única: sobre el aporte total", () => {
    expect(comisionDe(ficha("nuevo", { tipoPlan: "Contribución única", plazo: "5", precio: "10000" }))?.monto).toBe(300);
  });
  it("sin datos o plazo bajo el mínimo: null", () => {
    expect(comisionDe(ficha("nuevo", { precio: "100" }))).toBeNull();
    expect(comisionDe(ficha("nuevo", { tipoPlan: "Contribución regular", plazo: "3", precio: "100" }))).toBeNull();
  });
});
