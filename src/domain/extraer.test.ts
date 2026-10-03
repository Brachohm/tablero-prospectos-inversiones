import { crearPlan } from "./biblioteca";
import { aplicarPrecarga, precargaDesdeDocumento, totalPrecarga } from "./extraer";
import { condicionesFuturo, docPlan } from "./fixtures-inversion";

describe("precarga de planes de inversión desde PDF", () => {
  it("copia solo lo escrito en el documento, por sección, con su página", () => {
    const x = precargaDesdeDocumento(condicionesFuturo);
    expect(x.campos.coberturas).toEqual([
      "Plazos de 10 a 30 años",
      "Fondos disponibles: conservador, moderado y agresivo",
      "Cobertura por fallecimiento: $20.000 o el saldo, el mayor",
    ]);
    expect(x.campos.carencias).toEqual(["Cargo de administración: 1,5% anual", "Cargo inicial: 5% del aporte"]);
    expect(x.campos.exclusiones).toEqual(["Penalidad por rescate anticipado: 10% el primer año", "Sin penalidad desde el año 6"]);
    expect(x.campos.beneficios).toEqual(expect.arrayContaining(["Estado de cuenta en línea cada mes", "Bono de permanencia: 2% al año 10"]));
    expect(x.tabla).toMatchObject({
      prima: "$50",
      unico: "$5.000",
      admin: "1,5% anual",
      entrada: "5% del aporte",
      rescate: "10% el primer año",
      sinPenalidad: "desde el año 6",
      vida: "$20.000 o el saldo, el mayor",
    });
    expect(x.precio).toBe("$50");
    expect(x.paginas.coberturas).toEqual([1]);
    expect(x.paginas.carencias).toEqual([2]);
    expect(x.fuente).toBe("Condiciones Plan Futuro, págs. 1, 2");
    expect(totalPrecarga(x)).toBeGreaterThan(8);
    // Nada inventado: cada línea está en el texto del PDF
    const todo = condicionesFuturo.paginas.join("\n");
    for (const xs of Object.values(x.campos)) for (const l of xs!) expect(todo).toContain(l);
  });

  it("sin secciones reconocibles no inventa: queda vacío", () => {
    const x = precargaDesdeDocumento(docPlan("d9", "X", ["Texto general sin títulos ni valores."]));
    expect(x.campos).toEqual({});
    expect(totalPrecarga(x)).toBe(0);
  });

  it("al aplicarla no pisa lo escrito: suma líneas y llena lo vacío", () => {
    const plan = { ...crearPlan(1), nombre: "", coberturas: "Plazos de 10 a 30 años\nMi nota", tabla: { admin: "1,2%" } };
    const p = aplicarPrecarga(plan, precargaDesdeDocumento(condicionesFuturo), condicionesFuturo);
    expect(p.nombre).toBe("Plan Futuro");
    expect(p.coberturas.split("\n").slice(0, 3)).toEqual(["Plazos de 10 a 30 años", "Mi nota", "Fondos disponibles: conservador, moderado y agresivo"]);
    expect(p.tabla).toMatchObject({ admin: "1,2%", prima: "$50" });
    expect(p.precio).toBe("$50");
  });
});
