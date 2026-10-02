import "fake-indexeddb/auto";
import { crearArgumento, crearPlan, type Documento } from "../domain/biblioteca";
import { almacenBibliotecaIndexedDB, almacenBibliotecaMemoria, Biblioteca } from "./biblioteca";

const doc = (id: string): Documento => ({
  id,
  nombre: "Condiciones",
  tipo: "condiciones",
  plan: "",
  paginas: ["texto"],
  archivo: true,
  bytes: 3,
  creado: 1,
  mod: 1,
});

describe("Biblioteca (store)", () => {
  it("guarda, edita y borra planes; mod siempre crece", async () => {
    let t = 100;
    const alm = almacenBibliotecaMemoria();
    const b = new Biblioteca(alm, () => t);
    await b.iniciar();
    const p = { ...crearPlan(1), nombre: "A" };
    await b.guardar("planes", p);
    t = 50; // el reloj retrocede
    await b.guardar("planes", { ...p, nombre: "B" });
    const [g] = b.getEstado().planes;
    expect(g.nombre).toBe("B");
    expect(g.mod).toBe(101);
    expect((await alm.cargar()).planes[0].nombre).toBe("B");
    await b.borrar("planes", p.id);
    expect(b.getEstado().planes).toEqual([]);
    expect((await alm.cargar()).planes).toEqual([]);
  });

  it("documentos con su archivo; borrar el documento borra el archivo", async () => {
    const alm = almacenBibliotecaMemoria();
    const b = new Biblioteca(alm);
    await b.iniciar();
    await b.agregarDoc(doc("d1"), new Blob(["pdf"]));
    expect(await (await b.archivo("d1"))?.text()).toBe("pdf");
    await b.borrar("docs", "d1");
    expect(alm.archivos.size).toBe(0);
  });

  it("importar: gana el más reciente por elemento", async () => {
    const b = new Biblioteca(almacenBibliotecaMemoria());
    await b.iniciar();
    const a = crearArgumento(10, { id: "a", texto: "local" });
    await b.guardar("argumentos", a);
    const mod = b.getEstado().argumentos[0].mod;
    const n = b.importar({
      argumentos: [
        { ...a, texto: "viejo", mod: mod - 1 },
        crearArgumento(5, { id: "nuevo", texto: "otro" }),
      ],
    });
    await b.esperarEscrituras();
    expect(n).toBe(1);
    expect(b.getEstado().argumentos.map((x) => x.texto).sort()).toEqual(["local", "otro"]);
  });

  it("IndexedDB: persiste y vuelve a cargar", async () => {
    const alm = almacenBibliotecaIndexedDB("prueba-bib");
    const b = new Biblioteca(alm);
    await b.iniciar();
    await b.agregarDoc(doc("d2"), new Blob(["x"]));
    await b.guardar("planes", { ...crearPlan(1), nombre: "P" });
    const b2 = new Biblioteca(almacenBibliotecaIndexedDB("prueba-bib"));
    await b2.iniciar();
    expect(b2.getEstado().docs.map((d) => d.id)).toEqual(["d2"]);
    expect(b2.getEstado().planes[0].nombre).toBe("P");
    await b2.borrar("docs", "d2");
    expect(await b2.archivo("d2")).toBeUndefined();
  });
});
