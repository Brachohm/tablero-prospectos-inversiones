import { analisisLocal, comparativo, diagLocal, perfilIncoherente, textoResumen, vista } from "./analisis";
import { ficha, HOY } from "./test-utils";
import type { Prospecto } from "./tipos";

const ids = (p: Prospecto) => analisisLocal(p, HOY).recs.map((r) => r.id);

/** Ya invierte, con datos suficientes para opinar. */
const baseCambio = { institucion: "Banco X", tiempoCon: "6 años", edad: "45", depende: "2 hijos" };
/** Primera inversión, con datos suficientes. */
const baseNuevo = { edad: "35", meta: "Retiro o jubilación", horizonte: "Más de 20 años", aporte: "200", emergencia: "Sí" };

describe("diagnóstico de causa (ya invierte)", () => {
  it("sin señales: indeterminada", () => {
    expect(diagLocal(ficha("cambio", baseCambio), HOY).causa?.tipo).toBe("indeterminada");
  });

  it("no le explicaron los costos → contratación, aún no conviene mover", () => {
    const d = diagLocal(ficha("cambio", { ...baseCambio, motivos: ["costos"], cos_sabe: "No" }), HOY);
    expect(d.causa?.tipo).toBe("contratacion");
    expect(d.veredicto.nivel).toBe("no_recomendable");
  });

  it("rendimiento bajo y sin información → producto, viable con condiciones", () => {
    const d = diagLocal(
      ficha("cambio", { ...baseCambio, motivos: ["rendimiento", "transparencia"], ren_tasa: "3", ren_esperado: "5", tra_informe: "Nunca" }),
      HOY,
    );
    expect(d.causa?.tipo).toBe("producto");
    expect(d.veredicto.nivel).toBe("condiciones");
  });

  it("rendimiento esperado irreal apunta a contratación", () => {
    const d = diagLocal(ficha("cambio", { ...baseCambio, motivos: ["rendimiento"], ren_tasa: "4", ren_esperado: "15" }), HOY);
    expect(d.puntaje?.contratacion).toBe(2);
  });

  it("calcula cuánto vale un punto de rendimiento sobre su saldo", () => {
    const d = diagLocal(ficha("cambio", { ...baseCambio, motivos: ["rendimiento"], ren_tasa: "3", saldoActual: "20000" }), HOY);
    expect(d.costo.join(" ")).toContain("$200");
  });
});

describe("veredicto (primera inversión)", () => {
  it("viable con meta, horizonte y fondo de emergencia", () => {
    expect(diagLocal(ficha("nuevo", baseNuevo), HOY).veredicto.nivel).toBe("viable");
  });
  it("sin fondo de emergencia → condiciones", () => {
    expect(diagLocal(ficha("nuevo", { ...baseNuevo, emergencia: "No" }), HOY).veredicto.nivel).toBe("condiciones");
  });
  it("horizonte corto → aún no conviene", () => {
    expect(diagLocal(ficha("nuevo", { ...baseNuevo, horizonte: "Menos de 3 años" }), HOY).veredicto.nivel).toBe("no_recomendable");
  });
  it("perfil incoherente → estrategia conservadora", () => {
    const p = ficha("nuevo", { ...baseNuevo, perfil: "Arriesgado", reaccion: "Retiraría todo" });
    expect(perfilIncoherente(p)).toBe(true);
    expect(diagLocal(p, HOY).veredicto.titulo).toContain("conservadora");
  });
  it("con pocos datos falta información", () => {
    expect(diagLocal(ficha("nuevo"), HOY).veredicto.nivel).toBe("falta_informacion");
  });
});

describe("análisis local", () => {
  it("recordatorios fijos y por tipo", () => {
    expect(ids(ficha("nuevo"))).toEqual(expect.arrayContaining(["perf", "rend", "cost", "resc", "kyc"]));
    expect(ids(ficha("cambio"))).toEqual(expect.arrayContaining(["comp", "sal"]));
    expect(ids(ficha("nuevo"))).not.toContain("comp");
  });
  it("recordatorios condicionales", () => {
    const r = ids(ficha("nuevo", { emergencia: "No", deudas: "Tarjeta", edad: "55", horizonte: "3 a 5 años" }));
    expect(r).toEqual(expect.arrayContaining(["emer", "deu", "e50", "hcor"]));
  });
  it("avisa cuando la meta y el aporte no cuadran", () => {
    expect(ids(ficha("nuevo", { metaMonto: "100000", aporte: "100", horizonte: "5 a 10 años" }))).toContain("brec");
  });
  it("días al vencimiento", () => {
    const r = analisisLocal(ficha("cambio", { vencimiento: "2026-10-20" }), HOY).recs.find((x) => x.id === "venc");
    expect(r?.t).toBe("Vence en 20 días");
  });
  it("lo que busca y evita sale de la meta, motivos y objeción", () => {
    const a = analisisLocal(
      ficha("cambio", { meta: "Comprar vivienda", motivos: ["liquidez"], objecion: "Desconfío de las inversiones" }),
      HOY,
    );
    expect(a.busca[0]).toContain("comprar vivienda");
    expect(a.evita.join(" ")).toContain("atrapado");
    expect(a.evita.join(" ")).toContain("Perder su dinero");
  });
  it("información que falta según el tipo", () => {
    const a = analisisLocal(ficha("nuevo"), HOY);
    expect(a.vacios).toContain("¿Para qué quiere invertir?");
  });
});

describe("comparativo y resumen", () => {
  it("una fila por motivo elegido", () => {
    const f = comparativo(ficha("cambio", { motivos: ["rendimiento", "costos"] })).map((r) => r[0]);
    expect(f).toEqual(expect.arrayContaining(["Rendimiento", "Costos y comisiones"]));
    expect(f).not.toContain("Liquidez");
  });
  it("la vista junta análisis y diagnóstico, y el resumen tiene secciones", () => {
    const p = ficha("cambio", { ...baseCambio, motivos: ["costos"], cos_sabe: "No", nombre: "Ana" });
    expect(vista(p, HOY).causa?.tipo).toBe("contratacion");
    const t = textoResumen(p, HOY);
    expect(t).toContain("Ana");
    expect(t).toContain("Comparativo");
  });
});
