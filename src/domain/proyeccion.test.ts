import { normalizarEscenarios, proyeccionDe, proyectar, valorFuturo } from "./proyeccion";
import { ficha } from "./test-utils";

describe("proyección", () => {
  it("sin rendimiento, junta exactamente lo aportado", () => {
    expect(valorFuturo(100, 0, 10, 0)).toBe(12000);
    expect(valorFuturo(0, 5000, 10, 0)).toBe(5000);
  });
  it("con rendimiento crece más que lo aportado y en orden por escenario", () => {
    const p = proyectar(100, 0, 20)!;
    expect(p.final.anio).toBe(20);
    expect(p.final.aportado).toBe(24000);
    expect(p.final.conservador).toBeGreaterThan(24000);
    expect(p.final.moderado).toBeGreaterThan(p.final.conservador);
    expect(p.final.optimista).toBeGreaterThan(p.final.moderado);
    expect(p.puntos.map((x) => x.anio)).toEqual([1, 5, 10, 15, 20]);
  });
  it("aporte único al 6 % por 10 años ≈ ×1,79", () => {
    expect(valorFuturo(0, 10000, 10, 6)).toBeCloseTo(17908.48, 0);
  });
  it("dice si cada escenario alcanza la meta", () => {
    const p = proyectar(200, 0, 15, { conservador: 0, moderado: 4, optimista: 8 }, 45000)!;
    expect(p.alcanza).toEqual({ conservador: false, moderado: true, optimista: true });
  });
  it("sin plazo o sin aporte no proyecta", () => {
    expect(proyectar(0, 0, 10)).toBeNull();
    expect(proyectar(100, 0, 0)).toBeNull();
    expect(proyeccionDe(ficha("nuevo", { precio: "100" }))).toBeNull();
  });
  it("lee la ficha: regular con su aporte mensual, única con su aporte total", () => {
    expect(proyeccionDe(ficha("nuevo", { tipoPlan: "Contribución regular", plazo: "10", precio: "100" }))?.mensual).toBe(100);
    const u = proyeccionDe(ficha("nuevo", { tipoPlan: "Contribución única", plazo: "5", precio: "8000" }))!;
    expect([u.mensual, u.unico]).toEqual([0, 8000]);
  });
  it("normaliza escenarios: valores raros vuelven al inicial y se ordenan", () => {
    expect(normalizarEscenarios({ conservador: 7, moderado: 3, optimista: 99 })).toEqual({ conservador: 3, moderado: 6, optimista: 7 });
  });
});
