import { argumentosDelSistema, etiquetasDeTexto } from "./aprender";
import { crearPlan, type Documento } from "./biblioteca";
import { ficha } from "./test-utils";

const plan = (nombre: string, extra: Record<string, unknown> = {}) => ({ ...crearPlan(1), id: nombre, nombre, ...extra });

describe("argumentos del sistema", () => {
  it("etiquetas por palabras", () => {
    expect(etiquetasDeTexto("Tabla de rescates sin penalidad")).toEqual(["mot:liquidez"]);
    expect(etiquetasDeTexto("Educación de los hijos")).toEqual(["familia"]);
    expect(etiquetasDeTexto("Algo cualquiera")).toEqual(["general"]);
  });

  it("beneficios exclusivos y el mejor de cada concepto", () => {
    const a = plan("Plus", { beneficios: "Asesor personal 24/7\nEstado de cuenta en línea", tabla: { admin: "1,2%", vida: "$40.000" } });
    const b = plan("Básico", { beneficios: "Estado de cuenta en línea", tabla: { admin: "2%", vida: "$20.000" } });
    const args = argumentosDelSistema([a, b], [], []);
    const ex = args.filter((x) => x.origen === "exclusivo");
    expect(ex.map((x) => x.titulo)).toEqual(["Solo Plus incluye: Asesor personal 24/7"]);
    expect(ex[0].etiquetas).toContain("mot:atencion");
    const mejor = args.filter((x) => x.origen === "mejor").map((x) => x.texto);
    expect(mejor).toContain("Cargo de administración: 1,2% con Plus, el más bajo entre los planes que manejo.");
    expect(mejor).toContain("Cobertura por fallecimiento: $40.000 con Plus, el más alto entre los planes que manejo.");
    // Honestidad: siempre con fuente y "validar con la aseguradora"
    expect(args.every((x) => x.fuente.endsWith("validar con la aseguradora"))).toBe(true);
  });

  it("aprende de las comparaciones con planes actuales de clientes", () => {
    const a = plan("Plus", { tabla: { vida: "$20.000", admin: "1,5%" } });
    const cliente = (id: string) => ficha("cambio", { id, planActual: { tabla: { vida: "No incluye", admin: "3%" } } });
    const args = argumentosDelSistema([a], [], [cliente("c1"), cliente("c2"), ficha("cambio", { id: "c3" })]);
    const comp = args.filter((x) => x.origen === "comparaciones").map((x) => x.texto);
    expect(comp).toContain(
      "En 2 de 2 planes actuales que revisé, cobertura por fallecimiento no estaba incluido. Vale la pena revisar si el suyo lo tiene.",
    );
    expect(comp).toContain("En 2 comparaciones con planes actuales de clientes, Plus mejoró cargo de administración.");
  });

  it("toma frases positivas de los documentos (no las exclusiones)", () => {
    const d: Documento = {
      id: "d1",
      nombre: "Anexo Plus",
      tipo: "anexo",
      plan: "Plus",
      paginas: [
        "Introducción. El plan incluye una cobertura por fallecimiento del 100% del saldo acumulado. No permite retiros parciales durante los primeros dos años.",
      ],
      archivo: false,
      bytes: 0,
      creado: 1,
      mod: 1,
    };
    const args = argumentosDelSistema([], [d], []);
    expect(args.map((x) => x.texto)).toEqual(["«El plan incluye una cobertura por fallecimiento del 100% del saldo acumulado.»"]);
    expect(args[0].fuente).toBe("Anexo Plus, pág. 1 · validar con la aseguradora");
  });

  it("no inventa: sin material, no hay argumentos", () => {
    expect(argumentosDelSistema([plan("Único", { beneficios: "Algo" })], [], [])).toEqual([]);
  });
});
