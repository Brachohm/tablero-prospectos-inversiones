import { crearPlan, type Documento } from "./biblioteca";
import { aplicarPrecarga, precargaDesdeDocumento, totalPrecarga } from "./extraer";

const doc = (paginas: string[], extra: Partial<Documento> = {}): Documento => ({
  id: "d1",
  nombre: "Anexo Plan Familia",
  tipo: "anexo",
  plan: "Plan Familia",
  paginas,
  archivo: true,
  bytes: 1,
  creado: 1,
  mod: 1,
  ...extra,
});

const anexo = doc([
  [
    "ANEXO DEL PLAN FAMILIA",
    "Página 1",
    "COBERTURAS",
    "• Hospitalización y cirugía al 100%",
    "• Emergencias 24/7 en la red",
    "Consultas ambulatorias con copago",
    "Prima mensual: $95",
    "Deducible anual: $500",
  ].join("\n"),
  [
    "Carencias:",
    "- Maternidad: 10 meses",
    "- Cirugías programadas: 6 meses",
    "",
    "",
    "EXCLUSIONES",
    "1. Tratamientos estéticos",
    "2. Lesiones por deportes extremos",
    "",
    "",
    "Beneficios adicionales",
    "Telemedicina 24/7",
    "Se excluye la cirugía bariátrica.",
  ].join("\n"),
]);

describe("precarga de planes desde PDF", () => {
  it("copia solo lo escrito en el documento, por sección, con su página", () => {
    const x = precargaDesdeDocumento(anexo);
    expect(x.campos.coberturas).toEqual([
      "Hospitalización y cirugía al 100%",
      "Emergencias 24/7 en la red",
      "Consultas ambulatorias con copago",
    ]);
    expect(x.campos.carencias).toEqual(["Maternidad: 10 meses", "Cirugías programadas: 6 meses"]);
    // "Se excluye…" va a exclusiones aunque esté bajo otro título
    expect(x.campos.exclusiones).toEqual(["Tratamientos estéticos", "Lesiones por deportes extremos", "Se excluye la cirugía bariátrica."]);
    expect(x.campos.beneficios).toEqual(["Telemedicina 24/7"]);
    expect(x.tabla).toMatchObject({ prima: "$95", deducible: "$500", hospitalaria: "100%" });
    // "Maternidad: 10 meses" es una carencia, no la cobertura de maternidad
    expect(x.tabla.maternidad).toBeUndefined();
    expect(x.precio).toBe("$95");
    expect(x.paginas.coberturas).toEqual([1]);
    expect(x.paginas.carencias).toEqual([2]);
    expect(x.fuente).toBe("Anexo Plan Familia, págs. 1, 2");
    expect(totalPrecarga(x)).toBeGreaterThan(8);
    // Nada inventado: cada línea está en el texto del PDF
    const todo = anexo.paginas.join("\n");
    for (const xs of Object.values(x.campos)) for (const l of xs!) expect(todo).toContain(l);
  });

  it("sin secciones reconocibles no inventa: queda vacío", () => {
    const x = precargaDesdeDocumento(doc(["Texto general sin títulos ni valores."]));
    expect(x.campos).toEqual({});
    expect(totalPrecarga(x)).toBe(0);
  });

  it("al aplicarla no pisa lo escrito: suma líneas y llena lo vacío", () => {
    const plan = { ...crearPlan(1), nombre: "", coberturas: "Hospitalización y cirugía al 100%\nMi nota", tabla: { deducible: "$300" } };
    const p = aplicarPrecarga(plan, precargaDesdeDocumento(anexo), anexo);
    expect(p.nombre).toBe("Plan Familia");
    expect(p.coberturas.split("\n")).toEqual([
      "Hospitalización y cirugía al 100%",
      "Mi nota",
      "Emergencias 24/7 en la red",
      "Consultas ambulatorias con copago",
    ]);
    expect(p.tabla).toMatchObject({ deducible: "$300", prima: "$95" });
    expect(p.precio).toBe("$95");
    expect(p.fuente).toBe("Anexo Plan Familia, págs. 1, 2");
  });
});

describe("títulos vs. contenido", () => {
  it("una exclusión que empieza con 'No cubre' no se toma como título (no se pierde)", () => {
    const x = precargaDesdeDocumento(doc(["EXCLUSIONES\nNo cubre tratamientos estéticos\nCirugía bariátrica\nCARENCIAS: maternidad 10 meses"]));
    expect(x.campos.exclusiones).toEqual(["No cubre tratamientos estéticos", "Cirugía bariátrica"]);
    expect(x.campos.carencias).toEqual(["maternidad 10 meses"]);
  });
});
