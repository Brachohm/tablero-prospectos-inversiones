import { crearContacto } from "./contactos";
import {
  cola,
  crearGestion,
  desdeContacto,
  desdeFicha,
  errorGestion,
  filtrarGestion,
  gestionables,
  recomendacion,
} from "./gestion";
import {
  contactosDesde,
  detectarColumnas,
  edadDe,
  esDuplicado,
  clavesExistentes,
  filtrarRegistros,
  FILTRO_VACIO,
  leerCSV,
  registros,
} from "./importar";
import { fechaHoyLarga, fraseDelDia, saludoHora } from "./inicio";
import type { Gestion, ResultadoGestion } from "./tipos";
import { ficha } from "./test-utils";

const HOY = "2026-10-07";
const g = (r: ResultadoGestion, resumen = "Conversamos un rato", fecha = "2026-10-01"): Gestion =>
  crearGestion(r, resumen, [], fecha, 1);

describe("Centro de Gestión", () => {
  it("junta contactos activos y prospectos abiertos; deja fuera soltados, cerrados y pasados a ficha", () => {
    const cs = [
      crearContacto({ nombre: "A", celular: "0991" }, 1),
      { ...crearContacto({ nombre: "B" }, 2), soltado: { fecha: HOY, motivo: "x" } },
      { ...crearContacto({ nombre: "C" }, 3), fichaId: "f" },
    ];
    const fs = [
      ficha("nuevo", { id: "p1", nombre: "P1" }),
      ficha("nuevo", { id: "p2", nombre: "P2", etapa: "Cerrado" }),
      ficha("nuevo", { id: "p3", nombre: "P3", soltado: { fecha: HOY, motivo: "x" } }),
    ];
    expect(gestionables(fs, cs).map((x) => x.nombre)).toEqual(["A", "P1"]);
  });

  it("filtra por origen y tipo", () => {
    const gs = [
      desdeContacto(crearContacto({ nombre: "A", origen: "Base de datos" }, 1)),
      desdeContacto(crearContacto({ nombre: "R", referidor: "Luis", relacion: "Amigo" }, 2)),
      desdeFicha(ficha("nuevo", { nombre: "P", origen: "Evento" })),
    ];
    expect(filtrarGestion(gs, { origen: "Referido", tipo: "todos" }).map((x) => x.nombre)).toEqual(["R"]);
    expect(filtrarGestion(gs, { origen: "Todos", tipo: "ficha" }).map((x) => x.nombre)).toEqual(["P"]);
  });

  it("cola: reunión cercana primero, luego nunca gestionados; los de hoy pasan a hechos", () => {
    const reunion = desdeFicha(ficha("nuevo", { id: "r", nombre: "Reunión", reunion: "2026-10-08T10:00", gestiones: [g("reunion")] }));
    const nuevo = desdeContacto(crearContacto({ nombre: "Nuevo" }, 5));
    const viejo = desdeFicha(ficha("nuevo", { id: "v", nombre: "Viejo", gestiones: [g("volver")] }));
    const hoy = desdeFicha(ficha("nuevo", { id: "h", nombre: "Hoy", gestiones: [g("volver", "x", HOY)] }));
    const c = cola([viejo, nuevo, hoy, reunion], HOY);
    expect(c.pendientes.map((x) => x.nombre)).toEqual(["Reunión", "Nuevo", "Viejo"]);
    expect(c.hechos.map((x) => x.nombre)).toEqual(["Hoy"]);
  });

  it("no se puede continuar sin resultado ni resumen", () => {
    expect(errorGestion("Habló conmigo", null)).toBe("Elige cómo terminó la gestión");
    expect(errorGestion("corto", "volver")).toMatch(/resumen/);
    expect(errorGestion("Hablamos 10 minutos", "volver")).toBe("");
  });

  it("recomendación: inicio, cerrar, seguir o soltar", () => {
    const base = ficha("nuevo", { nombre: "Ana" });
    expect(recomendacion(desdeFicha(base), HOY).nivel).toBe("inicio");
    expect(recomendacion(desdeFicha({ ...base, etapa: "Presentado", gestiones: [g("interesado")] }), HOY)).toMatchObject({
      nivel: "cerrar",
      posibilidad: "alta",
    });
    expect(recomendacion(desdeFicha({ ...base, gestiones: [g("no_contesto"), g("no_contesto")] }), HOY)).toMatchObject({
      nivel: "seguir",
    });
    const cinco = Array.from({ length: 5 }, () => g("no_contesto"));
    expect(recomendacion(desdeFicha({ ...base, gestiones: cinco }), HOY).nivel).toBe("soltar");
    expect(recomendacion(desdeFicha({ ...base, gestiones: [g("volver", "Dijo que no le interesa, que no vuelva a llamar")] }), HOY)).toMatchObject({
      nivel: "soltar",
      posibilidad: "nula",
    });
    const precio = recomendacion(desdeFicha({ ...base, gestiones: [g("info", "Le parece caro, quiere ver precio")] }), HOY);
    expect(precio.pasos.some((p) => p.includes("presupuesto"))).toBe(true);
  });
});

