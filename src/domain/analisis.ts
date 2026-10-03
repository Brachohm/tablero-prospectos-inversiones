/**
 * Análisis local: determinista, sin IA y siempre disponible.
 * Portado del prototipo (`analisisLocal`, `diagLocal`, `comparativo`, `copiar`).
 * Es el único análisis de la app: todo se calcula en el dispositivo.
 * Nunca inventa cifras: solo usa lo que está en la ficha.
 */
import { EDAD_MAYOR, MISIONES, TIPOS } from "../config/ficha";
import { VALIDAR } from "../config/saludsa";
import { CAMPO, campoActivo, esCambio, num, tieneMotivo, tipoDe, txt, vacio } from "./ficha";
import { diasHasta, fmtFecha, hoyISO, usd } from "./fechas";
import { contarDatos } from "./datos";
import { ahorroMetaDe, capacidadDe, DEUDA_ALTA_PCT, deudaTarjeta, metasDe, montoMeta, pesoDeudas, puntajePerfil } from "./finanzas";
import type { Causa, NivelVeredicto, Prospecto, TipoCausa, Veredicto } from "./tipos";

export interface Recordatorio {
  id: string;
  t: string;
  d: string;
}

export interface AnalisisLocal {
  /** Información que falta (etiquetas). */
  vacios: string[];
  busca: string[];
  evita: string[];
  recs: Recordatorio[];
}

export const NIVEL_INFO: Record<NivelVeredicto, { ic: string; l: string }> = {
  viable: { ic: "✅", l: "Viable" },
  condiciones: { ic: "⚠️", l: "Viable con condiciones" },
  no_recomendable: { ic: "⛔", l: "Aún no conviene" },
  falta_informacion: { ic: "❔", l: "Falta información" },
};

export const CAUSA_L: Record<TipoCausa, string> = {
  producto: "El producto",
  uso: "El uso",
  contratacion: "La contratación",
  mixta: "Una mezcla",
  indeterminada: "Aún sin definir",
};

/** Objeción → lo que quiere evitar. */
export const MAP_OBJ: Readonly<Record<string, string>> = {
  "No tengo dinero ahora": "Comprometer un aporte que no puede sostener",
  "Lo tengo que pensar": "Decidir con prisa o sin toda la información",
  "Desconfío de las inversiones": "Perder su dinero o no entender dónde está",
  "Ya tengo ahorros": "Duplicar esfuerzos sin un plan claro",
};

const CLAVES_CAMBIO = [
  "institucion", "producto", "tiempoCon", "saldoActual", "motivos", "grieta", "conoce", "noPerder",
  "depende", "edad", "meta", "horizonte", "aporte", "perfil", "reaccion", "emergencia", "objecion",
  "ingresoRango", "gastos",
];
const CLAVES_NUEVO = [
  "ahorroHoy", "porque", "depende", "edad", "meta", "horizonte", "aporte", "perfil", "reaccion",
  "emergencia", "costoEvento", "objecion", "ingresoRango", "gastos", "tipoIngreso",
];

function usdCampo(p: Prospecto, k: string): string {
  const n = num(p, k);
  return n === null ? txt(p, k) : usd(n);
}

/** Años de horizonte (punto medio del rango elegido), o null. */
export function aniosHorizonte(p: Prospecto): number | null {
  const h: Record<string, number> = {
    "Menos de 3 años": 2,
    "3 a 5 años": 4,
    "5 a 10 años": 7,
    "10 a 20 años": 15,
    "Más de 20 años": 25,
  };
  return h[txt(p, "horizonte")] ?? ahorroMetaDe(p)?.anios ?? null;
}

/** Perfil de riesgo coherente: lo que dice y cómo reaccionaría a una caída. */
export function perfilIncoherente(p: Prospecto): boolean {
  const pf = txt(p, "perfil");
  const r = txt(p, "reaccion");
  return ((pf === "Arriesgado" || pf === "Moderado") && r === "Retiraría todo") || puntajePerfil(p).diferencia;
}

