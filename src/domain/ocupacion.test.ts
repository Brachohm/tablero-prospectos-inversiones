import { argumentoOcupacion, perfilOcupacion, riesgosDe, riesgosPrincipales } from "./ocupacion";
import { analisisLocal } from "./analisis";
import { sugerencias } from "./oferta";
import { ficha, HOY } from "./test-utils";

describe("ocupación", () => {
  it("reconoce el grupo de riesgos (sin importar tildes ni mayúsculas)", () => {
    expect(perfilOcupacion("Chofer de taxi").id).toBe("conduccion");
    expect(perfilOcupacion("Enfermera").id).toBe("salud");
    expect(perfilOcupacion("Profesora de inglés").id).toBe("docencia");
    expect(perfilOcupacion("Maestro de obra").id).toBe("obra");
    expect(perfilOcupacion("Contadora").id).toBe("oficina");
    expect(perfilOcupacion("Diseñador gráfico").id).toBe("oficina");
    expect(perfilOcupacion("Astronauta").id).toBe("general");
  });

  it("riesgos de la ficha: los más altos primero; sin ocupación, nada", () => {
    expect(riesgosDe(ficha("nuevo"))).toBeNull();
    const r = riesgosDe(ficha("nuevo", { ocupacion: "Chofer" }))!;
    expect(riesgosPrincipales(r, 2)).toEqual(["Accidentes de tránsito", "Dolor lumbar por muchas horas sentado"]);
  });

  it("refuerza los argumentos, la oferta y el análisis", () => {
    const p = ficha("nuevo", { ocupacion: "Albañil" });
    const a = argumentoOcupacion(p)!;
    expect(a.titulo).toContain("Por su trabajo (Albañil)");
    expect(a.texto).toContain("validar coberturas con la aseguradora");
    expect(sugerencias(p).prueba.join()).toContain("Su trabajo es físico");
    expect(analisisLocal(p, HOY).busca.join()).toMatch(/riesgos de su trabajo \(Albañil\)/);
    expect(argumentoOcupacion(ficha("nuevo"))).toBeNull();
  });
});
