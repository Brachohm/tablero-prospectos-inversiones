import { conEtapa, fechaCierre, normalizarObjetivos, objetivoMes } from "./objetivos";
import { ficha } from "./test-utils";

const cerrada = (id: string, precio: string, cerradoEn: string) =>
  ficha("nuevo", { id, etapa: "Cerrado", precio, cerradoEn });

describe("objetivo mensual", () => {
  it("al pasar a Cerrado se registra el día; otras etapas no", () => {
    const p = conEtapa(ficha("nuevo"), "Cerrado", "2026-10-03");
    expect(p).toMatchObject({ etapa: "Cerrado", cerradoEn: "2026-10-03" });
    expect(conEtapa(p, "Cerrado", "2026-10-09").cerradoEn).toBe("2026-10-03");
    expect(conEtapa(ficha("nuevo"), "Presentado", "2026-10-03").cerradoEn).toBeUndefined();
  });

  it("fecha de cierre: registrada, inicio de vigencia o última edición; nada si no está cerrada", () => {
    expect(fechaCierre(cerrada("a", "1", "2026-10-02"))).toBe("2026-10-02");
    expect(fechaCierre(ficha("nuevo", { etapa: "Cerrado", cli_afiliacion: "2026-09-15" }))).toBe("2026-09-15");
    expect(fechaCierre(ficha("nuevo", { etapa: "Cerrado", mod: Date.UTC(2026, 9, 5, 15) }))).toBe("2026-10-05");
    expect(fechaCierre(ficha("nuevo", { cerradoEn: "2026-10-02" }))).toBeNull();
  });

  it("suma solo la prima de los cierres del mes y estima clientes por escalón", () => {
    const items = [
      cerrada("a", "100", "2026-10-02"),
      cerrada("b", "200", "2026-10-20"),
      cerrada("c", "300", "2026-09-30"), // mes pasado
      ficha("nuevo", { id: "d", etapa: "Seguimiento", precio: "80" }),
    ];
    const o = objetivoMes(items, "2026-10-21");
    expect(o.prima).toBe(300);
    expect(o.cierres).toBe(2);
    expect(o.pct).toBe(40);
    expect(o.promedio).toBe(200); // promedio de todos los cierres
    expect(o.base).toBe("cierres");
    expect(o.escalones).toEqual([
      { prima: 750, detalle: "90% de comisión", logrado: false, falta: 450, clientes: 3 },
      { prima: 1100, detalle: "120% de comisión", logrado: false, falta: 800, clientes: 4 },
    ]);
    expect(o.desbloqueado).toBe("");
    expect(o.enJuego).toBe(80);
    expect(o.diasRestantes).toBe(10);
  });

  it("desbloquea 90% al llegar a 750 y 120% a 1100", () => {
    const o750 = objetivoMes([cerrada("a", "750", "2026-10-01")], "2026-10-01");
    expect(o750.desbloqueado).toBe("90% de comisión");
    expect(o750.escalones[0]).toMatchObject({ logrado: true, falta: 0, clientes: 0 });
    const o1100 = objetivoMes([cerrada("a", "600", "2026-10-01"), cerrada("b", "500", "2026-10-02")], "2026-10-05");
    expect(o1100.desbloqueado).toBe("120% de comisión");
  });

  it("sin cierres estima con las propuestas; sin precios no estima", () => {
    const o = objetivoMes([ficha("nuevo", { precio: "150" })], "2026-10-01");
    expect(o).toMatchObject({ base: "propuestas", promedio: 150 });
    expect(o.escalones[0].clientes).toBe(5);
    const vacio = objetivoMes([], "2026-02-10");
    expect(vacio).toMatchObject({ prima: 0, promedio: null, base: null, diasRestantes: 18 });
    expect(vacio.escalones[0].clientes).toBeNull();
  });
});

describe("objetivos configurables", () => {
  it("de 1 a 4, ordenados, sin repetir; beneficio solo si tiene detalle", () => {
    expect(
      normalizarObjetivos([
        { monto: 1100, beneficio: true, detalle: " 120% " },
        { monto: 500, beneficio: true, detalle: "" },
        { monto: 1100, beneficio: false, detalle: "" },
        { monto: 0, beneficio: false, detalle: "" },
        { monto: 2000, beneficio: false, detalle: "x" },
        { monto: 3000, beneficio: true, detalle: "Viaje" },
        { monto: 4000, beneficio: true, detalle: "Bono" },
      ]),
    ).toEqual([
      { monto: 500, beneficio: false, detalle: "" },
      { monto: 1100, beneficio: true, detalle: "120%" },
      { monto: 2000, beneficio: false, detalle: "x" },
      { monto: 3000, beneficio: true, detalle: "Viaje" },
    ]);
    expect(normalizarObjetivos([])).toHaveLength(2); // los iniciales
  });

  it("la meta es el primer objetivo y se desbloquea el beneficio más alto logrado", () => {
    const os = [
      { monto: 600, beneficio: false, detalle: "" },
      { monto: 900, beneficio: true, detalle: "Bono de $100" },
    ];
    const o = objetivoMes([ficha("nuevo", { etapa: "Cerrado", precio: "950", cerradoEn: "2026-10-02" })], "2026-10-05", os);
    expect(o.meta).toBe(600);
    expect(o.escalones.map((e) => [e.prima, e.detalle, e.logrado])).toEqual([
      [600, "", true],
      [900, "Bono de $100", true],
    ]);
    expect(o.desbloqueado).toBe("Bono de $100");
  });
});
