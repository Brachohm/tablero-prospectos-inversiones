import { capacidadDe, deudaTarjeta, pesoDeudas, metaRetiroDe, metasDe, montoMeta, perfilEfectivo, puntajePerfil } from "./finanzas";
import { ficha } from "./test-utils";

describe("capacidad de ahorro", () => {
  it("ingreso (rango o exacto) − gastos − deudas, y aporte cómodo", () => {
    const c = capacidadDe(ficha("nuevo", { ingresoRango: "$1.000 a $2.000", gastos: "900", deudaCuota: "100", aporte: "100" }))!;
    expect(c).toMatchObject({ ingreso: 1500, estimado: true, sobrante: 500, comodo: 150, pctDelSobrante: 20, nivel: "comodo" });
    expect(capacidadDe(ficha("nuevo", { ingreso: "2000", gastos: "1500", aporte: "300" }))).toMatchObject({ estimado: false, nivel: "exigente" });
    expect(capacidadDe(ficha("nuevo", { ingreso: "1000", gastos: "950", aporte: "100" }))?.nivel).toBe("no_alcanza");
    expect(capacidadDe(ficha("nuevo", { ingreso: "1000" }))).toBeNull();
  });
});

describe("deudas (sin preguntar la tasa)", () => {
  it("peso de las cuotas sobre el ingreso y deudas de tarjeta", () => {
    expect(pesoDeudas(ficha("nuevo", { ingreso: "1000", deudaCuota: "350" }))).toBe(35);
    expect(pesoDeudas(ficha("nuevo", { deudaCuota: "350" }))).toBeNull();
    expect(deudaTarjeta(ficha("nuevo", { deudas: "Tarjeta y préstamo" }))).toBe(true);
  });
});

describe("metas", () => {
  it("meta de retiro: renta × 12 × años (mínimo 15)", () => {
    expect(metaRetiroDe(ficha("nuevo", { edad: "40", edadRetiro: "65", rentaRetiro: "800" }))).toEqual({ renta: 800, anios: 20, monto: 192000, faltan: 25 });
    expect(metaRetiroDe(ficha("nuevo", { edadRetiro: "75", rentaRetiro: "500" }))?.anios).toBe(15);
  });
  it("el monto escrito manda; si no, el de retiro calculado", () => {
    expect(montoMeta(ficha("nuevo", { meta: "Retiro o jubilación", metaMonto: "50000", edadRetiro: "65", rentaRetiro: "800" }))).toBe(50000);
    expect(montoMeta(ficha("nuevo", { meta: "Retiro o jubilación", edadRetiro: "65", rentaRetiro: "800" }))).toBe(192000);
  });
  it("hasta tres metas en orden de prioridad", () => {
    const m = metasDe(ficha("nuevo", { meta: "Crear patrimonio", meta2: "Educación de los hijos", meta2Monto: "30000", meta3: "Comprar vivienda" }));
    expect(m.map((x) => [x.prioridad, x.meta])).toEqual([
      [1, "Crear patrimonio"],
      [2, "Educación de los hijos"],
      [3, "Comprar vivienda"],
    ]);
    expect(m[1].monto).toBe(30000);
  });
});

describe("perfil de riesgo por puntaje", () => {
  it("con menos de 4 respuestas no sugiere", () => {
    expect(puntajePerfil(ficha("nuevo", { reaccion: "Aportaría más" })).sugerido).toBeNull();
  });
  it("sugiere según el promedio y avisa si lo declarado es más arriesgado", () => {
    const p = ficha("nuevo", {
      perfil: "Arriesgado",
      rq_experiencia: "Nunca he invertido",
      reaccion: "Retiraría todo",
      rq_prioridad: "Que no baje nunca",
      rq_peso: "Más del 50 %",
    });
    const s = puntajePerfil(p);
    expect(s).toMatchObject({ respondidas: 4, sugerido: "Conservador", diferencia: true });
    expect(perfilEfectivo(p)).toBe("Conservador");
  });
  it("arriesgado con experiencia, horizonte largo e ingreso estable", () => {
    const p = ficha("nuevo", {
      rq_experiencia: "Fondos, acciones o bonos",
      reaccion: "Aportaría más",
      rq_prioridad: "Que crezca lo más posible",
      horizonte: "Más de 20 años",
      ingresoEstable: "Estable",
    });
    expect(puntajePerfil(p).sugerido).toBe("Arriesgado");
    expect(perfilEfectivo(ficha("nuevo", { ...p, perfil: "Moderado" }))).toBe("Moderado");
  });
});
