import { perfilDe } from "./ajustes";
import { estrategia, informe, textoPostReunion } from "./informe";
import { ficha } from "./test-utils";

// Los saludos dependen de la hora: las pruebas corren a las 10:00 (buenos días).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
});
afterEach(() => vi.useRealTimers());


const HOY = "2026-10-07";
const perfil = perfilDe(undefined);

describe("informe post reunión", () => {
  it("estrategia: regular, única o regular + aporte único", () => {
    expect(estrategia(ficha("nuevo", { aporte: "100" }))).toMatchObject({ tipo: "un plan", titulo: "Un plan de contribución regular" });
    expect(estrategia(ficha("nuevo", { capital: "10000" })).titulo).toBe("Un plan de contribución única");
    const c = estrategia(ficha("nuevo", { aporte: "100", capital: "5000", perfil: "Conservador", emergencia: "No" }));
    expect(c.tipo).toBe("plan + complemento");
    expect(c.complementos.join(" ")).toMatch(/conservadores/);
    expect(c.complementos.join(" ")).toMatch(/fondo de emergencia/);
    expect(c.costoBeneficio.join(" ")).toMatch(/\$100 al mes/);
  });

  it("ya invierte: resumen, análisis, pedidos y pasos", () => {
    const p = ficha("cambio", {
      nombre: "Luis Paz",
      institucion: "Banco X",
      saldoActual: "20000",
      motivos: ["costos"],
      conoce: "No",
      reunion: "2026-10-09T10:30",
      reunionLugar: "su oficina",
    });
    const inf = informe(p, perfil, HOY);
    expect(inf.tipo).toBe("Ya invierte");
    expect(inf.resumen).toContainEqual({ l: "Saldo acumulado", v: "$20.000" });
    expect(inf.analisis).toContain("Lo que hoy no le funciona: comisiones y costos.");
    expect(inf.segunda).toBe("El viernes 9 de octubre a las 10:30 · su oficina");
    expect(inf.pedidos).toHaveLength(2);
    expect(inf.pasos).toContain("No retire ni cancele su inversión actual hasta revisar juntos el costo de salir.");
  });

  it("mensaje: segunda reunión agendada, recordatorio, calificación y (ya invierte) pedidos", () => {
    const p = ficha("cambio", { nombre: "Luis Paz", reunion: "2026-10-09T10:30" });
    const t = textoPostReunion(informe(p, perfil, HOY));
    expect(t).toMatch(/^Hola Luis, buenos días\. Muchas gracias por su tiempo hoy/);
    expect(t).toContain("Nuestra segunda reunión ya quedó agendada: El viernes 9 de octubre a las 10:30. Le enviaré un recordatorio antes.");
    expect(t).toContain("1. Su último estado de cuenta.");
    expect(t).toContain("¿Cómo calificaría la asesoría de hoy, del 1 al 5?");
    expect(t).toMatch(/Bracho, asesor de inversiones$/);
    const nuevo = textoPostReunion(informe(ficha("nuevo", { nombre: "Ana" }), perfil, HOY), false);
    expect(nuevo).not.toContain("estado de cuenta");
    expect(nuevo).not.toMatch(/[⭐📅🙌]/u);
  });
});

describe("informe 1: situación financiera hoy", () => {
  it("nivel con lo que contó", () => {
    const i = informe(
      ficha("nuevo", {
        emergencia: "Sí",
        meta: "Retiro o jubilación",
        metaMonto: "100000",
        horizonte: "Más de 20 años",
        aporte: "200",
        perfil: "Moderado",
        ingreso: "2500",
        gastos: "1200",
        deudaCuota: "100",
        deudaTasa: "Menos de 10 %",
        seguroVida: "Sí, propio",
      }),
      perfil,
      HOY,
    );
    expect(i.proteccion.every((x) => x.estado === "si")).toBe(true);
    expect(i.nivel).toBe(100);
    expect(i.resumen).toContainEqual({ l: "Le queda al mes", v: "$1.200" });
    expect(informe(ficha("nuevo", { emergencia: "No" }), perfil, HOY).proteccion[0].estado).toBe("no");
    expect(informe(ficha("nuevo"), perfil, HOY).riesgos).toBeNull();
  });
});