export function esMayor(p: Prospecto): boolean {
  const e = num(p, "edad");
  return e !== null && e >= EDAD_MAYOR;
}

export function analisisLocal(p: Prospecto, hoy: string = hoyISO()): AnalisisLocal {
  const ck = esCambio(p);
  const claves = [...(ck ? CLAVES_CAMBIO : CLAVES_NUEVO)];
  if (ck) {
    for (const m of MISIONES) for (const c of m.campos) if (c.motivo && campoActivo(c, p)) claves.push(c.k);
  }
  const vacios = claves.filter((k) => vacio(p, k)).map((k) => CAMPO[k].l);
  const busca: string[] = [];
  const evita: string[] = [];
  const recs: Recordatorio[] = [];
  const anios = aniosHorizonte(p);

  const metas = metasDe(p);
  for (const m of metas)
    busca.push(
      (m.prioridad === 1 ? "Llegar a su meta: " : `Meta ${m.prioridad}: `) +
        m.meta.toLowerCase() +
        (m.monto ? ` (${usd(m.monto)})` : "") +
        (m.plazo ? `, en ${m.plazo.toLowerCase()}` : ""),
    );
  if (!vacio(p, "porque") && !ck) busca.push("Invertir ahora porque: " + txt(p, "porque"));
  if (!vacio(p, "depende")) busca.push("Dejar respaldo a quienes dependen de él o ella: " + txt(p, "depende"));
  if (ck && !vacio(p, "grieta")) busca.push("Resolver lo que hoy le falla: " + txt(p, "grieta"));
  if (esMayor(p)) busca.push("Proteger lo acumulado y prepararse para el retiro");
  if (!vacio(p, "perfil") && txt(p, "perfil") !== "No sabe")
    busca.push(`Una estrategia acorde a un perfil ${txt(p, "perfil").toLowerCase()}`);

  if (ck) {
    if (tieneMotivo(p, "rendimiento"))
      evita.push(
        "Que su dinero rinda menos de lo esperado" +
          (!vacio(p, "ren_tasa") ? ` (hoy recibe ${txt(p, "ren_tasa")}% al año)` : ""),
      );
    if (tieneMotivo(p, "costos")) evita.push("Pagar comisiones y costos que no conoce");
    if (tieneMotivo(p, "liquidez"))
      evita.push("Quedar atrapado sin poder usar su dinero" + (!vacio(p, "liq_penal") ? ` (penalidad: ${txt(p, "liq_penal")})` : ""));
    if (tieneMotivo(p, "transparencia")) evita.push("No saber cómo va su inversión");
    if (tieneMotivo(p, "riesgo")) evita.push("Ver caídas en su saldo que no esperaba");
    if (tieneMotivo(p, "atencion")) evita.push("Quedarse sin asesor que le dé seguimiento");
    if (!vacio(p, "grieta")) evita.push("Repetir lo que hoy le falla: " + txt(p, "grieta"));
    evita.push("Perder aportes o bonos por salir antes de tiempo");
  }
  const obj = MAP_OBJ[txt(p, "objecion")];
  if (obj) evita.push(obj);
  if (txt(p, "reaccion") === "Retiraría todo") evita.push("Ver su inversión bajar, aunque sea temporalmente");

  // Recordatorios fijos
  recs.push({
    id: "perf",
    t: "Perfil de riesgo",
    d: "Aplica el cuestionario de perfil de riesgo y deja por escrito que el plan propuesto es coherente con él.",
  });
  recs.push({
    id: "rend",
    t: "Rendimientos no garantizados",
    d: "En un unit linked el valor depende de los fondos elegidos: muestra escenarios, no promesas, y aclara que rendimientos pasados no garantizan los futuros.",
  });
  recs.push({
    id: "cost",
    t: "Costos del plan",
    d: `Explica cargos de administración, de cobertura y de rescate anticipado antes de la firma (${VALIDAR}).`,
  });
  recs.push({
    id: "resc",
    t: "Rescates y permanencia",
    d: "Aclara desde cuándo puede retirar sin penalidad y qué pasa si deja de aportar.",
  });
  recs.push({
    id: "kyc",
    t: "Conocimiento del cliente (KYC)",
    d: "Cédula, origen de fondos y formulario de conocimiento del cliente completos antes de emitir.",
  });
  if (ck)
    recs.push({
      id: "comp",
      t: "Comparativo lado a lado",
      d: "Arma su inversión actual frente a tu propuesta: rendimiento neto, costos, liquidez y plazo.",
    });
  if (ck)
    recs.push({
      id: "sal",
      t: "Costo de salir de su inversión actual",
      d: "Antes de mover dinero, calcula la penalidad por rescate y los bonos que perdería. A veces conviene mantenerla y empezar un plan nuevo en paralelo.",
    });

  // Condicionales
  if (txt(p, "emergencia") === "No")
    recs.push({
      id: "emer",
      t: "Sin fondo de emergencia",
      d: "Primero un fondo de emergencia de 3 a 6 meses: si no, cualquier imprevisto lo obliga a rescatar con penalidad.",
    });
  if (!vacio(p, "deudas"))
    recs.push({
      id: "deu",
      t: "Tiene deudas",
      d: "Si paga tasas altas (tarjetas), conviene ordenar esa deuda antes de comprometer un aporte grande.",
    });
  const pp = puntajePerfil(p);
  if (pp.diferencia)
    recs.push({
      id: "inco",
      t: "Perfil declarado vs. cuestionario",
      d: `Se describe ${pp.declarado.toLowerCase()}, pero sus respuestas apuntan a ${pp.sugerido!.toLowerCase()}: usa el más prudente y conversa con él o ella la diferencia.`,
    });
  else if (perfilIncoherente(p))
    recs.push({
      id: "inco",
      t: "Perfil declarado vs. reacción",
      d: `Se describe ${txt(p, "perfil").toLowerCase()} pero retiraría todo ante una caída: trátalo como conservador hasta aclararlo.`,
    });
  const cap = capacidadDe(p);
  if (cap && (cap.nivel === "exigente" || cap.nivel === "no_alcanza"))
    recs.push({
      id: "capa",
      t: cap.nivel === "no_alcanza" ? "El aporte no le alcanza" : "Aporte exigente para su flujo",
      d: `Le quedan ${usd(cap.sobrante)} al mes y el aporte es de ${usd(cap.aporte!)}. Un aporte cómodo sería de hasta ${usd(cap.comodo)}: mejor poco y constante que mucho y cancelado.`,
    });
  const pd = pesoDeudas(p);
  if ((pd !== null && pd > DEUDA_ALTA_PCT) || deudaTarjeta(p))
    recs.push({
      id: "dcar",
      t: pd !== null && pd > DEUDA_ALTA_PCT ? `Las deudas se llevan el ${pd} % de su ingreso` : "Tiene deudas de tarjeta",
      d: "Ordenar esas deudas primero suele rendirle más que cualquier fondo. Proponle un plan para bajarlas y un aporte menor mientras tanto.",
    });
  if (txt(p, "seguroVida") === "No" && !vacio(p, "depende"))
    recs.push({
      id: "svid",
      t: "Sin seguro de vida y con dependientes",
      d: `Muestra la cobertura de vida del plan: protege a ${txt(p, "depende")} si algo le pasa durante el plazo (${VALIDAR} la suma asegurada).`,
    });
  if (txt(p, "iess") === "Sí" || txt(p, "iess") === "Voluntario")
    recs.push({
      id: "iess",
      t: "Aporta al IESS",
      d: "Posiciona el plan como complemento de su jubilación del IESS, no como reemplazo.",
    });
  if (txt(p, "tipoIngreso") === "Independiente o profesional" || txt(p, "tipoIngreso") === "Negocio propio" || txt(p, "ingresoEstable") === "Muy variable")
    recs.push({
      id: "ivar",
      t: "Ingreso independiente o variable",
      d: "Propón un aporte base que pueda sostener en los meses flojos y aportes extra cuando le vaya bien.",
    });
  if (txt(p, "malaExp").startsWith("Sí"))
    recs.push({
      id: "malx",
      t: "Tuvo una mala experiencia",
      d: "Escucha qué pasó y muestra, punto por punto, qué será distinto esta vez antes de hablar del producto.",
    });
  if (!vacio(p, "decideCon") && !/^nadie/i.test(txt(p, "decideCon")))
    recs.push({
      id: "deci",
      t: "Decide con alguien más",
      d: `Invita a ${txt(p, "decideCon")} a la segunda reunión: así nadie decide con información a medias.`,
    });
  if (txt(p, "metaFlex") === "Es indispensable: tiene que llegar")
    recs.push({
      id: "mind",
      t: "Meta indispensable",
      d: "Arma la propuesta con el escenario conservador: si la meta tiene que llegar, no cuentes con el optimista.",
    });
  if (txt(p, "fuenteUnico") && !vacio(p, "capital"))
    recs.push({
      id: "orig",
      t: "Origen del aporte único",
      d: `Viene de: ${txt(p, "fuenteUnico").toLowerCase()}. Pide el respaldo para el KYC (origen de fondos) desde ya.`,
    });
  if (anios !== null && anios < 5)
    recs.push({
      id: "hcor",
      t: "Horizonte corto",
      d: "Con menos de 5 años, un plan de largo plazo con cargos de rescate puede no convenir. Sé honesto con eso.",
    });
  if (esMayor(p))
    recs.push({
      id: "e50",
      t: `Edad ${EDAD_MAYOR}+`,
      d: "Menos tiempo para recuperarse de caídas y la cobertura de vida cuesta más: prioriza fondos conservadores y revisa el costo del seguro dentro del plan.",
    });
  if (!vacio(p, "depende"))
    recs.push({
      id: "dep",
      t: "Hay dependientes",
      d: "Define beneficiarios y revisa la suma asegurada por fallecimiento del plan.",
    });
  if (txt(p, "objecion") === "No tengo dinero ahora")
    recs.push({
      id: "odin",
      t: "Objeción: no tengo dinero",
      d: "Revisa su flujo con él o ella y propone un aporte pequeño y sostenible. Mejor poco y constante que mucho y cancelado.",
    });
  if (txt(p, "objecion") === "Desconfío de las inversiones")
    recs.push({
      id: "odes",
      t: "Objeción: desconfianza",
      d: "Muestra quién emite el plan, cómo está regulado en Ecuador y cómo consultará su estado de cuenta.",
    });
  const ap = num(p, "precio") ?? num(p, "aporte");
  const am = ahorroMetaDe(p);
  if (am && ap !== null && ap > 0 && ap < am.mensual)
    recs.push({
      id: "bmeta",
      t: "El aporte no llega a su meta",
      d: `Para juntar ${usd(am.monto)} en ${am.anios} años necesita ahorrar ~${usd(am.mensual)} al mes (${usd(am.anual)} al año) sin contar rendimiento; hoy plantea ${usd(ap)}. Ajusta aporte, edad de retiro o meta.`,
    });
  const meta = am ? null : montoMeta(p);
  if (meta !== null && ap !== null && anios !== null && ap > 0) {
    const sinRend = ap * 12 * anios;
    if (sinRend < meta * 0.6)
      recs.push({
        id: "brec",
        t: "La meta y el aporte no cuadran",
        d: `Aportando ${usd(ap)} al mes durante ~${anios} años junta ${usd(sinRend)} sin contar rendimiento; su meta es ${usd(meta)}. Ajusta aporte, plazo o meta sin prometer rendimientos.`,
      });
  }
  if (ck && !vacio(p, "vencimiento")) {
    const n = diasHasta(txt(p, "vencimiento"), hoy);
    if (n < 0)
      recs.push({ id: "venc", t: "Plazo ya vencido", d: `Venció hace ${-n} días: confirma dónde está ese dinero hoy.` });
    else if (n <= 60)
      recs.push({
        id: "venc",
        t: `Vence en ${n} días`,
        d: "Buen momento para mover el dinero sin penalidad: prepara la propuesta antes de que lo renueve.",
      });
    else recs.push({ id: "venc", t: `Vence en ${n} días`, d: "Hay margen para comparar con calma." });
  }
  return { vacios, busca, evita, recs };
}

