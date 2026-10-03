import { crearPlan } from "./biblioteca";
import { bondadesDe, clasificar, destacadosDe, letraChicaDe } from "./bondades";
import { catalogo } from "./recomendar";

import { condicionesFuturo as anexo } from "./fixtures-inversion";

describe("bondades de los planes (de sus PDF)", () => {
  it("clasifica solo frases tangibles, sin negaciones, títulos ni texto legal", () => {
    expect(clasificar("Estado de cuenta en línea cada mes")).toEqual({ categoria: "servicios", dato: false });
    expect(clasificar("Cobertura por fallecimiento: $20.000")).toEqual({ categoria: "grave", dato: true });
    expect(clasificar("Bono de permanencia: 2% al año 10")).toEqual({ categoria: "dinero", dato: true });
    expect(clasificar("No permite retiros parciales")).toBeNull();
    expect(clasificar("BENEFICIOS ADICIONALES")).toBeNull();
    expect(clasificar("Articulo 5: el contratante debera firmar la solicitud")).toBeNull();
    expect(clasificar("Aporte mínimo mensual: $50")).toBeNull();
    expect(clasificar("Cargo de administración: 1,5% anual")).toBeNull();
    expect(clasificar("Sin cargo de rescate desde el año 6")).toMatchObject({ categoria: "dinero" });
    expect(clasificar("Un plan pensado para ti")).toBeNull();
  });

  it("estudia el PDF del plan: resumen gráfico de su tabla y bondades con su página", () => {
    const [item] = catalogo([], [anexo]);
    const dest = destacadosDe(item);
    expect(dest.map((d) => [d.l, d.v])).toEqual(
      expect.arrayContaining([
        ["Aporte mínimo", "$50"],
        ["Cobertura de vida", "$20.000 o el saldo, el mayor"],
        ["Sin penalidad desde", "desde el año 6"],
      ]),
    );
    expect(dest.length).toBeLessThanOrEqual(8);
    const textos = bondadesDe(item).map((b) => b.t);
    expect(textos).toEqual(expect.arrayContaining(["Estado de cuenta en línea cada mes", "Bono de permanencia: 2% al año 10"]));
    expect(textos.join()).not.toMatch(/Artículo|Aporte mínimo|Cargo de administración|BENEFICIOS/);
    expect(bondadesDe(item).find((b) => b.t === "Estado de cuenta en línea cada mes")?.fuente).toBe("Condiciones Plan Futuro, pág. 2");
  });

  it("también usa los beneficios y garantías escritos en el plan, sin repetir", () => {
    const plan = { ...crearPlan(1), id: "pf", nombre: "Plan Futuro", beneficios: "Estado de cuenta en línea cada mes\nAsesoría anual sin costo", fuente: "Condiciones Plan Futuro, págs. 1, 2" };
    const [item] = catalogo([plan], [anexo]);
    const bs = bondadesDe(item);
    expect(bs.filter((b) => b.t === "Estado de cuenta en línea cada mes")).toHaveLength(1);
    expect(bs.find((b) => b.t === "Asesoría anual sin costo")).toMatchObject({ categoria: "servicios" });
  });
});

describe("lo que debe saber (sin ocultar nada)", () => {
  it("cargo de administración y penalidad por rescate, con su fuente", () => {
    const [item] = catalogo([], [anexo]);
    const x = letraChicaDe(item);
    expect(x.deducible).toBe("Cargo de administración: 1,5% anual");
    expect(x.copago).toBe("Penalidad por rescate anticipado: 10% el primer año");
  });
});