describe("Base de datos", () => {
  it("reconoce encabezados con otros nombres y en otra fila", () => {
    const filas = [["Reporte de clientes"], ["Nombres", "Años", "Cantón", "Teléfono celular", "E-mail"], ["Ana Paz", 34, "Quito", "0991234567", "ANA@X.COM"]];
    const d = detectarColumnas(filas);
    expect(d).toEqual({ fila: 1, mapeo: { nombre: 0, edad: 1, ciudad: 2, contacto: 3, correo: 4 } });
    expect(registros(filas, d.fila, d.mapeo, HOY)).toEqual([
      { nombre: "Ana Paz", edad: "34", ciudad: "Quito", contacto: "0991234567", correo: "ana@x.com" },
    ]);
  });

  it("reconoce la columna 'Fecha de nacimiento' como edad", () => {
    expect(detectarColumnas([["Nombre", "Fecha de nacimiento"]]).mapeo).toEqual({ nombre: 0, edad: 1 });
  });

  it("edad desde número o fecha de nacimiento", () => {
    expect(edadDe(40, HOY)).toBe("40");
    expect(edadDe("1990-10-08", HOY)).toBe("35");
    expect(edadDe("07/10/1990", HOY)).toBe("36");
    expect(edadDe("abc", HOY)).toBe("");
  });

  it("CSV con punto y coma y comillas", () => {
    expect(leerCSV('nombre;ciudad\n"Paz, Ana";Quito\r\nLuis;"Gye"\n')).toEqual([
      ["nombre", "ciudad"],
      ["Paz, Ana", "Quito"],
      ["Luis", "Gye"],
    ]);
  });

  it("filtra por ciudad (sin tildes), edad y datos", () => {
    const rs = [
      { nombre: "A", edad: "30", ciudad: "Quito", contacto: "099", correo: "" },
      { nombre: "B", edad: "60", ciudad: "Cuenca", contacto: "", correo: "b@x.co" },
      { nombre: "C", edad: "", ciudad: "quito", contacto: "098", correo: "" },
    ];
    expect(filtrarRegistros(rs, { ...FILTRO_VACIO, ciudad: "QUITO" }).map((r) => r.nombre)).toEqual(["A", "C"]);
    expect(filtrarRegistros(rs, { ...FILTRO_VACIO, edadMin: "50" }).map((r) => r.nombre)).toEqual(["B"]);
    expect(filtrarRegistros(rs, { ...FILTRO_VACIO, conCorreo: true }).map((r) => r.nombre)).toEqual(["B"]);
  });

  it("evita duplicados con la base y dentro del archivo", () => {
    const existentes = clavesExistentes([crearContacto({ nombre: "X", celular: "+593 99 123 4567" }, 1)], []);
    const r = { nombre: "Y", edad: "", ciudad: "", contacto: "0991234567", correo: "" };
    expect(esDuplicado(r, existentes)).toBe(true);
    const cs = contactosDesde([r, { ...r, nombre: "Z" }, { ...r, contacto: "0987654321" }], 1);
    expect(cs.map((c) => [c.nombre, c.origen])).toEqual([
      ["Y", "Base de datos"],
      ["Y", "Base de datos"],
    ]);
  });
});

describe("Inicio", () => {
  it("saludo por hora, fecha larga y una frase por día", () => {
    expect([saludoHora(8), saludoHora(15), saludoHora(22)]).toEqual(["Buenos días", "Buenas tardes", "Buenas noches"]);
    expect(fechaHoyLarga(HOY)).toBe("Miércoles, 7 de octubre de 2026");
    expect(fraseDelDia(HOY, ["a", "b"])).not.toBe(fraseDelDia("2026-10-08", ["a", "b"]));
  });
});
