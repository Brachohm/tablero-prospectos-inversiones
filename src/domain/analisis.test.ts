import { analisisLocal, comparativo, diagLocal, textoResumen, vista } from "./analisis";
import { ficha, HOY } from "./test-utils";
import type { Prospecto } from "./tipos";

const ids = (p: Prospecto) => analisisLocal(p, HOY).recs.map((r) => r.id);

/** Persona asegurada con datos suficientes para opinar. */
const baseCambio = { aseguradora: "Otra", tiempoCon: "6 años", edad: "45", depende: "2 hijos" };

describe("diagnóstico de causa (cambio)", () => {
  it("sin señales: indeterminada", () => {
    const d = diagLocal(ficha("cambio", baseCambio), HOY);
    expect(d.causa?.tipo).toBe("indeterminada");
  });

  it("uso: casi no lo usa y no conoce su cobertura → aún no conviene cambiar", () => {
    const d = diagLocal(ficha("cambio", { ...baseCambio, uso: "Casi no lo usa", conoce: "Más o menos" }), HOY);
    expect(d.puntaje).toEqual({ producto: 0, uso: 3, contratacion: 0 });
    expect(d.causa?.tipo).toBe("uso");
    expect(d.veredicto.nivel).toBe("no_recomendable");
    expect(d.veredicto.titulo).toBe("Aún no conviene cambiar");
  });

  it("contratación: lo eligió por precio y no sabía de los deducibles", () => {
    const d = diagLocal(
      ficha("cambio", {
        ...baseCambio,
        contrato: "Por precio",
        motivos: ["deducibles"],
        ded_sorpresa: "No",
        ded_tope: "Una vez",
      }),
      HOY,
    );
    expect(d.causa?.tipo).toBe("contratacion");
    expect(d.veredicto.nivel).toBe("no_recomendable");
  });

  it("producto: lo usa seguido y le falla, con red y atención", () => {
    const d = diagLocal(
      ficha("cambio", { ...baseCambio, uso: "Lo usa seguido y le falla", motivos: ["red", "atencion"] }),
      HOY,
    );
    expect(d.causa?.tipo).toBe("producto");
    expect(d.veredicto.nivel).toBe("condiciones");
    expect(d.veredicto.titulo).toMatch(/continuidad y preexistencias/);
  });

  it("mixta: empate con 2 o más puntos", () => {
    const d = diagLocal(
      ficha("cambio", { ...baseCambio, uso: "Lo usa seguido y le falla", contrato: "Por precio" }),
      HOY,
    );
    expect(d.puntaje).toEqual({ producto: 2, uso: 0, contratacion: 2 });
    expect(d.causa?.tipo).toBe("mixta");
    expect(d.veredicto.titulo).toBe("Antes de cambiar, corrige lo que no es del producto");
  });

  it("reembolsos trabados por documentos apuntan a uso", () => {
    const d = diagLocal(
      ficha("cambio", {
        ...baseCambio,
        motivos: ["reembolsos"],
        reem_porque: "Falta de documentos",
        reem_proceso: "No",
      }),
      HOY,
    );
    expect(d.puntaje).toMatchObject({ producto: 1, uso: 2 });
    expect(d.causa?.tipo).toBe("uso");
    // hay algo de producto: no es "no recomendable" sino "aclara cómo lo usa"
    expect(d.veredicto.titulo).toBe("Antes de cambiar, aclara cómo lo usa");
  });

  it("con menos de 4 datos: falta información (la etapa no cuenta)", () => {
    const d = diagLocal(ficha("cambio", { uso: "Casi no lo usa", conoce: "No", contrato: "Por precio" }), HOY);
    expect(d.veredicto.nivel).toBe("falta_informacion");
  });

  it("ignora detalles de un motivo que ya no está elegido", () => {
    const p = ficha("cambio", { ...baseCambio, ate_asesor: "No tengo uno", ded_sorpresa: "No" });
    expect(diagLocal(p, HOY).puntaje).toEqual({ producto: 0, uso: 0, contratacion: 0 });
  });
});

