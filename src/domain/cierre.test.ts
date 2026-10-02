import {
  conProductos,
  contactoDeReferido,
  docsCierreListos,
  faltaCierre,
  errorDocCierre,
  errorVenta,
  marcarReunionHecha,
  momentoReferidos,
  numeroReunion,
  referidosDe,
  requiereCasoEspecial,
  simularCierre,
  totalMensual,
  ventaExitosa,
} from "./cierre";
import { etapaDe } from "./ficha";
import { ficha, HOY } from "./test-utils";

const prod = (nombre: string, mensual: string, deducible = "") => ({ id: nombre, nombre, mensual, deducible });

describe("etapa automática", () => {
  it("avanza con la gestión: reunión agendada, primera hecha, segunda hecha", () => {
    let p = ficha("nuevo");
    expect(etapaDe(p)).toBe("Primer contacto");
    p = { ...p, gestiones: [{ id: "g", fecha: HOY, ts: 1, resultado: "interesado", resumen: "x", acciones: [] }] };
    expect(etapaDe(p)).toBe("Cuadrar cita");
    p = { ...p, reunion: "2026-10-02T10:00" };
    expect(etapaDe(p)).toBe("Primera reunión");
    p = marcarReunionHecha(p, HOY);
    expect(etapaDe(p)).toBe("Segunda reunión");
    expect(p.reunion).toBe("");
    p = marcarReunionHecha({ ...p, reunion: "2026-10-09T10:00" }, HOY);
    // Tras la segunda sigue en "Segunda reunión" hasta que decide (pre-cierre)
    expect(etapaDe(p)).toBe("Segunda reunión");
    expect(p.reunionesHechas!.map((r) => r.n)).toEqual([1, 2]);
  });

  it("pre-cierre, cerrado y perdido mandan; las etapas viejas se traducen", () => {
    const dos = [
      { n: 1, fecha: HOY },
      { n: 2, fecha: HOY },
    ];
    expect(etapaDe(ficha("nuevo", { etapa: "Pre-cierre", reunionesHechas: dos }))).toBe("Pre-cierre");
    expect(etapaDe(ficha("nuevo", { etapa: "Perdido", reunionesHechas: dos }))).toBe("Perdido");
    expect(etapaDe(ficha("nuevo", { etapa: "Descubrimiento" }))).toBe("Primera reunión");
    expect(etapaDe(ficha("nuevo", { etapa: "Presentado" }))).toBe("Segunda reunión");
    expect(etapaDe(ficha("nuevo", { etapa: "Objeción" }))).toBe("Segunda reunión");
    expect(etapaDe(ficha("nuevo", { etapa: "Nuevo" }))).toBe("Primer contacto");
    // Nunca retrocede por debajo de lo guardado
    expect(etapaDe(ficha("nuevo", { etapa: "Primera reunión" }))).toBe("Primera reunión");
  });
});

describe("reuniones", () => {
  it("dos por cliente; la tercera es un caso especial", () => {
    const p = ficha("nuevo");
    expect(numeroReunion(p)).toBe(1);
    expect(requiereCasoEspecial(p)).toBe(false);
    const dos = marcarReunionHecha(marcarReunionHecha(p, HOY), HOY);
    expect(numeroReunion(dos)).toBe(3);
    expect(requiereCasoEspecial(dos)).toBe(true);
  });
});

describe("referidos", () => {
  it("siempre muestra 3 filas y pide en la primera, si no en la segunda", () => {
    const p = ficha("nuevo", { nombre: "Ana Torres", ciudad: "Quito" });
    expect(referidosDe(p)).toHaveLength(3);
    expect(momentoReferidos(p)).toBe("primera");
    const tras1 = marcarReunionHecha(p, HOY);
    expect(momentoReferidos(tras1)).toBe("segunda");
    const r = (i: number) => ({ id: "r" + i, nombre: "Ref " + i, celular: "09911122" + i + "3", relacion: "Amigo" });
    expect(momentoReferidos({ ...tras1, referidos: [r(1), r(2), r(3)] })).toBe("listos");
  });

  it("el contacto entra a la Base como referido de la persona", () => {
    const p = ficha("nuevo", { nombre: "Ana Torres", ciudad: "Quito" });
    const c = contactoDeReferido(p, { id: "x", nombre: " Luis Paz ", celular: "0991112233", relacion: "Compañero" }, 5);
    expect(c).toMatchObject({ nombre: "Luis Paz", celular: "0991112233", referidor: "Ana Torres", relacion: "Compañero", origen: "Referido", ciudad: "Quito" });
  });
});

