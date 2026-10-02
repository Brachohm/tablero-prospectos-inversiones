import { crearPlan } from "./biblioteca";
import { nuevoBono, ofertaInforme, planDeOferta, sugerencias, valorUSD } from "./oferta";
import { ficha } from "./test-utils";

describe("oferta", () => {
  it("lee valores en USD escritos de varias formas", () => {
    expect(valorUSD("120")).toBe(120);
    expect(valorUSD("$1.200,50")).toBe(1200.5);
    expect(valorUSD("1,200.50 USD")).toBe(1200.5);
    expect(valorUSD("1.500")).toBe(1500);
    expect(valorUSD("")).toBeNull();
    expect(valorUSD("gratis")).toBeNull();
  });

  it("sugerencias salen de la ficha y del plan", () => {
    const plan = { ...crearPlan(1), nombre: "Plan Uno", beneficios: "Telemedicina\nChequeo anual", garantias: "Precio fijo el primer año" };
    const s = sugerencias(ficha("nuevo", { porque: "Nació su hija", depende: "su hija" }), plan);
    expect(s.sueno).toContain("Nació su hija");
    expect(s.sueno.some((x) => x.includes("su hija tenga un futuro respaldado"))).toBe(true);
    expect(s.bonos.slice(0, 2)).toEqual(["Telemedicina", "Chequeo anual"]);
    expect(s.garantia[0]).toBe("Precio fijo el primer año");
    expect(s.nombre[1]).toContain("Plan Uno");
    expect(s.urgencia[0]).toContain("interés compuesto");
  });

  it("ya invierte: urgencia por el vencimiento de su inversión", () => {
    const s = sugerencias(ficha("cambio", { vencimiento: "2026-12-01" }));
    expect(s.urgencia.some((x) => x.includes("vence"))).toBe(true);
  });

  it("oferta del informe: se arma sola con la ficha, el plan y los argumentos", () => {
    const plan = {
      ...crearPlan(1),
      nombre: "Plan Uno",
      coberturas: "Hospitalización 100%",
      beneficios: "Telemedicina\nChequeo anual",
      garantias: "Precio fijo el primer año",
    };
    const p = ficha("nuevo", {
      porque: "Nació su hija",
      depende: "su hija",
      productos: [{ id: "prod-1", planId: plan.id, nombre: "Plan Uno", mensual: "80", deducible: "" }],
    });
    expect(planDeOferta(p, [plan])?.id).toBe(plan.id);
    const o = ofertaInforme(p, plan, [], 80);
    expect(o.nombre).toBe("Futuro familiar asegurado");
    expect(o.plan).toBe("Plan Uno");
    expect(o.sueno).toBe("Nació su hija");
    expect(o.prueba).toContain("Hospitalización 100%");
    expect(o.esfuerzo).toEqual(["Yo me encargo de los trámites: usted solo firma"]);
    expect(o.tiempo).toContain("validar con la aseguradora");
    // Bonos del plan y del asesor, sin montos inventados
    expect(o.bonos.slice(0, 2)).toEqual([
      { t: "Telemedicina", valor: null },
      { t: "Chequeo anual", valor: null },
    ]);
    expect(o.bonos.length).toBeLessThanOrEqual(4);
    expect(o.totalBonos).toBe(0);
    expect(o.garantia).toBe("Precio fijo el primer año");
    expect(o.urgencia).toContain("interés compuesto");
    expect(o.inversion).toBe(80);
  });

  it("oferta del informe: sin plan tiene respaldo honesto y lo escrito antes manda", () => {
    const vacia = ofertaInforme(ficha("cambio"));
    expect(vacia.plan).toBeNull();
    expect(vacia.sueno).toBeTruthy();
    expect(vacia.urgencia).toContain("antes del vencimiento");
    // Lo que ya va como bono no se repite en "lo que yo hago por ti"
    expect(vacia.esfuerzo.join()).not.toMatch(/elección de fondos|Revisión semestral de su estado/);
    expect(vacia.inversion).toBeNull();
    const vieja = ofertaInforme(
      ficha("nuevo", { oferta: { nombre: "Salud total", garantia: "Te acompaño siempre", bonos: [nuevoBono("Revisión anual", "150")] } }),
    );
    expect(vieja.nombre).toBe("Salud total");
    expect(vieja.garantia).toBe("Te acompaño siempre");
    expect(vieja.bonos).toEqual([{ t: "Revisión anual", valor: 150 }]);
    expect(vieja.totalBonos).toBe(150);
  });
});
