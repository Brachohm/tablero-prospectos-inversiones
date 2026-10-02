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

describe("comparar coberturas", () => {
  it("interpreta montos, porcentajes, no incluye, ilimitado y sí", () => {
    expect(interpretar("$5.000")).toEqual({ tipo: "num", n: 5000, pct: false });
    expect(interpretar("80 %")).toEqual({ tipo: "num", n: 80, pct: true });
    expect(interpretar("No incluye")).toEqual({ tipo: "no" });
    expect(interpretar("Ilimitado")).toEqual({ tipo: "ilimitado" });
    expect(interpretar("Sí")).toEqual({ tipo: "si" });
    expect(interpretar("")).toEqual({ tipo: "vacio" });
  });

  it("mayor es mejor en coberturas; menor es mejor en deducible, copago y días", () => {
    expect(comparar("maximo", "$50.000", "$100.000")).toBe("mejor");
    expect(comparar("hospitalaria", "100%", "80%")).toBe("peor");
    expect(comparar("deducible", "$500", "$300")).toBe("mejor");
    expect(comparar("deducible", "No tiene", "$300")).toBe("peor");
    expect(comparar("reembolso", "30 días", "10 días")).toBe("mejor");
    expect(comparar("maternidad", "No incluye", "$2.000")).toBe("mejor");
    expect(comparar("telemedicina", "No", "Sí")).toBe("mejor");
    expect(comparar("maximo", "$50.000", "Ilimitado")).toBe("mejor");
    expect(comparar("hospitalaria", "100%", "$5.000")).toBe("?");
    expect(comparar("red", "Quito", "quito")).toBe("igual");
  });

  const actual = { prima: "$100", deducible: "$500", maximo: "$50.000", maternidad: "No incluye", reembolso: "30 días" };
  const a = plan("Plan A", { prima: "$110", deducible: "$300", maximo: "$100.000", maternidad: "$2.000", reembolso: "10 días" }, {
    beneficios: "Telemedicina 24/7",
    carencias: "Maternidad: 10 meses",
  });
  const b = plan("Plan B", { prima: "$90", deducible: "$800", maximo: "$50.000", maternidad: "No incluye" });
  const caro = plan("Plan Caro", { prima: "$300", deducible: "$0", maximo: "Ilimitado", maternidad: "$5.000", reembolso: "5 días" });

  it("recomienda el que más mejora sin pasarse del presupuesto", () => {
    const p = ficha("cambio", { nombre: "Luis", pre_limite: "150" });
    const r = recomendarPlanes(p, actual, [b, caro, a, plan("Sin tabla", {})]);
    expect(r.map((x) => x.plan.nombre)).toEqual(["Plan A", "Plan B", "Plan Caro"]);
    expect(r[2].fueraPresupuesto).toBe(true);
    expect(r[0]).toMatchObject({ mejoras: 4, peores: 0, primaPlan: 110, diferencia: 10 });
  });

  it("los motivos de inconformidad pesan: con 'precio', gana el más barato si no pierde mucho", () => {
    const p = ficha("cambio", { motivos: ["precio"] });
    const barato = plan("Barato", { prima: "$70", deducible: "$500", maximo: "$50.000" });
    const r = recomendarPlanes(p, actual, [a, barato]);
    expect(r[0].plan.nombre).toBe("Barato");
  });

  it("beneficios realzados y avisos honestos", () => {
    const x = analizarPlan(ficha("cambio", { motivos: ["reembolsos"] }), actual, a);
    const bs = beneficios(x);
    expect(bs[0]).toBe("Días para el reembolso: 10 días (hoy 30 días)"); // su motivo, primero
    expect(bs).toContain("Maternidad: $2.000 (hoy no lo tiene)");
    expect(bs).toContain("Incluye: Telemedicina 24/7");
    expect(avisos(x)).toContain("Carencia: Maternidad: 10 meses");
    const xb = analizarPlan(ficha("cambio"), actual, b);
    expect(avisos(xb)).toContain("Deducible: $800 (hoy $500)");
    expect(beneficios(xb)[0]).toBe("Paga $10 menos al mes");
  });

  it("mensaje para enviar, con validar con la aseguradora", () => {
    const p = ficha("cambio", { nombre: "Luis Paz", planActual: { tabla: actual } });
    const t = textoComparacion(p, analizarPlan(p, actual, a));
    expect(t).toContain("Hola Luis, comparé su plan actual con *Plan A*");
    expect(t).toContain("$110 al mes (hoy paga $100: +$10)");
    expect(t).toContain("• Cobertura máxima anual: $100.000 (hoy $50.000)");
    expect(t).toContain("validar con la aseguradora");
  });

  it("carga la tabla desde Excel y desde texto de un PDF", () => {
    expect(
      tablaDesdeFilas([
        ["Cobertura", "Valor"],
        ["Deducible anual", "$500"],
        ["Monto máximo de cobertura", 50000],
        ["Maternidad", "No incluye"],
      ]),
    ).toEqual({ deducible: "$500", maximo: "50000", maternidad: "No incluye" });
    expect(
      tablaDesdeTexto("TABLA DE BENEFICIOS\nDeducible anual: $500\nCopago consultas 20%\nReembolso en 30 días\nOdontología - No incluye"),
    ).toEqual({ deducible: "$500", copago: "20%", reembolso: "30 días", odontologia: "No incluye" });
  });
});

describe("tabla desde texto: conceptos que califican", () => {
  it("emergencias en el exterior van al exterior, no a emergencias", async () => {
    const { tablaDesdeTexto } = await import("./comparar");
    expect(tablaDesdeTexto("Cobertura en el exterior por emergencias hasta $50.000\nEmergencias: 100%")).toEqual({
      exterior: "$50.000",
      emergencias: "100%",
    });
  });
});
