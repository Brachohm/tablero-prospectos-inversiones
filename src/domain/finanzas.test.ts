import { ahorroMetaDe, capacidadDe, fondoEmergenciaDe, proyeccionAhorroDe, deudaTarjeta, pesoDeudas, metaRetiroDe, metasDe, montoMeta, perfilEfectivo, puntajePerfil } from "./finanzas";
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

describe("ahorro para la meta (sin rendimiento)", () => {
  it("monto ÷ años que le quedan trabajando, al año y al mes", () => {
    expect(ahorroMetaDe(ficha("nuevo", { edad: "35", edadRetiro: "65", metaMonto: "180000" }))).toEqual({
      monto: 180000,
      edad: 35,
      edadRetiro: 65,
      anios: 30,
      anual: 6000,
      mensual: 500,
    });
  });
  it("sin edad, sin monto o con la edad de retiro ya cumplida: no calcula", () => {
    expect(ahorroMetaDe(ficha("nuevo", { edadRetiro: "65", metaMonto: "100000" }))).toBeNull();
    expect(ahorroMetaDe(ficha("nuevo", { edad: "40", edadRetiro: "65" }))).toBeNull();
    expect(ahorroMetaDe(ficha("nuevo", { edad: "66", edadRetiro: "65", metaMonto: "100000" }))).toBeNull();
  });
});

describe("proyección del ahorro con interés compuesto anual", () => {
  it("su ahorro de hoy crece; el aporte anual cubre lo que falta", () => {
    // 10 años al 5 %: 10.000 → 16.289; faltan 33.711 → aporte anual 2.680 (×1,05^k)
    const x = proyeccionAhorroDe(ficha("nuevo", { edad: "55", edadRetiro: "65", metaMonto: "50000", ahorros: "10000", rendEstimado: "5" }))!;
    expect(x).toMatchObject({ anios: 10, rend: 5, ahorroHoy: 10000, ahorroFuturo: 16289, falta: 33711, anual: 2680, mensual: 223 });
    // El saldo del último año llega a la meta
    expect(x.puntos.at(-1)).toMatchObject({ anio: 10, edad: 65 });
    expect(Math.abs(x.puntos.at(-1)!.saldo - 50000)).toBeLessThanOrEqual(5);
  });
  it("con 0 % de rendimiento es el cálculo simple; si su ahorro ya alcanza, no falta nada", () => {
    expect(proyeccionAhorroDe(ficha("nuevo", { edad: "35", edadRetiro: "65", metaMonto: "180000", rendEstimado: "0" }))).toMatchObject({ anual: 6000, mensual: 500 });
    expect(proyeccionAhorroDe(ficha("nuevo", { edad: "40", edadRetiro: "65", metaMonto: "20000", ahorros: "15000", rendEstimado: "5" }))).toMatchObject({ falta: 0, anual: 0 });
  });
  it("muestra a cuánto llegaría con el aporte que plantea", () => {
    const x = proyeccionAhorroDe(ficha("nuevo", { edad: "35", edadRetiro: "65", metaMonto: "180000", rendEstimado: "0", aporte: "300" }))!;
    expect(x.finalConAporte).toBe(108000);
  });
  it("sin rendimiento escrito no proyecta (queda el cálculo simple)", () => {
    expect(proyeccionAhorroDe(ficha("nuevo", { edad: "35", edadRetiro: "65", metaMonto: "180000" }))).toBeNull();
  });
});

describe("fondo de emergencia (recomendación)", () => {
  it("3 a 6 meses de gastos, o del ingreso si no hay gastos", () => {
    expect(fondoEmergenciaDe(ficha("nuevo", { gastos: "1000" }))).toEqual({ min: 3000, max: 6000, base: "gastos" });
    expect(fondoEmergenciaDe(ficha("nuevo", { ingresoRango: "$1.000 a $2.000" }))).toEqual({ min: 4500, max: 9000, base: "ingreso" });
    expect(fondoEmergenciaDe(ficha("nuevo"))).toBeNull();
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
