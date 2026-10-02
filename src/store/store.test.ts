import "fake-indexeddb/auto";
import { ficha } from "../domain/test-utils";
import { almacenIndexedDB, almacenMemoria, CLAVE_LOCALSTORAGE } from "./almacen";
import { Store } from "./store";

let n = 0;
const nombreDB = () => "prueba-" + ++n;

describe("store", () => {
  it("guarda de inmediato cada cambio y pone mod", async () => {
    const a = almacenMemoria();
    let t = 100;
    const s = new Store(a, () => t);
    await s.iniciar();
    s.agregar(ficha("nuevo", { id: "a" }));
    t = 200;
    s.actualizar("a", (p) => ({ ...p, nombre: "Ana" }));
    await s.esperarEscrituras();
    expect(a.datos.get("a")).toMatchObject({ nombre: "Ana", mod: 200 });
  });

  it("mod siempre crece aunque el reloj retroceda", async () => {
    let t = 500;
    const s = new Store(almacenMemoria(), () => t);
    await s.iniciar();
    s.agregar(ficha("nuevo", { id: "a" }));
    t = 10;
    s.actualizar("a", (p) => ({ ...p, nombre: "x" }));
    expect(s.get("a")!.mod).toBe(501);
  });

  it("no cambia nada si el cambio devuelve la misma ficha", async () => {
    const s = new Store(almacenMemoria([ficha("nuevo", { id: "a" })]));
    await s.iniciar();
    let avisos = 0;
    s.subscribe(() => avisos++);
    s.actualizar("a", (p) => p);
    expect(avisos).toBe(0);
  });

  it("borrar quita la ficha del dispositivo", async () => {
    const a = almacenMemoria([ficha("nuevo", { id: "a" }), ficha("nuevo", { id: "b" })]);
    const s = new Store(a);
    await s.iniciar();
    s.borrar("a");
    await s.esperarEscrituras();
    expect([...a.datos.keys()]).toEqual(["b"]);
    expect(s.get("a")).toBeUndefined();
  });

  it("si falla el guardado lo avisa, y se recupera en la siguiente escritura", async () => {
    const a = almacenMemoria();
    let falla = true;
    const guardar = a.guardar;
    a.guardar = async (p) => {
      if (falla) throw new Error("disco lleno");
      return guardar(p);
    };
    const s = new Store(a);
    await s.iniciar();
    s.agregar(ficha("nuevo", { id: "a" }));
    await s.esperarEscrituras();
    expect(s.getEstado().errorGuardado).toBe(true);
    expect(s.get("a")).toBeDefined(); // sigue en memoria
    falla = false;
    s.actualizar("a", (p) => ({ ...p, nombre: "x" }));
    await s.esperarEscrituras();
    expect(s.getEstado().errorGuardado).toBe(false);
  });

  it("importar: gana la más reciente por ficha", async () => {
    const a = almacenMemoria([ficha("nuevo", { id: "a", mod: 10, nombre: "vieja" }), ficha("nuevo", { id: "b", mod: 50 })]);
    const s = new Store(a);
    await s.iniciar();
    const r = s.importar([
      ficha("nuevo", { id: "a", mod: 20, nombre: "nueva" }),
      ficha("nuevo", { id: "b", mod: 40 }),
      ficha("cambio", { id: "c", mod: 5 }),
    ]);
    expect(r).toMatchObject({ nuevas: 1, actualizadas: 1, sinCambios: 1 });
    await s.esperarEscrituras();
    expect(a.datos.get("a")!.nombre).toBe("nueva");
    expect(a.datos.get("b")!.mod).toBe(50);
    expect(a.datos.has("c")).toBe(true);
  });
});

describe("IndexedDB", () => {
  it("reabrir: una ficha guardada se vuelve a cargar igual", async () => {
    const nombre = nombreDB();
    const s1 = new Store(almacenIndexedDB(nombre));
    await s1.iniciar();
    s1.agregar(ficha("cambio", { id: "a", motivos: ["red"], red_falta: "cardiólogo" }));
    await s1.esperarEscrituras();
    const s2 = new Store(almacenIndexedDB(nombre));
    await s2.iniciar();
    expect(s2.get("a")).toMatchObject({ tipo: "cambio", motivos: ["red"], red_falta: "cardiólogo" });
  });

  it("borrar en IndexedDB y volver a abrir: no revive", async () => {
    const nombre = nombreDB();
    const s1 = new Store(almacenIndexedDB(nombre));
    await s1.iniciar();
    s1.agregar(ficha("nuevo", { id: "a" }));
    s1.borrar("a");
    await s1.esperarEscrituras();
    const s2 = new Store(almacenIndexedDB(nombre));
    await s2.iniciar();
    expect(s2.get("a")).toBeUndefined();
  });

  it("migra una sola vez lo que había en localStorage (Fase 2)", async () => {
    const guardado = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => guardado.set(k, v),
      removeItem: (k: string) => guardado.delete(k),
    });
    guardado.set(CLAVE_LOCALSTORAGE, JSON.stringify([ficha("nuevo", { id: "vieja", nombre: "De la Fase 2" })]));
    const nombre = nombreDB();
    const fichas = await almacenIndexedDB(nombre).cargar();
    expect(fichas.map((p) => p.nombre)).toEqual(["De la Fase 2"]);
    expect(guardado.has(CLAVE_LOCALSTORAGE)).toBe(false);
    expect(await almacenIndexedDB(nombre).cargar()).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
