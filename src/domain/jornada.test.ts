import { crearContacto } from "./contactos";
import { crearGestion } from "./gestion";
import { proveedorEfectivo, usaWeb } from "./herramientas";
import { agregarJornada, recordarInicio, resumenDia, ultimaJornada, type Jornada } from "./jornada";
import { ficha } from "./test-utils";

const HOY = "2026-10-07";

describe("jornada", () => {
  it("resumen del día: gestiones, nuevos, cierres, prima, reuniones de mañana y pendientes", () => {
    const hoyTs = new Date("2026-10-07T15:00:00").getTime();
    const items = [
      ficha("nuevo", { id: "a", creado: hoyTs, gestiones: [crearGestion("interesado", "Le interesa mucho", [], HOY)] }),
      ficha("nuevo", { id: "b", etapa: "Cerrado", cerradoEn: HOY, precio: "120" }),
      ficha("nuevo", { id: "c", reunion: "2026-10-08T10:00" }),
    ];
    const cs = [{ ...crearContacto({ nombre: "X" }, hoyTs), soltado: { fecha: HOY, motivo: "no" } }];
    const r = resumenDia(items, cs, HOY);
    expect(r).toMatchObject({ gestiones: 1, soltados: 1, contactosNuevos: 1, fichasNuevas: 1, cierres: 1, prima: 120, reunionesManana: 1 });
    expect(r.pendientes).toBe(1); // "c" (la "a" ya se gestionó hoy; "b" es cliente)
  });

  it("guarda una jornada por día y recuerda cargar la copia una vez al día", () => {
    const j = (fecha: string): Jornada => ({ fecha, ts: 1, copia: true, resumen: {} as Jornada["resumen"] });
    const js = agregarJornada(agregarJornada([j("2026-10-06")], j(HOY)), { ...j(HOY), copia: false });
    expect(js.map((x) => [x.fecha, x.copia])).toEqual([
      ["2026-10-06", true],
      [HOY, false],
    ]);
    expect(ultimaJornada(js)?.fecha).toBe(HOY);
    expect(recordarInicio(null, HOY)).toBe(true);
    expect(recordarInicio("2026-10-06", HOY)).toBe(true);
    expect(recordarInicio(HOY, HOY)).toBe(false);
  });

  it("en el celular o sin conexión se usan las apps de WhatsApp y de correo", () => {
    expect(usaWeb("web", true)).toBe(false);
    expect(usaWeb("auto", false, true)).toBe(false);
    expect(proveedorEfectivo({ modoWhatsApp: "auto", proveedor: "auto" }, "b@gmail.com", false)).toBe("gmail");
    expect(proveedorEfectivo({ modoWhatsApp: "auto", proveedor: "auto" }, "b@gmail.com", true)).toBe("app");
    expect(proveedorEfectivo({ modoWhatsApp: "auto", proveedor: "gmail", sinConexion: true }, "b@gmail.com", false)).toBe("app");
  });
});