describe("informe 2: propuesta y objeciones", () => {
  it("productos del pre-cierre, bonos, lo que gana y las respuestas a sus objeciones", async () => {
    const { propuesta, textoPropuesta } = await import("./propuesta");
    const plan = { id: "pl", nombre: "Plan Plus", coberturas: "Hospitalización 100%\nEmergencias", beneficios: "Telemedicina" } as never;
    const p = ficha("nuevo", {
      nombre: "Ana Torres",
      porque: "Nació mi hija",
      ocupacion: "Chofer",
      costoEvento: "Unos $8.000",
      productos: [{ id: "a", planId: "pl", nombre: "Plan Plus", deducible: "500", mensual: "95" }],
      oferta: { bonos: [{ id: "b", t: "Le acompaño en cada reembolso", valor: "300" }] },
      objeciones2: ["dinero", "banco", "no-existe"],
      objecionOtra: "¿Y si me mudo?",
    });
    const arg = { id: "x", titulo: "Una cirugía cuesta más que años de cuotas", texto: "", etiquetas: ["obj:No tengo dinero ahora"], fuente: "", creado: 0, mod: 0 };
    const pr = propuesta(p, perfil, HOY, [plan], [arg]);
    expect(pr.busca).toEqual(["Nació mi hija"]);
    expect(pr.productos).toMatchObject([
      { nombre: "Plan Plus", mensual: 95, deducible: 500, coberturas: ["Hospitalización 100%", "Emergencias"], destacados: [] },
    ]);
    // Bondades tangibles del plan, para el cierre
    expect(pr.productos[0].bondades.map((b) => b.t)).toEqual(["Hospitalización 100%", "Telemedicina"]);
    expect(pr.total).toBe(95);
    expect(pr.oferta.totalBonos).toBe(300);
    expect(pr.oferta.plan).toBe("Plan Plus");
    expect(pr.oferta.inversion).toBe(95);
    expect(pr.gana).toEqual(["Telemedicina"]);
    expect(pr.objeciones.map((o) => o.titulo)).toEqual([
      "¿Con cuánto puedo empezar?",
      "¿En qué se diferencia de una cuenta de ahorros o un plazo fijo?",
      "¿Y si tengo otra duda?",
    ]);
    // Como preguntas frecuentes: nunca nombra la objeción con sus palabras
    expect(JSON.stringify(pr.objeciones)).not.toMatch(/no me alcanza|lo dejo en el banco|me mudo/i);
    expect(pr.objeciones[0].respuesta).toContain("Unos $8.000");
    expect(pr.objeciones[0].apoyo).toBe("Una cirugía cuesta más que años de cuotas");
    expect(pr.pendiente).toBe(false);
    const t = textoPropuesta(pr);
    expect(t).toMatch(/^Hola Ana, buenos días\. Muchas gracias por su tiempo en nuestra segunda reunión/);
    expect(t).toContain("- Plan Plus: $95 al mes");
    expect(t).toContain("¿Cómo calificaría la asesoría de hoy, del 1 al 5?");
    expect(propuesta(ficha("nuevo"), perfil, HOY).pendiente).toBe(true);
  });
});

describe("cambio de seguro: lo que paga hoy vs. lo que pagará", () => {
  it("encuadre de valor: ahorro, igual o inversión", async () => {
    const { comparativo } = await import("./propuesta");
    const a = comparativo(120, 95, ["Hospitalización: 100% (hoy 80%)"], 10);
    expect(a).toMatchObject({ tipo: "ahorro", diferencia: -25, anual: 300, titular: "Paga $25 menos al mes" });
    expect(a.mensaje).toBe("Son $300 al año a su favor y, aun así, tiene 10 coberturas y beneficios concretos.");
    const i = comparativo(80, 95, [], 10);
    expect(i).toMatchObject({ tipo: "inversion", diferencia: 15, porDia: 0.5, titular: "Por $15 más al mes: $0,50 al día" });
    expect(i.mensaje).toContain("se convierte en 10 coberturas y beneficios concretos");
    expect(comparativo(95, 95.4, [], 0)).toMatchObject({ tipo: "igual", titular: "Por lo mismo que paga hoy" });
  });

  it("la propuesta lleva la proyección del plan y su tipo y plazo", async () => {
    const { propuesta, textoPropuesta } = await import("./propuesta");
    const p = ficha("nuevo", {
      nombre: "Ana",
      tipoPlan: "Contribución regular",
      plazo: "10",
      precio: "100",
      productos: [{ id: "a", nombre: "Plan Futuro", deducible: "", mensual: "100" }],
    });
    const pr = propuesta(p, perfil, HOY, [], [], [], { conservador: 0, moderado: 0, optimista: 0 });
    expect(pr.comparativo).toBeNull();
    expect(pr.plan).toEqual({ tipo: "Contribución regular", plazo: 10 });
    expect(pr.proyeccion?.final.moderado).toBe(12000);
    const t = textoPropuesta(pr);
    expect(t).toContain("- Plan Futuro: $100 al mes");
    expect(t).toContain("Plazo: 10 años.");
    expect(t).toMatch(/podría acumular cerca de \$12\.000 en 10 años.*no están garantizados/);
  });

});