export interface Diagnostico {
  veredicto: Veredicto;
  /** Solo en fichas `cambio`. */
  causa: Causa | null;
  /** Puntaje por origen (solo `cambio`), útil para explicar y probar. */
  puntaje: { producto: number; uso: number; contratacion: number } | null;
  costo: string[];
  nocambiar: string[];
}

type Origen = "producto" | "uso" | "contratacion";

export function diagLocal(p: Prospecto, hoy: string = hoyISO()): Diagnostico {
  const nDatos = contarDatos(p);
  const costo: string[] = [];
  const anios = aniosHorizonte(p);
  const ap = num(p, "aporte");

  if (tipoDe(p) === "cambio") {
    const sc: Record<Origen, number> = { producto: 0, uso: 0, contratacion: 0 };
    const sg: Record<Origen, string[]> = { producto: [], uso: [], contratacion: [] };
    const add = (t: Origen, n: number, s: string) => {
      sc[t] += n;
      sg[t].push(s);
    };
    const v = (k: string) => txt(p, k);
    const has = (m: Parameters<typeof tieneMotivo>[1]) => tieneMotivo(p, m);

    if (has("rendimiento")) {
      const r = num(p, "ren_tasa");
      const e = num(p, "ren_esperado");
      if (r !== null && e !== null && e > r * 2 && e > 8)
        add("contratacion", 2, "esperaba un rendimiento poco realista para su producto");
      else add("producto", 2, "su inversión rinde menos de lo que necesita");
    }
    if (has("costos")) {
      if (v("cos_sabe") === "No" || v("cos_sabe") === "Más o menos")
        add("contratacion", 2, "no le explicaron los costos al contratar");
      else add("producto", 1, "conoce los costos y le parecen altos");
    }
    if (has("liquidez")) {
      if (v("liq_necesita") === "Varias veces") add("uso", 2, "ha necesitado retirar varias veces: le faltó un fondo de emergencia");
      else add("contratacion", 1, "el plazo o la penalidad no se ajustaban a su necesidad");
    }
    if (has("transparencia")) {
      if (v("tra_informe") === "Nunca" || v("tra_informe") === "Una vez al año")
        add("producto", 2, "casi no recibe información de su inversión");
      else add("uso", 1, "recibe estados de cuenta pero no le quedan claros");
    }
    if (has("riesgo")) {
      if (txt(p, "reaccion") === "Retiraría todo" || txt(p, "perfil") === "Conservador")
        add("contratacion", 2, "tiene un perfil conservador en un producto con volatilidad");
      else add("producto", 1, "su queja incluye la volatilidad");
    }
    if (has("atencion") && (v("ate_asesor") === "Responde poco" || v("ate_asesor") === "No tengo uno"))
      add("producto", 1, "no tiene un asesor que lo acompañe");
    if (v("conoce") === "No") add("contratacion", 1, "no sabe en qué está invertido su dinero");
    if (v("conoce") === "Más o menos") add("uso", 1, "conoce a medias su inversión");
    const tc = v("tiempoCon").toLowerCase();
    if (/\b(meses|1 año|un año|2 años|dos años)\b/.test(tc) && has("rendimiento"))
      add("uso", 1, "lleva poco tiempo: los planes de largo plazo rinden con los años");

    const ord = (Object.keys(sc) as Origen[]).sort((a, b) => sc[b] - sc[a]);
    const [top, sec] = ord;
    let causa: Causa;
    if (sc[top] === 0) {
      causa = {
        tipo: "indeterminada",
        explicacion:
          "Aún no hay datos para distinguir si el problema es del producto, del uso o de cómo se contrató. Completa los motivos, si conoce su inversión y cuánto tiempo lleva.",
      };
    } else if (sc[sec] >= 2 && sc[top] === sc[sec]) {
      causa = {
        tipo: "mixta",
        explicacion:
          "Hay señales de más de un origen: " +
          ord
            .filter((t) => sc[t] > 0)
            .map((t) => `${CAUSA_L[t].toLowerCase()} (${sg[t].join(", ")})`)
            .join("; ") +
          ".",
      };
    } else {
      causa = { tipo: top, explicacion: "Señales en la ficha: " + sg[top].join("; ") + "." };
    }

    const t = causa.tipo;
    let veredicto: Veredicto;
    if (nDatos < 4) {
      veredicto = {
        nivel: "falta_informacion",
        titulo: "Aún no hay base para opinar",
        razon: "Completa el motivo de inconformidad, su meta, su horizonte y si conoce su inversión actual.",
      };
    } else if ((t === "uso" || t === "contratacion") && sc.producto === 0) {
      veredicto = {
        nivel: "no_recomendable",
        titulo: "Aún no conviene mover su dinero",
        razon: `El problema apunta más a ${t === "uso" ? "cómo lo está usando" : "cómo se contrató"} que al producto. Rescatar con penalidad para repetir lo mismo en otro lado no le sirve. Puede convenir mantenerla y abrir un plan nuevo para su meta.`,
      };
    } else if (t === "producto") {
      veredicto = {
        nivel: "condiciones",
        titulo: "Cambio viable si el costo de salir lo justifica",
        razon: "Hay señales de que el producto no le responde. Calcula penalidades y bonos que perdería: si el costo de salir es alto, considera dejar de aportar ahí y empezar el plan nuevo sin rescatar.",
      };
    } else {
      veredicto = {
        nivel: "condiciones",
        titulo: "Antes de cambiar, aclara el origen del problema",
        razon: "Hay señales del producto, pero también del uso o de la contratación. Corrige eso primero para no repetirlo en el plan nuevo.",
      };
    }

    costo.push(
      "Si no se ajusta: sigue con lo que hoy le falla" +
        (!vacio(p, "grieta") ? ` (${txt(p, "grieta")})` : "") +
        ", y el tiempo perdido no se recupera en una inversión.",
    );
    if (!vacio(p, "noPerder")) costo.push(`En riesgo si cambia sin calcular: ${txt(p, "noPerder")}.`);
    else costo.push(`Si rescata antes de tiempo, puede pagar penalidades o perder bonos de permanencia (${VALIDAR}).`);
    const r = num(p, "ren_tasa");
    const saldo = num(p, "saldoActual");
    if (has("rendimiento") && r !== null && saldo !== null && saldo > 0)
      costo.push(`Con ${usd(saldo)} al ${r}% anual, cada punto de rendimiento equivale a ~${usd(saldo / 100)} al año.`);
    if (!vacio(p, "vencimiento")) {
      const n = diasHasta(txt(p, "vencimiento"), hoy);
      if (n >= 0 && n <= 60) costo.push(`Vence en ${n} días: si no decide, puede renovarse solo en las mismas condiciones.`);
    }
    const nocambiar = [
      "El problema es más de uso o de contratación que del producto.",
      "La penalidad por rescate o los bonos que perdería superan lo que ganaría en el plan nuevo.",
      "Su horizonte es corto para un plan de largo plazo.",
      "No tiene fondo de emergencia: primero eso.",
    ];
    return { veredicto, causa, puntaje: sc, costo, nocambiar };
  }

  // Primera inversión
  let veredicto: Veredicto;
  if (nDatos < 3) {
    veredicto = {
      nivel: "falta_informacion",
      titulo: "Aún no hay base para opinar",
      razon: "Completa su meta, su horizonte, cuánto puede aportar y si tiene fondo de emergencia.",
    };
  } else if (txt(p, "emergencia") === "No") {
    veredicto = {
      nivel: "condiciones",
      titulo: "Viable, pero primero un fondo de emergencia",
      razon: "Sin colchón para imprevistos, cualquier gasto lo obliga a rescatar con penalidad. Arma primero ese fondo o un aporte menor que no lo deje sin liquidez.",
    };
  } else if (capacidadDe(p)?.nivel === "no_alcanza") {
    veredicto = {
      nivel: "condiciones",
      titulo: "Viable, con un aporte que sí le alcance",
      razon: "Con su ingreso, gastos y deudas, el aporte que planteó no le alcanza. Ajusta el monto a lo que puede sostener sin apretar su presupuesto.",
    };
  } else if (anios !== null && anios < 5) {
    veredicto = {
      nivel: "no_recomendable",
      titulo: "Un plan de largo plazo aún no conviene",
      razon: "Necesitará el dinero en menos de 5 años: los cargos de un unit linked pesan más en plazos cortos. Recomiéndale una alternativa de corto plazo y retómalo después.",
    };
  } else if (perfilIncoherente(p)) {
    veredicto = {
      nivel: "condiciones",
      titulo: "Viable, con una estrategia conservadora",
      razon: "Dice tolerar riesgo, pero retiraría todo ante una caída. Empieza con fondos conservadores y explícale qué es normal ver en el camino.",
    };
  } else {
    veredicto = {
      nivel: "viable",
      titulo: "Empezar a invertir es viable y conviene no postergarlo",
      razon: "Con lo que hay en la ficha, tiene meta, horizonte y capacidad de aporte. Lo que más pesa en el resultado es el tiempo.",
    };
  }
  if (ap !== null && anios !== null && ap > 0)
    costo.push(`Cada año que espera son ~${usd(ap * 12)} de aportes que dejan de trabajar a su favor, y menos años de interés compuesto.`);
  else costo.push("Cada año que espera es un año menos de interés compuesto a su favor.");
  if (txt(p, "ahorroHoy") === "Cuenta de ahorros" || txt(p, "ahorroHoy") === "Efectivo")
    costo.push("En una cuenta de ahorros o en efectivo, la inflación le quita poder de compra cada año.");
  if (!vacio(p, "costoEvento")) costo.push(`Su plan B para la meta: ${txt(p, "costoEvento")}.`);
  if (!vacio(p, "depende")) costo.push(`También dependen de esa meta: ${txt(p, "depende")}.`);
  return { veredicto, causa: null, puntaje: null, costo, nocambiar: [] };
}