describe("costo de oportunidad y señales para no cambiar", () => {
  it("calcula la diferencia de prima mensual y anual sin inventar cifras", () => {
    const d = diagLocal(ficha("cambio", { ...baseCambio, primaActual: "80", precio: "95.5" }), HOY);
    expect(d.costo).toContain(
      "La propuesta cuesta $15.50 más al mes ($186 al año): que el argumento sea lo que deja de perder, no el precio.",
    );
  });

  it("si la propuesta es más barata, advierte que el ahorro no sea la razón", () => {
    const d = diagLocal(ficha("cambio", { ...baseCambio, primaActual: "100", precio: "90" }), HOY);
    expect(d.costo.some((c) => c.startsWith("La propuesta cuesta $10 menos al mes"))).toBe(true);
  });

  it("incluye la estimación propia del evento grave y lo pagado en deducibles", () => {
    const d = diagLocal(
      ficha("cambio", { ...baseCambio, costoEvento: "unos 8 mil, yo", motivos: ["deducibles"], ded_anual: "640" }),
      HOY,
    );
    expect(d.costo.join("\n")).toMatch(/unos 8 mil, yo/);
    expect(d.costo.join("\n")).toMatch(/pagó \$640 el último año/);
  });

  it("siempre tiene las 4 señales fijas; suma pendiente y presupuesto", () => {
    expect(diagLocal(ficha("cambio", baseCambio), HOY).nocambiar).toHaveLength(4);
    const d = diagLocal(
      ficha("cambio", {
        ...baseCambio,
        motivos: ["cobertura", "precio"],
        cob_pendiente: "Sí",
        pre_limite: "100",
        precio: "120",
      }),
      HOY,
    );
    expect(d.nocambiar).toHaveLength(6);
    expect(d.nocambiar[0]).toMatch(/procedimiento o tratamiento pendiente/);
    expect(d.nocambiar.at(-1)).toMatch(/supera lo máximo/);
  });
});

describe("veredicto (nuevo)", () => {
  const baseNuevo = { cobertura: "IESS", depende: "esposa", porque: "nació mi hija" };

  it("falta información con menos de 3 datos", () => {
    expect(diagLocal(ficha("nuevo", { cobertura: "IESS" }), HOY).veredicto.nivel).toBe("falta_informacion");
  });

  it("viable, sin postergar", () => {
    const d = diagLocal(ficha("nuevo", baseNuevo), HOY);
    expect(d.veredicto.nivel).toBe("viable");
    expect(d.causa).toBeNull();
    expect(d.nocambiar).toEqual([]);
  });

  it("criterio precio → viable con condiciones", () => {
    expect(diagLocal(ficha("nuevo", { ...baseNuevo, criterio: "Precio" }), HOY).veredicto.titulo).toBe(
      "Viable, pero elige por cobertura y no solo por precio",
    );
  });

  it("con preexistencias declaradas pasa a 'Viable, con preexistencias por validar'", () => {
    const d = diagLocal(ficha("nuevo", { ...baseNuevo, pre: { t: { corazon: { it: { co_hta: {} } } } } }), HOY);
    expect(d.veredicto).toMatchObject({ nivel: "condiciones", titulo: "Viable, con preexistencias por validar" });
  });

  it("todo lo que depende de SaludSA se marca para validar", () => {
    const d = diagLocal(ficha("nuevo", baseNuevo), HOY);
    expect(d.costo[0]).toMatch(/validar con la aseguradora/);
  });
});

