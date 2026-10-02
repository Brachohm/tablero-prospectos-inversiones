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
  it("estrategia: individual, familiar, dos planes o con complemento", () => {
    expect(estrategia(ficha("nuevo", { edad: "30" }))).toMatchObject({ tipo: "un plan", titulo: "Un plan individual integral" });
    expect(estrategia(ficha("nuevo", { edad: "35", depende: "Esposa e hijo" })).titulo).toBe("Un plan familiar integral");
    expect(estrategia(ficha("nuevo", { edad: "40", depende: "Mis padres" })).tipo).toBe("dos planes");
    expect(estrategia(ficha("nuevo", { edad: "60", depende: "Dos hijos" })).tipo).toBe("dos planes");
    const c = estrategia(ficha("nuevo", { edad: "30", cobertura: "IESS", criterio: "Precio" }));
    expect(c.tipo).toBe("plan + complemento");
    expect(c.complementos.join(" ")).toMatch(/IESS/);
    expect(c.complementos.join(" ")).toMatch(/alto costo/);
    expect(c.costoBeneficio[0]).toMatch(/deducible/);
  });

  it("cambio de seguro: lo que no incluye su plan, referencia de lo que paga y pedidos", () => {
    const p = ficha("cambio", {
      nombre: "Luis Paz",
      aseguradora: "Otra",
      motivos: ["reembolsos"],
      planActual: { tabla: { prima: "$100", maternidad: "No incluye", odontologia: "No" } },
      reunion: "2026-10-09T10:30",
      reunionLugar: "su oficina",
    });
    const inf = informe(p, perfil, HOY);
    expect(inf.resumen).toContainEqual({ l: "Paga hoy", v: "$100 al mes" });
    expect(inf.analisis).toContain("Su plan actual no incluye: maternidad, odontología.");
    expect(inf.estrategia.complementos).toContain("Cubrir lo que hoy no tiene: maternidad.");
    expect(inf.estrategia.costoBeneficio.join(" ")).toMatch(/lo que paga hoy \(\$100 al mes\)/);
    expect(inf.segunda).toBe("El viernes 9 de octubre a las 10:30 · su oficina");
    expect(inf.pedidos).toHaveLength(2);
    expect(inf.pasos).toContain("Mantenga su póliza actual hasta que la nueva esté vigente.");
  });

  it("no detalla datos de salud en el informe", () => {
    const p = ficha("nuevo", {
      nombre: "Ana",
      preSN: { t: "si" },
      pre: { t: { corazon: { it: { co_hta: { a: "2020", e: "Controlado", t: "Losartán" } } } } },
    });
    const todo = JSON.stringify(informe(p, perfil, HOY));
    expect(todo).toContain("Registramos su declaración de salud");
    expect(todo).not.toMatch(/Losart|hipertens/i);
  });

  it("mensaje: segunda reunión agendada, recordatorio, calificación y (cambio) pedidos", () => {
    const p = ficha("cambio", { nombre: "Luis Paz", reunion: "2026-10-09T10:30" });
    const t = textoPostReunion(informe(p, perfil, HOY));
    expect(t).toMatch(/^Hola Luis, buenos días\. Muchas gracias por su tiempo hoy/);
    expect(t).toContain("Ya estamos trabajando en la mejor propuesta para usted.");
    expect(t).toContain("Nuestra segunda reunión ya quedó agendada: El viernes 9 de octubre a las 10:30. Le enviaré un recordatorio antes.");
    expect(t).toContain("1. El PDF de la tabla de coberturas de su plan actual.");
    expect(t).toContain("2. La sábana de reclamos (su historial de reclamos): puede solicitarla a su asesor o a su aseguradora.");
    expect(t).toContain("¿Cómo calificaría la asesoría de hoy, del 1 al 5?");
    expect(t).toMatch(/Bracho, asesor de inversiones$/);
    const nuevo = textoPostReunion(informe(ficha("nuevo", { nombre: "Ana" }), perfil, HOY), false);
    expect(nuevo).not.toContain("sábana");
    expect(nuevo).not.toMatch(/[⭐📅🙌]/u);
  });
});

describe("informe 1: protección hoy y riesgos de su trabajo", () => {
  it("nivel de protección con lo que contó y riesgos por ocupación", () => {
    const iess = informe(ficha("nuevo", { nombre: "Ana", cobertura: "IESS", ocupacion: "Enfermera" }), perfil, HOY);
    expect(iess.proteccion.every((x) => x.estado === "parcial")).toBe(true);
    expect(iess.nivel).toBe(50);
    expect(iess.riesgos).toMatchObject({ ocupacion: "Enfermera", grupo: "Salud" });
    expect(iess.resumen).toContainEqual({ l: "Ocupación", v: "Enfermera" });
    expect(iess.analisis.join()).toMatch(/Por su trabajo \(enfermera\)/);
    expect(informe(ficha("nuevo", { cobertura: "Ninguna" }), perfil, HOY).nivel).toBe(0);
    const c = informe(ficha("cambio", { planActual: { tabla: { hospitalaria: "80%", emergencias: "100%", ambulatoria: "No incluye" } } }), perfil, HOY);
    expect(c.proteccion.map((x) => x.estado)).toEqual(["si", "si", "no", "?", "?"]);
    expect(c.nivel).toBe(60);
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

  it("la propuesta lo arma con lo que paga hoy y lo que gana (de la comparación y lo anotado)", async () => {
    const { propuesta, textoPropuesta } = await import("./propuesta");
    const plan = { id: "pl", nombre: "Plan Plus", coberturas: "", beneficios: "Telemedicina 24/7 sin costo", tabla: { hospitalaria: "100%", maternidad: "$3.000" } } as never;
    const p = ficha("cambio", {
      nombre: "Luis Paz",
      primaActual: "120",
      gana: "Reembolsos más rápidos",
      planActual: { tabla: { hospitalaria: "80%", maternidad: "No incluye" } },
      productos: [{ id: "prod-1", planId: "pl", nombre: "Plan Plus", deducible: "", mensual: "95" }],
    });
    const pr = propuesta(p, perfil, HOY, [plan]);
    expect(pr.comparativo).toMatchObject({ hoy: 120, nuevo: 95, tipo: "ahorro" });
    expect(pr.comparativo!.ganancias).toEqual(
      expect.arrayContaining(["Hospitalización y cirugía: 100% (hoy 80%)", "Maternidad: $3.000 (hoy no lo tiene)", "Reembolsos más rápidos"]),
    );
    expect(textoPropuesta(pr)).toContain("Frente a lo que paga hoy ($120), son $25 menos al mes");
    // Sin lo que paga hoy, o si no es cambio de seguro, no hay comparativo
    expect(propuesta(ficha("nuevo", { productos: p.productos }), perfil, HOY, [plan]).comparativo).toBeNull();
  });
});
