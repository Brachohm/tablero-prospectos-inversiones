import { crearPlan, type Documento } from "./biblioteca";
import { bondadesDe, clasificar, destacadosDe, explicarCopago, explicarDeducible, letraChicaDe, mesesDe } from "./bondades";
import { catalogo } from "./recomendar";

const doc = (paginas: string[]): Documento => ({
  id: "d1",
  nombre: "Anexo Plan Vida",
  tipo: "anexo",
  plan: "Plan Vida",
  paginas,
  archivo: true,
  bytes: 1,
  creado: 1,
  mod: 1,
});

const anexo = doc([
  [
    "COBERTURAS",
    "- Hospitalizacion y cirugia al 100%",
    "- Cobertura maxima anual: $500.000",
    "- Emergencias 24/7 en toda la red",
    "Prima mensual: $95",
    "Deducible anual: $300",
  ].join("\n"),
  [
    "BENEFICIOS ADICIONALES",
    "Telemedicina ilimitada sin costo",
    "Ambulancia terrestre incluida",
    "Chequeo preventivo anual para el titular",
    "Reembolso en 15 dias habiles",
    "Maternidad: parto normal o cesarea hasta $3.000",
    "Plan de modalidad abierta",
    "CARENCIAS",
    "Maternidad: 10 meses de periodo de espera",
    "Cirugia bariatrica: 24 meses",
    "EXCLUSIONES",
    "No cubre tratamientos esteticos",
    "Articulo 5: el asegurado debera presentar la factura original",
  ].join("\n"),
]);

describe("bondades de los planes (de sus PDF)", () => {
  it("clasifica solo frases tangibles, sin exclusiones, esperas, títulos ni texto legal", () => {
    expect(clasificar("Telemedicina ilimitada sin costo")).toEqual({ categoria: "servicios", dato: true });
    expect(clasificar("Reembolso en 15 dias habiles")).toEqual({ categoria: "dinero", dato: true });
    expect(clasificar("No cubre tratamientos esteticos")).toBeNull();
    expect(clasificar("Maternidad: 10 meses de periodo de espera")).toBeNull();
    expect(clasificar("BENEFICIOS ADICIONALES")).toBeNull();
    expect(clasificar("Articulo 5: el asegurado debera presentar la factura original")).toBeNull();
    expect(clasificar("Prima mensual: $95")).toBeNull();
    expect(clasificar("Deducible anual: $300")).toBeNull();
    expect(clasificar("Sin deducible en emergencias")).toMatchObject({ categoria: "dinero" });
    expect(clasificar("Un plan pensado para ti")).toBeNull();
  });

  it("estudia el PDF del plan: resumen gráfico de su tabla y bondades con su página", () => {
    const [item] = catalogo([], [anexo]);
    const dest = destacadosDe(item);
    expect(dest.map((d) => [d.l, d.v])).toEqual(
      expect.arrayContaining([
        ["Cobertura máxima", "$500.000"],
        ["Hospitalización y cirugía", "100%"],
        ["Deducible", "$300"],
        ["Modalidad", "Abierta"],
      ]),
    );
    expect(dest.length).toBeLessThanOrEqual(8);
    const bs = bondadesDe(item);
    const textos = bs.map((b) => b.t);
    expect(textos).toEqual(
      expect.arrayContaining([
        "Telemedicina ilimitada sin costo",
        "Ambulancia terrestre incluida",
        "Reembolso en 15 dias habiles",
        "Maternidad: parto normal o cesarea hasta $3.000",
        "Hospitalizacion y cirugia al 100%",
      ]),
    );
    expect(textos.join()).not.toMatch(/No cubre|periodo de espera|bariatrica|Articulo|Prima mensual|Deducible|BENEFICIOS/);
    expect(textos).toContain("Emergencias 24/7 en toda la red");
    expect(bs.find((b) => b.t === "Ambulancia terrestre incluida")?.fuente).toBe("Anexo Plan Vida, pág. 2");
    // Agrupadas: lo grave primero
    expect(bs[0].categoria).toBe("grave");
  });

  it("también usa los beneficios y garantías escritos en el plan, sin repetir", () => {
    const plan = { ...crearPlan(1), id: "pv", nombre: "Plan Vida", beneficios: "Telemedicina ilimitada sin costo\nDescuento del 20% en farmacias", fuente: "Anexo Plan Vida, págs. 1, 2" };
    const [item] = catalogo([plan], [anexo]);
    const bs = bondadesDe(item);
    expect(bs.filter((b) => b.t === "Telemedicina ilimitada sin costo")).toHaveLength(1);
    expect(bs.find((b) => b.t === "Descuento del 20% en farmacias")).toMatchObject({ categoria: "servicios", fuente: "Anexo Plan Vida, págs. 1, 2" });
  });
});

describe("lo que debe saber (sin ocultar nada)", () => {
  it("deducible, carencias con sus meses (de menor a mayor) y exclusiones, con su fuente", () => {
    const [item] = catalogo([], [anexo]);
    const x = letraChicaDe(item);
    expect(x.deducible).toBe("Deducible anual: $300");
    expect(x.carencias.map((c) => [c.l, c.meses])).toEqual([
      ["Maternidad", 10],
      ["Cirugia bariatrica", 24],
    ]);
    expect(x.carencias[0].fuente).toBe("Anexo Plan Vida, pág. 2");
    // Todo lo que está en la sección de exclusiones del PDF, tal cual
    expect(x.exclusiones.map((e) => e.t)).toEqual(["No cubre tratamientos esteticos", "Articulo 5: el asegurado debera presentar la factura original"]);
  });

  it("lee los meses de espera en meses, días o años", () => {
    expect(mesesDe("Maternidad: 10 meses")).toBe(10);
    expect(mesesDe("Enfermedades generales: 30 días")).toBe(1);
    expect(mesesDe("Preexistencias: 2 años")).toBe(24);
    expect(mesesDe("Según condiciones")).toBeNull();
  });

  it("explica el deducible en simple, con un ejemplo con su monto", () => {
    const d = explicarDeducible(300, "Deducible anual: $300");
    expect(d.valor).toBe("$300 al año");
    expect(d.que).toMatch(/usted paga primero/);
    expect(d.ejemplo).toBe(
      "Ejemplo: si tiene gastos por $1.200, usted cubre los primeros $300 y el seguro cubre los $900 restantes, según el porcentaje de cobertura de su plan.",
    );
    expect(d.cuando).toMatch(/^Se cuenta por año/);
    expect(explicarDeducible(null, "$500 por evento")).toMatchObject({ valor: "$500 por evento", cuando: expect.stringMatching(/por evento/) });
    // Sin datos: igual se explica, y se marca por confirmar
    expect(explicarDeducible(null, null)).toMatchObject({ valor: "Por confirmar con la aseguradora", ejemplo: null });
    expect(explicarCopago("20%")).toMatch(/Con 20%, de cada \$100 usted paga \$20 y el seguro los otros \$80\./);
  });
});
