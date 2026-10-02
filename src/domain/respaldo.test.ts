import { crearArgumento, crearPlan } from "./biblioteca";
import { combinar, crearRespaldo } from "./respaldo";
import { leerRespaldo } from "./respaldo-validar";
import { ficha } from "./test-utils";

describe("copia de seguridad", () => {
  it("ida y vuelta", () => {
    const items = [ficha("nuevo", { id: "a", nombre: "Ana", historial: [] }), ficha("cambio", { id: "b" })];
    const r = leerRespaldo(JSON.stringify(crearRespaldo(items, 123)));
    expect(r).toEqual({ ok: true, fichas: items, planes: [], argumentos: [], contactos: [], ajustes: [], descartadas: 0, fecha: 123 });
  });

  it("lleva planes y argumentos de la biblioteca; descarta los dañados", () => {
    const plan = { ...crearPlan(5), nombre: "Plan A" };
    const arg = crearArgumento(5, { texto: "Hola", etiquetas: ["general"] });
    const r = leerRespaldo(JSON.stringify(crearRespaldo([], 1, { planes: [plan], argumentos: [arg] })));
    expect(r).toMatchObject({ ok: true, planes: [plan], argumentos: [arg], descartadas: 0 });
    const roto = { app: "tablero-prospectos-inversiones", version: 2, fecha: 1, fichas: [], planes: [{ id: "x" }], argumentos: [arg] };
    expect(leerRespaldo(JSON.stringify(roto))).toMatchObject({ ok: true, planes: [], argumentos: [arg], descartadas: 1 });
  });

  it("acepta copias de la versión 1 (sin biblioteca)", () => {
    const r = leerRespaldo(JSON.stringify({ app: "tablero-prospectos-inversiones", version: 1, fecha: 1, fichas: [ficha("nuevo")] }));
    expect(r).toMatchObject({ ok: true, planes: [], argumentos: [] });
  });

  it("rechaza archivos que no son de la app", () => {
    expect(leerRespaldo("no es json")).toMatchObject({ ok: false });
    expect(leerRespaldo(JSON.stringify({ fichas: [] }))).toMatchObject({ ok: false });
    expect(leerRespaldo(JSON.stringify({ app: "tablero-prospectos-inversiones", version: 99, fecha: 1, fichas: [] }))).toMatchObject({
      ok: false,
    });
  });

  it("descarta fichas sin la forma mínima", () => {
    const r = leerRespaldo(
      JSON.stringify({ app: "tablero-prospectos-inversiones", version: 1, fecha: 1, fichas: [ficha("nuevo"), { id: 3 }, null] }),
    );
    expect(r).toMatchObject({ ok: true, descartadas: 2 });
  });

  it("combinar: nuevas, más recientes y sin cambios", () => {
    const r = combinar(
      [ficha("nuevo", { id: "a", mod: 5 }), ficha("nuevo", { id: "b", mod: 9 })],
      [ficha("nuevo", { id: "a", mod: 6 }), ficha("nuevo", { id: "b", mod: 9 }), ficha("nuevo", { id: "c", mod: 1 })],
    );
    expect(r).toMatchObject({ nuevas: 1, actualizadas: 1, sinCambios: 1 });
    expect(r.escribir.map((p) => p.id)).toEqual(["a", "c"]);
  });
});