describe("análisis local", () => {
  it("información que falta según el tipo", () => {
    const L = analisisLocal(ficha("nuevo", { cobertura: "IESS" }), HOY);
    expect(L.vacios).toContain("¿Qué lo hizo pensar en contratar ahora?");
    expect(L.vacios).not.toContain("¿Qué cobertura tiene hoy, si alguna?");
    expect(L.vacios).not.toContain("Aseguradora actual");
    // Al inicio no se pide la declaración; cerca de contratar, sí
    expect(L.vacios.join()).not.toMatch(/Declaración de preexistencias/);
    const cerca = analisisLocal(ficha("nuevo", { cobertura: "IESS", etapa: "Pre-cierre" }), HOY);
    expect(cerca.vacios.at(-1)).toBe("Declaración de preexistencias: faltan 16 zonas por revisar");
  });

  it("recordatorios fijos por tipo", () => {
    expect(ids(ficha("nuevo"))).toEqual(["pre", "car", "exc", "tar", "red", "reem", "ini"]);
    expect(ids(ficha("cambio"))).toEqual(["pre", "cont", "vig", "trat", "car", "exc", "tar", "red", "reem", "comp"]);
  });

  it("recordatorios condicionales", () => {
    const p = ficha("nuevo", { edad: "56", depende: "hijos", objecion: "Precio", cobertura: "Tengo iess" });
    expect(ids(p)).toEqual(expect.arrayContaining(["e56", "dep", "opr", "iess"]));
    expect(ids(ficha("nuevo", { edad: "55" }))).not.toContain("e56");
  });

  it("días a la renovación", () => {
    const r = (renovacion: string) => analisisLocal(ficha("cambio", { renovacion }), HOY).recs.find((x) => x.id === "ren")!;
    expect(r("2026-09-20").t).toBe("Renovación ya vencida");
    expect(r("2026-10-30").t).toBe("Renovación en 30 días");
    expect(r("2026-10-30").d).toMatch(/Ventana corta/);
    expect(r("2027-01-30").d).toMatch(/Hay margen/);
  });

  it("lo que quiere evitar sale de los motivos y la objeción", () => {
    const L = analisisLocal(
      ficha("cambio", { motivos: ["precio"], pre_alza: "18", objecion: "Perder antigüedad o carencias" }),
      HOY,
    );
    expect(L.evita).toEqual([
      "Alzas de prima sin explicación ni control (la última fue de 18%)",
      "Perder antigüedad o volver a esperar carencias",
      "Quedarse sin cobertura durante el cambio",
    ]);
  });

  it("preexistencias en tratamiento generan recordatorios", () => {
    const p = ficha("nuevo", { pre: { t: { corazon: { it: { co_hta: { e: "En tratamiento" } } } } } });
    expect(ids(p)).toEqual(expect.arrayContaining(["pdec", "ptx"]));
    expect(analisisLocal(p, HOY).evita).toContain("Que una preexistencia quede excluida sin haberlo sabido");
  });
});

describe("comparativo", () => {
  it("una fila por motivo elegido, y lo de SaludSA dice validar", () => {
    const rows = comparativo(ficha("cambio", { motivos: ["red", "precio"], primaActual: "80", renovacion: "2026-12-01" }));
    expect(rows.map((r) => r[0])).toEqual([
      "Prima mensual",
      "Plan",
      "Lo que le falla y cómo lo resuelve la propuesta",
      "Precio y alzas",
      "Red de médicos y clínicas",
      "Exclusiones, carencias y preexistencias",
      "Antigüedad y continuidad",
      "Vigencia",
    ]);
    expect(rows[0]).toEqual(["Prima mensual", "$80", "Definir con la cotización"]);
    expect(rows.at(-1)![1]).toBe("Renueva el 1 dic 2026");
  });
});

describe("vista del panel", () => {
  it("junta el análisis local y el diagnóstico", () => {
    const v = vista(ficha("cambio", { ...baseCambio, uso: "Casi no lo usa", conoce: "No" }), HOY);
    expect(v.veredicto.titulo).toBe("Aún no conviene cambiar");
    expect(v.causa?.tipo).toBe("uso");
    expect(v.nocambiar).toHaveLength(4);
    expect(v.local.recs.length).toBeGreaterThan(0);
  });

  it("en nuevo no hay causa ni señales para no cambiar", () => {
    const v = vista(ficha("nuevo", { cobertura: "IESS" }), HOY);
    expect(v.causa).toBeNull();
    expect(v.nocambiar).toEqual([]);
  });
});

describe("copiar resumen", () => {
  it("incluye todas las secciones con contenido", () => {
    const t = textoResumen(ficha("cambio", { ...baseCambio, nombre: "Luis", uso: "Casi no lo usa" }), HOY);
    expect(t.startsWith("Análisis para la propuesta · Luis (Persona asegurada)")).toBe(true);
    for (const s of [
      "Recomendación sincera",
      "¿De qué se trata realmente? El uso",
      "Costo de oportunidad: lo que está en juego",
      "Señales para no cambiar",
      "Comparativo (borrador)",
      "No olvides considerar",
      "Información que falta",
    ])
      expect(t).toContain(s);
  });
});