/** Fila del comparativo: [concepto, hoy, propuesta]. */
export type FilaComparativo = [string, string, string];

export function comparativo(p: Prospecto): FilaComparativo[] {
  const precio = num(p, "precio");
  const actual = num(p, "aporteActual");
  const j = (a: string[]) => a.filter(Boolean).join(" · ");
  const v = (k: string) => txt(p, k);
  const rows: FilaComparativo[] = [
    ["Aporte", actual === null ? "" : usd(actual) + " al mes", precio === null ? "Definir con la proyección" : usd(precio)],
    ["Producto", j([v("institucion"), v("producto")]), j([v("tipoPlan") || "Plan por definir", v("plazo") ? `${v("plazo")} años` : ""])],
    ["Lo que le falla y cómo lo resuelve la propuesta", v("grieta"), v("gana") || "Por definir"],
  ];
  if (tieneMotivo(p, "rendimiento"))
    rows.push(["Rendimiento", j([v("ren_tasa") ? `${v("ren_tasa")}% anual` : "", v("ren_esperado") ? `esperaba ${v("ren_esperado")}%` : ""]), "Escenarios de proyección, sin garantía"]);
  if (tieneMotivo(p, "costos")) rows.push(["Costos y comisiones", j([v("cos_sabe") ? "Los conoce: " + v("cos_sabe").toLowerCase() : "", v("cos_detalle")]), "Detallar cargos del plan por escrito"]);
  if (tieneMotivo(p, "liquidez")) rows.push(["Liquidez", j([v("liq_necesita") ? "Retiros anticipados: " + v("liq_necesita").toLowerCase() : "", v("liq_penal")]), "Tabla de rescates por año"]);
  if (tieneMotivo(p, "transparencia")) rows.push(["Información", v("tra_informe") ? "Estado de cuenta: " + v("tra_informe").toLowerCase() : "", "Estado de cuenta y acceso en línea"]);
  if (tieneMotivo(p, "riesgo")) rows.push(["Riesgo", v("rie_caida") ? "Caídas: " + v("rie_caida").toLowerCase() : "", "Fondos acordes a su perfil"]);
  if (tieneMotivo(p, "atencion")) rows.push(["Asesoría", v("ate_asesor"), "Revisión periódica con su asesor"]);
  rows.push(["Saldo y permanencia", j([v("saldoActual") ? usdCampo(p, "saldoActual") : "", v("tiempoCon")]), "Calcular costo de salida antes de mover"]);
  rows.push(["Vencimiento", v("vencimiento") ? "Vence el " + fmtFecha(v("vencimiento")) : "", "Definir cuándo mover sin penalidad"]);
  return rows;
}

