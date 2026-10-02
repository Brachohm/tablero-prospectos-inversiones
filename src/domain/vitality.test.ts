import { crearPlan, type Documento } from "./biblioteca";
import { argumentoPoliza, tipoPolizaDe } from "./poliza";
import { catalogo } from "./recomendar";
import { ficha } from "./test-utils";
import { tieneVitality, vitalityDe } from "./vitality";

const doc = (id: string, nombre: string, plan: string, paginas: string[]): Documento => ({
  id, nombre, tipo: plan ? "anexo" : "otro", plan, paginas, archivo: true, bytes: 1, creado: 1, mod: 1,
});

describe("tipo de póliza actual (cambio de seguro)", () => {
  it("masivo y corporativo traen sus argumentos; individual no", () => {
    expect(tipoPolizaDe(ficha("nuevo", { tipoPoliza: "Corporativo" }))).toBeNull();
    expect(argumentoPoliza(ficha("cambio", { tipoPoliza: "Individual" }))).toBeNull();
    const c = argumentoPoliza(ficha("cambio", { tipoPoliza: "Corporativo" }))!;
    expect(c.titulo).toBe("Su seguro actual es corporativo");
    expect(c.puntos[0]).toMatch(/mientras esté vinculado a la empresa o institución, o mientras estudie/);
    expect(c.precio).toMatch(/solo mientras siga vinculado/);
    expect(argumentoPoliza(ficha("cambio", { tipoPoliza: "Masivo" }))!.precio).toMatch(/comparar lo que cubre de verdad/);
  });

  it("refuerza la objeción de precio en la propuesta y el análisis del informe", async () => {
    const { propuesta } = await import("./propuesta");
    const { informe } = await import("./informe");
    const { perfilDe } = await import("./ajustes");
    const p = ficha("cambio", { tipoPoliza: "Corporativo", objeciones2: ["precio"] });
    const pr = propuesta(p, perfilDe(undefined), "2026-10-07");
    expect(pr.poliza?.tipo).toBe("Corporativo");
    expect(pr.objeciones[0].respuesta).toMatch(/le cubre solo mientras siga vinculado/);
    const inf = informe(p, perfilDe(undefined), "2026-10-07");
    expect(inf.resumen).toContainEqual({ l: "Tipo de seguro", v: "Corporativo" });
    expect(inf.analisis.join()).toMatch(/mientras estudie/);
  });
});

describe("Vitality", () => {
  const anexo = doc("d1", "Anexo Plan Activa", "Plan Activa", ["COBERTURAS\nHospitalizacion al 100%\nIncluye el programa Vitality"]);
  const vit = doc("d2", "Guía Vitality", "", [
    "BENEFICIOS VITALITY\nCada semana activa: una bebida saludable sin costo\nDescuento mensual del 25% en gimnasios afiliados\nBeneficio anual: hasta 50% de descuento en vuelos\nSube tu estatus Vitality con chequeos preventivos\nNo aplica para menores de 18 años",
  ]);
  const otro = doc("d3", "Anexo Plan Base", "Plan Base", ["COBERTURAS\nDescuento del 20% en farmacias"]);

  it("reconoce qué planes lo tienen", () => {
    const c = catalogo([], [anexo, otro]);
    expect(c.map((x) => tieneVitality(x))).toEqual([true, false]);
    const guardado = { ...crearPlan(1), nombre: "Plan Salud", beneficios: "Programa Vitality" };
    expect(tieneVitality(catalogo([guardado], [])[0])).toBe(true);
  });

  it("agrupa sus beneficios semanales, mensuales y anuales, tal cual y con su fuente", () => {
    const [item] = catalogo([], [anexo]);
    const v = vitalityDe(item, [anexo, vit, otro])!;
    expect(v.semanal).toEqual([{ t: "Cada semana activa: una bebida saludable sin costo", fuente: "Guía Vitality, pág. 1" }]);
    expect(v.mensual.map((x) => x.t)).toEqual(["Descuento mensual del 25% en gimnasios afiliados"]);
    expect(v.anual.map((x) => x.t)).toEqual(["Beneficio anual: hasta 50% de descuento en vuelos"]);
    expect(v.otros.map((x) => x.t)).toEqual(["Sube tu estatus Vitality con chequeos preventivos"]);
    // Nada de otros planes ni lo que "no aplica"
    expect(JSON.stringify(v)).not.toMatch(/farmacias|No aplica/);
    expect(vitalityDe(catalogo([], [otro])[0], [vit])).toBeNull();
  });
});
