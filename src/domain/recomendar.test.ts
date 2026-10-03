import { crearPlan } from "./biblioteca";
import { condicionesAhorro, condicionesFuturo, docPlan } from "./fixtures-inversion";
import { catalogo, necesidadesDe, recomendar, razones, revisarNecesidad } from "./recomendar";
import { ficha } from "./test-utils";

const general = docPlan("d3", "", ["Condiciones generales de los planes de inversión"], { tipo: "condiciones", nombre: "Condiciones generales" });

describe("recomendar planes de inversión con los PDF", () => {
  it("arma el catálogo con los planes guardados y los que salen solos de los documentos", () => {
    const guardado = { ...crearPlan(1), id: "pl", nombre: "Plan Futuro" };
    const c = catalogo([guardado], [condicionesFuturo, condicionesAhorro, general]);
    expect(c.map((x) => [x.plan.nombre, x.virtual])).toEqual([
      ["Plan Futuro", false],
      ["Plan Ahorro", true],
    ]);
    expect(c[0].docs.map((d) => d.id)).toEqual(["d1"]);
    // El virtual toma su aporte mínimo del PDF
    expect(c[1].plan.precio).toBe("$80");
  });

  it("lee las necesidades de la ficha", () => {
    const p = ficha("nuevo", {
      aporte: "100",
      horizonte: "10 a 20 años",
      emergencia: "No",
      depende: "Dos hijos",
      seguroVida: "No",
      perfil: "Conservador",
      tipoIngreso: "Negocio propio",
    });
    const ns = necesidadesDe(p);
    const id = (x: string) => ns.find((n) => n.id === x);
    expect(id("aporte")).toMatchObject({ peso: 3, por: "Puede aportar $100 al mes" });
    expect(id("liquidez")).toMatchObject({ peso: 3, por: "No tiene fondo de emergencia" });
    expect(id("vida")?.peso).toBe(3);
    expect(id("conservador")?.peso).toBe(3);
    expect(ns.map((n) => n.id)).toEqual(expect.arrayContaining(["plazo", "costos", "extra", "bono"]));
    expect(id("crecimiento")).toBeUndefined();
    // Con capital, aparece el aporte único; ya invierte con motivo de transparencia → estado de cuenta clave
    expect(necesidadesDe(ficha("nuevo", { capital: "10000" })).find((n) => n.id === "unico")?.peso).toBe(3);
    expect(necesidadesDe(ficha("cambio", { motivos: ["transparencia"] })).find((n) => n.id === "estado")?.peso).toBe(3);
  });

  it("recomienda el que respalda lo que necesita, citando el documento y la página", () => {
    const p = ficha("nuevo", { aporte: "100", horizonte: "10 a 20 años", depende: "Su hija", perfil: "Conservador" });
    const [mejor, otro] = recomendar(p, [], [condicionesFuturo, condicionesAhorro]);
    expect(mejor.item.plan.nombre).toBe("Plan Futuro");
    const vida = mejor.revision.find((r) => r.n.id === "vida")!;
    expect(vida.veredicto).toBe("cubre");
    expect(vida.ev?.fuente).toMatch(/Condiciones Plan Futuro, pág\. 1|Condiciones Plan Futuro, págs?\./);
    expect(razones(mejor).join(" ")).toMatch(/Cargo de administración: 1,5% anual/);
    expect(otro.revision.find((r) => r.n.id === "vida")?.veredicto).toBe("?");
  });

  it("si el aporte mínimo del plan es mayor a lo que puede aportar, va al final", () => {
    const p = ficha("nuevo", { aporte: "60" });
    const r = recomendar(p, [], [condicionesFuturo, condicionesAhorro]);
    expect(r.map((x) => [x.item.plan.nombre, x.fueraPresupuesto])).toEqual([
      ["Plan Futuro", false],
      ["Plan Ahorro", true],
    ]);
    expect(r[1].revision.find((x) => x.n.id === "aporte")?.veredicto).toBe("falta");
    expect(r[0].revision.find((x) => x.n.id === "aporte")?.veredicto).toBe("cubre");
  });

  it("lo que el PDF niega cuenta en contra", () => {
    const [item] = catalogo([], [condicionesAhorro]);
    const r = revisarNecesidad(item, { id: "retiros", l: "Retiros parciales", peso: 1, por: "", extra: [] });
    expect(r.veredicto).toBe("falta");
  });

  it("sin documentos ni planes no recomienda nada", () => {
    expect(recomendar(ficha("nuevo"), [], [])).toEqual([]);
  });
});