export interface Vista {
  local: AnalisisLocal;
  veredicto: Veredicto;
  causa: Causa | null;
  costo: string[];
  nocambiar: string[];
  busca: string[];
  evita: string[];
}

/** Todo lo que muestra el panel de análisis (100 % local, sin conexión). */
export function vista(p: Prospecto, hoy: string = hoyISO()): Vista {
  const L = analisisLocal(p, hoy);
  const D = diagLocal(p, hoy);
  return {
    local: L,
    veredicto: D.veredicto,
    causa: esCambio(p) ? D.causa : null,
    costo: D.costo,
    nocambiar: esCambio(p) ? D.nocambiar : [],
    busca: L.busca,
    evita: L.evita,
  };
}

/** Texto plano del análisis completo ("Copiar resumen"). */
export function textoResumen(p: Prospecto, hoy: string = hoyISO()): string {
  const v = vista(p, hoy);
  const ck = esCambio(p);
  const bloque = (t: string, a: string[]) => (a.length ? t + "\n" + a.map((x) => "- " + x).join("\n") + "\n\n" : "");
  const ver = `Recomendación sincera\n${NIVEL_INFO[v.veredicto.nivel].l}: ${v.veredicto.titulo}\n${v.veredicto.razon}\n\n`;
  const cau = ck && v.causa ? `¿De qué se trata realmente? ${CAUSA_L[v.causa.tipo]}\n${v.causa.explicacion}\n\n` : "";
  const cmp = ck
    ? bloque("Comparativo (borrador)", comparativo(p).map((r) => `${r[0]}: hoy ${r[1] || "—"} | propuesta ${r[2]}`))
    : "";
  return (
    `Análisis para la propuesta · ${txt(p, "nombre") || "Prospecto"} (${TIPOS[tipoDe(p)].n})\n\n` +
    ver +
    cau +
    bloque(ck ? "Costo de oportunidad: lo que está en juego" : "Costo de oportunidad: no invertir", v.costo) +
    (ck ? bloque("Señales para no cambiar", v.nocambiar) : "") +
    bloque("Lo que busca", v.busca) +
    bloque("Lo que quiere evitar", v.evita) +
    cmp +
    bloque("No olvides considerar", v.local.recs.map((r) => `${r.t}: ${r.d}`)) +
    bloque("Información que falta", v.local.vacios)
  ).trimEnd();
}
