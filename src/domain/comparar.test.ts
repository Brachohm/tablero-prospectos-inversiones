import { crearPlan } from "./biblioteca";
import {
  analizarPlan,
  avisos,
  beneficios,
  comparar,
  interpretar,
  recomendarPlanes,
  tablaDesdeFilas,
  tablaDesdeTexto,
  textoComparacion,
} from "./comparar";
import { ficha } from "./test-utils";

const plan = (nombre: string, tabla: Record<string, string>, extra = {}) => ({ ...crearPlan(1), nombre, tabla, ...extra });

describe("comparar planes de inversión", () => {
  it("interpreta montos, porcentajes, no incluye, ilimitado y sí", () => {
    expect(interpretar("$5.000")).toEqual({ tipo: "num", n: 5000, pct: false });
    expect(interpretar("80 %")).toEqual({ tipo: "num", n: 80, pct: true });
    expect(interpretar("No incluye")).toEqual({ tipo: "no" });
    expect(interpretar("Sí")).toEqual({ tipo: "si" });
    expect(interpretar("")).toEqual({ tipo: "vacio" });
  });

  it("menor es mejor en aporte mínimo, cargos y penalidades; mayor en cobertura de vida y bono", () => {
    expect(comparar("admin", "2,5%", "1,5%")).toBe("mejor");
    expect(comparar("rescate", "10%", "20%")).toBe("peor");
    expect(comparar("vida", "No incluye", "$20.000")).toBe("mejor");
    expect(comparar("bono", "1%", "2%")).toBe("mejor");
    expect(comparar("fondos", "Conservador", "conservador")).toBe("igual");
  });

  const actual = { prima: "$100", admin: "2,5%", rescate: "15%", vida: "No incluye" };
  const a = plan("Plan A", { prima: "$50", admin: "1,5%", rescate: "10%", vida: "$20.000" }, {
    beneficios: "Estado de cuenta en línea",
    carencias: "Cargo inicial: 5% del aporte",
  });
  const b = plan("Plan B", { prima: "$80", admin: "3%", rescate: "10%" });
  const caro = plan("Plan Caro", { prima: "$300", admin: "1%", rescate: "5%", vida: "$50.000" });

  it("recomienda el que más mejora sin pedir más de lo que puede aportar", () => {
    const p = ficha("cambio", { nombre: "Luis", aporte: "150" });
    const r = recomendarPlanes(p, actual, [b, caro, a, plan("Sin tabla", {})]);
    expect(r.map((x) => x.plan.nombre)).toEqual(["Plan A", "Plan B", "Plan Caro"]);
    expect(r[2].fueraPresupuesto).toBe(true);
    expect(r[0]).toMatchObject({ mejoras: 3, peores: 0, primaPlan: 50 });
  });

  it("los motivos pesan: con 'costos', los cargos cuentan doble", () => {
    const p = ficha("cambio", { motivos: ["costos"] });
    const x = analizarPlan(p, actual, a);
    expect(x.filas.find((f) => f.id === "admin")?.clave).toBe(true);
    expect(x.filas.find((f) => f.id === "vida")?.clave).toBe(false);
  });

  it("lo que gana y lo que debe saber, sin ocultar costos ni rescates", () => {
    const x = analizarPlan(ficha("cambio"), actual, a);
    const bs = beneficios(x);
    expect(bs).toContain("Cobertura por fallecimiento: $20.000 (hoy no lo tiene)");
    expect(bs).toContain("Incluye: Estado de cuenta en línea");
    expect(avisos(x)).toContain("Costo: Cargo inicial: 5% del aporte");
    expect(avisos(analizarPlan(ficha("cambio"), actual, b))).toContain("Cargo de administración: 3% (hoy 2,5%)");
  });

  it("mensaje para enviar: sin prometer rendimientos y con validar con la aseguradora", () => {
    const p = ficha("cambio", { nombre: "Luis Paz", planActual: { tabla: actual } });
    const t = textoComparacion(p, analizarPlan(p, actual, a));
    expect(t).toContain("Hola Luis, comparé su inversión actual con *Plan A*");
    expect(t).toContain("Aporte mínimo: $50 al mes (hoy aporta $100)");
    expect(t).toContain("• Cargo de administración: 1,5% (hoy 2,5%)");
    expect(t).toContain("validar con la aseguradora");
    expect(t).toContain("no están garantizados");
  });

  it("carga la tabla desde Excel y desde texto de un PDF", () => {
    expect(
      tablaDesdeFilas([
        ["Concepto", "Valor"],
        ["Cargo de administración", "1,5% anual"],
        ["Aporte mínimo mensual", 50],
        ["Cobertura por fallecimiento", "No incluye"],
      ]),
    ).toEqual({ admin: "1,5% anual", prima: "50", vida: "No incluye" });
    expect(
      tablaDesdeTexto("DATOS DEL PLAN\nCargo inicial: 5%\nPenalidad por rescate anticipado 10%\nSin penalidad desde el año 6\nAporte único mínimo: $5.000"),
    ).toEqual({ entrada: "5%", rescate: "10%", sinPenalidad: "desde el año 6", unico: "$5.000" });
  });
});