describe("pre-cierre y venta", () => {
  it("uno o más productos: el total queda como precio y los nombres como plan", () => {
    const ps = [prod("Plan A", "80", "500"), prod("Complemento", "15,50")];
    expect(totalMensual(ps)).toBe(95.5);
    const p = conProductos(ficha("nuevo"), ps);
    expect(p.precio).toBe("95.5");
    expect(p.plan).toBe("Plan A + Complemento");
  });

  it("venta exitosa pide producto y valor mensual, y pasa a Cerrado con el plan contratado", () => {
    expect(errorVenta(ficha("nuevo"))).toBe("Elige al menos un producto");
    expect(errorVenta(ficha("nuevo", { productos: [prod("Plan A", "")] }))).toBe("Falta el valor a pagar mensual");
    const p = ficha("nuevo", { etapa: "Pre-cierre", productos: [prod("Plan A", "80")] });
    expect(errorVenta(p)).toBe("");
    const v = ventaExitosa(p, HOY);
    expect(etapaDe(v)).toBe("Venta exitosa");
    expect(faltaCierre(v)).toEqual(["Número de contrato", "Fecha de emisión", "Comprobante de pago", "Solicitud o contrato del plan", "Formulario KYC y perfil de riesgo"]);
    const doc = { nombre: "a.pdf", tipo: "application/pdf", bytes: 1 };
    const completo = { ...v, cli_contrato: "SAL-2026-0042A", cli_afiliacion: HOY, docsCierre: { pago: doc, contrato: doc, pre: doc } };
    expect(etapaDe(completo)).toBe("Cerrado");
    expect(faltaCierre(completo)).toEqual([]);
    expect(v.cerradoEn).toBe(HOY);
    expect(v.cli_plan).toBe("Plan A");
  });

  it("la simulación suma esta venta al objetivo del mes y avisa qué desbloquea", () => {
    const cerrada = ficha("nuevo", { id: "a", etapa: "Cerrado", cerradoEn: HOY, precio: "700" });
    const p = ficha("nuevo", { id: "b", etapa: "Pre-cierre", productos: [prod("Plan A", "80")] });
    const s = simularCierre([cerrada, p], p, HOY, [
      { monto: 750, beneficio: true, detalle: "90% de comisión" },
      { monto: 1100, beneficio: true, detalle: "120% de comisión" },
    ]);
    expect(s.hoy.prima).toBe(700);
    expect(s.con.prima).toBe(780);
    expect(s.suma).toBe(80);
    expect(s.desbloquea.map((d) => d.prima)).toEqual([750]);
  });
});

describe("documentos del cierre", () => {
  it("solo JPEG o PDF, y cuenta los que faltan", () => {
    expect(errorDocCierre({ type: "image/jpeg", size: 1000, name: "a.jpg" })).toBe("");
    expect(errorDocCierre({ type: "", size: 1000, name: "contrato.PDF" })).toBe("");
    expect(errorDocCierre({ type: "image/png", size: 1000, name: "a.png" })).toBe("Carga el archivo en JPEG o PDF");
    expect(errorDocCierre({ type: "application/pdf", size: 16 * 1024 * 1024, name: "a.pdf" })).toMatch(/15 MB/);
    const d = docsCierreListos(ficha("nuevo", { docsCierre: { pago: { nombre: "p.pdf", tipo: "application/pdf", bytes: 1 } } }));
    expect(d).toEqual({ hechos: 1, total: 3, faltan: ["Solicitud o contrato del plan", "Formulario KYC y perfil de riesgo"] });
  });
});

describe("productos", () => {
  it("el primer producto vacío tiene un id estable (lo que se escribe no se pierde)", async () => {
    const { productosDe } = await import("./cierre");
    const p = ficha("nuevo");
    expect(productosDe(p)[0].id).toBe(productosDe(p)[0].id);
  });
});

describe("varios planes para la propuesta", () => {
  it("suma sin duplicar, usa la fila vacía y se puede quitar", async () => {
    const { agregarProducto, quitarProducto, tieneProducto, productosDe } = await import("./cierre");
    const { ficha } = await import("./test-utils");
    const a = { id: "a", nombre: "Plan A" };
    const b = { id: "b", nombre: "Plan B" };
    let p = agregarProducto(ficha("nuevo"), a, 80);
    expect(productosDe(p)).toEqual([{ id: "prod-1", planId: "a", nombre: "Plan A", deducible: "", mensual: "80" }]);
    p = agregarProducto(p, b, 45.5);
    p = agregarProducto(p, { id: "otro-id", nombre: "plan a" }, 99);
    expect(productosDe(p).map((x) => x.nombre)).toEqual(["Plan A", "Plan B"]);
    expect(p.precio).toBe("125.5");
    expect(p.plan).toBe("Plan A + Plan B");
    expect(tieneProducto(p, b)).toBe(true);
    p = quitarProducto(p, a);
    expect(productosDe(p).map((x) => x.nombre)).toEqual(["Plan B"]);
    p = quitarProducto(p, b);
    expect(productosDe(p)).toEqual([{ id: "prod-1", nombre: "", deducible: "", mensual: "" }]);
  });
});

describe("valor mensual por recomendación", () => {
  it("usa el del producto, el escrito o el de los documentos; y lo lleva al producto", async () => {
    const { agregarProducto, fijarValorRec, productosDe, valorRecomendado } = await import("./cierre");
    const { ficha } = await import("./test-utils");
    const a = { id: "a", nombre: "Plan A" };
    let p = ficha("nuevo");
    expect(valorRecomendado(p, a, 90)).toBe("90");
    expect(valorRecomendado(p, a, null)).toBe("");
    p = fijarValorRec(p, a, "85");
    expect(valorRecomendado(p, a, 90)).toBe("85");
    expect(productosDe(p)[0].nombre).toBe("");
    p = agregarProducto(p, a, 85);
    p = fijarValorRec(p, a, "82.5");
    expect(productosDe(p)[0].mensual).toBe("82.5");
    expect(p.precio).toBe("82.5");
    expect(valorRecomendado(p, a, 90)).toBe("82.5");
  });
});
