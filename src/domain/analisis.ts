/**
 * Análisis local: determinista, sin IA y siempre disponible.
 * Portado del prototipo (`analisisLocal`, `diagLocal`, `comparativo`, `copiar`).
 * Es el único análisis de la app: todo se calcula en el dispositivo.
 * Nunca inventa cifras: solo usa lo que está en la ficha.
 */
import { riesgosDe, riesgosPrincipales } from "./ocupacion";
import { EDAD_MAYOR, MISIONES, TIPOS } from "../config/ficha";
import { SERVICIOS_SALUDSA, VALIDAR } from "../config/saludsa";
import { CAMPO, campoActivo, esCambio, num, tieneMotivo, tipoDe, txt, vacio } from "./ficha";
import { diasHasta, fmtFecha, hoyISO, usd } from "./fechas";
import { contarDatos } from "./datos";
import { declaracionVisible, preResumen } from "./pre";
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
  Precio: "Pagar más sin ver el valor con claridad",
  "Ya tengo seguro": "Duplicar cobertura sin necesidad",
  "Lo tengo que pensar": "Decidir con prisa o sin toda la información",
  "Perder antigüedad o carencias": "Perder antigüedad o volver a esperar carencias",
};

const CLAVES_CAMBIO = [
  "aseguradora", "tiempoCon", "primaActual", "motivos", "grieta", "renovacion", "exclus", "contrato", "uso",
  "conoce", "declaro", "noPerder", "depende", "edad", "ultimavez", "emergencia", "costoEvento", "objecion",
];
const CLAVES_NUEVO = [
  "cobertura", "porque", "criterio", "depende", "edad", "ultimavez", "emergencia", "costoEvento", "objecion",
];

function usdCampo(p: Prospecto, k: string): string {
  const n = num(p, k);
  return n === null ? txt(p, k) : usd(n);
}

function uniq(a: string[]): string[] {
  return a.filter((x, i) => a.indexOf(x) === i);
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

  if (!vacio(p, "porque") && !ck) busca.push("Contratar ahora porque: " + txt(p, "porque"));
  if (!vacio(p, "depende")) busca.push("Respaldo para quienes dependen de él o ella: " + txt(p, "depende"));
  if (!vacio(p, "emergencia")) busca.push("Tener resuelto qué hacer ante una emergencia: " + txt(p, "emergencia"));
  if (ck && !vacio(p, "grieta")) busca.push("Resolver lo que hoy le falla: " + txt(p, "grieta"));
  const riesgos = riesgosDe(p);
  if (riesgos)
    busca.push(
      `Atención para los riesgos de su trabajo (${riesgos.ocupacion}): ${riesgosPrincipales(riesgos, 3).join(", ").toLowerCase()}`,
    );
  if (esMayor(p)) busca.push("Cobertura clara en la etapa donde más se usa el sistema de salud");

  if (ck) {
    if (tieneMotivo(p, "precio")) {
      evita.push(
        "Alzas de prima sin explicación ni control" +
          (!vacio(p, "pre_alza") ? ` (la última fue de ${txt(p, "pre_alza")}%)` : ""),
      );
      if (!vacio(p, "pre_limite")) busca.push(`Un costo que no pase de ${usdCampo(p, "pre_limite")} al mes`);
    }
    if (tieneMotivo(p, "deducibles"))
      evita.push(
        "Pagar deducibles o copagos que no esperaba" +
          (!vacio(p, "ded_anual") ? ` (el último año pagó ${usdCampo(p, "ded_anual")})` : ""),
      );
    if (tieneMotivo(p, "cobertura"))
      evita.push(
        "Quedarse sin cobertura en " +
          (vacio(p, "cob_que") ? "lo que necesita" : txt(p, "cob_que").toLowerCase()) +
          (!vacio(p, "cob_porque") ? ` (motivo: ${txt(p, "cob_porque").toLowerCase()})` : ""),
      );
    if (tieneMotivo(p, "reembolsos"))
      evita.push(
        "Reembolsos que tardan" +
          (!vacio(p, "reem_dias") ? " " + txt(p, "reem_dias").toLowerCase() : " semanas") +
          (txt(p, "reem_rech") && txt(p, "reem_rech") !== "Nunca" ? " o que se rechazan" : ""),
      );
    if (tieneMotivo(p, "red")) {
      evita.push(
        "Quedarse con pocos médicos o clínicas para elegir" + (!vacio(p, "red_falta") ? ": " + txt(p, "red_falta") : ""),
      );
      if (txt(p, "red_medico") === "Sí") busca.push("Conservar a su médico o clínica de confianza");
    }
    if (tieneMotivo(p, "atencion"))
      evita.push(
        "Mala atención cuando más la necesita" +
          (!vacio(p, "ate_canal") ? ` (${txt(p, "ate_canal").toLowerCase()})` : ""),
      );
  }
  if (ck && !vacio(p, "grieta")) evita.push("Repetir lo que hoy le falla: " + txt(p, "grieta"));
  const obj = MAP_OBJ[txt(p, "objecion")];
  if (obj) evita.push(obj);
  if (ck) {
    evita.push("Quedarse sin cobertura durante el cambio");
    if (!vacio(p, "exclus")) evita.push("Que lo que hoy tiene cubierto quede excluido en la nueva póliza");
  }

  // Recordatorios fijos
  recs.push({
    id: "pre",
    t: "Preexistencias",
    d: "Pregunta por condiciones médicas previas de cada persona a asegurar y valida con la aseguradora cómo se tratan (cobertura, carencia o exclusión) antes de prometer nada.",
  });
  if (ck) {
    recs.push({
      id: "cont",
      t: "Beneficios de continuidad",
      d: "Pregunta si SaludSA reconoce antigüedad, carencias ya cumplidas y condiciones ya cubiertas en su póliza actual. No lo asumas: confírmalo por escrito.",
    });
    recs.push({
      id: "vig",
      t: "Sin hueco de cobertura",
      d: "No cancelar la póliza actual hasta que la nueva esté aprobada y vigente.",
    });
    const decl = txt(p, "declaro");
    if (decl === "No" || decl === "No estoy seguro")
      recs.push({
        id: "decl",
        t: "Declaración de condiciones",
        d: "Aclara qué declaró al contratar su póliza actual: condiciones no declaradas pueden generar problemas de cobertura. Conviene tenerlo claro antes de decidir.",
      });
    recs.push({
      id: "trat",
      t: "Tratamientos en curso o cirugías pendientes",
      d: "Identifica si hay algo en curso o programado que pueda quedar sin cobertura al cambiar.",
    });
  }
  recs.push({ id: "car", t: "Carencias y tiempos de espera", d: "Confirma desde cuándo se puede usar cada cobertura." });
  recs.push({
    id: "exc",
    t: "Exclusiones y límites",
    d: "Revisa deducibles, copagos, topes anuales y exclusiones; explícalos antes de la firma.",
  });
  recs.push({
    id: "tar",
    t: "Tarifa por edad y reajustes",
    d: "Cotiza con la edad de cada persona y explica cómo cambia la tarifa con el tiempo.",
  });
  recs.push({
    id: "red",
    t: "Red de prestadores",
    d: "Verifica que sus médicos y clínicas de confianza estén en la red, o dónde se atendería.",
  });
  recs.push({
    id: "reem",
    t: "Reembolsos y atención",
    d:
      "Aclara el proceso y los tiempos de reembolso" +
      (SERVICIOS_SALUDSA.length
        ? `, y cómo accede a ${SERVICIOS_SALUDSA.join(" y ")} (${VALIDAR} qué incluye su plan).`
        : "."),
  });
  if (ck)
    recs.push({
      id: "comp",
      t: "Comparativo lado a lado",
      d: "Arma su póliza actual frente a tu propuesta: coberturas, límites, red y precio.",
    });
  else recs.push({ id: "ini", t: "Inicio de vigencia", d: "Define desde cuándo cubre y qué queda en periodo de espera." });

  if (ck) {
    if (tieneMotivo(p, "precio"))
      recs.push({
        id: "mpre",
        t: "Mira el costo total, no solo la prima",
        d: "Suma prima más deducibles y copagos de un año de uso real. Una prima menor con deducibles altos puede costarle más.",
      });
    if (tieneMotivo(p, "deducibles"))
      recs.push({
        id: "mded",
        t: "Deducibles, copagos y topes",
        d: "Compara deducible, copago y topes lado a lado con su póliza actual y confirma que entienda cómo funcionan antes de firmar.",
      });
    if (tieneMotivo(p, "cobertura"))
      recs.push({
        id: "mcob",
        t: "Lo que no le cubrieron",
        d: "Confirma por escrito que eso sí quedaría cubierto en la propuesta, y desde cuándo (carencias y preexistencias).",
      });
    if (tieneMotivo(p, "cobertura") && txt(p, "cob_pendiente") === "Sí")
      recs.push({
        id: "mpen",
        t: "Procedimiento o tratamiento pendiente",
        d: "Antes de cualquier cambio, valida con la aseguradora si quedaría cubierto y desde cuándo. Sin esa confirmación, no se mueve nada.",
      });
    if (tieneMotivo(p, "reembolsos"))
      recs.push({
        id: "mrem",
        t: "Proceso de reembolsos",
        d: "Pregunta por tiempos, documentos y porcentaje de reembolso, y explícale el proceso paso a paso.",
      });
    if (tieneMotivo(p, "red") && txt(p, "red_medico") === "Sí")
      recs.push({
        id: "mred",
        t: "Su médico o clínica de confianza",
        d: "Verifica que estén en la red de SaludSA antes de presentar el plan.",
      });
    if (tieneMotivo(p, "atencion"))
      recs.push({
        id: "mate",
        t: "Acompañamiento después de la venta",
        d: "Explica quién lo atiende y cómo lo acompañas en autorizaciones y reembolsos.",
      });
    const lim = tieneMotivo(p, "precio") ? num(p, "pre_limite") : null;
    const pr = num(p, "precio");
    if (lim !== null && pr !== null && pr > lim)
      recs.push({
        id: "mlim",
        t: "La propuesta supera su presupuesto",
        d: `Dijo que podría pagar hasta ${usd(lim)} al mes y la propuesta es de ${usd(pr)}. Ajusta el plan o sé honesto con el valor que justifica la diferencia.`,
      });
  } else {
    const prs = preResumen(p);
    let nc = 0;
    let enTx = 0;
    let pendT = 0;
    const zonas: string[] = [];
    for (const x of prs) {
      for (const zz of x.con) {
        zonas.push(zz.zona);
        for (const it of zz.items) {
          nc++;
          if (it.e === "En tratamiento" || it.e === "En estudio") enTx++;
        }
      }
      pendT += x.pend.length;
    }
    if (nc > 0) {
      recs.push({
        id: "pdec",
        t: `Preexistencias declaradas (${nc})`,
        d: `Declaró condiciones en: ${uniq(zonas).join(", ")}. Valida con la aseguradora cómo se trata cada una (cobertura, carencia o exclusión) antes de prometer nada, y cuida que la declaración sea completa y verídica.`,
      });
      evita.push("Que una preexistencia quede excluida sin haberlo sabido");
    }
    if (enTx > 0)
      recs.push({
        id: "ptx",
        t: "Condiciones en tratamiento o en estudio",
        d: `Hay ${enTx} en tratamiento o en estudio. Pregunta qué documentación pide SaludSA (informes, exámenes) y advierte que puede haber exclusiones o periodos de espera.`,
      });
    const conIMC = prs.filter((x) => x.imcFactor);
    if (conIMC.length)
      recs.push({
        id: "imc",
        t: "IMC con factor de riesgo",
        d: `${conIMC.map((x) => `${x.etiqueta}: ${x.imc}`).join("; ")}. Sin juzgar: ayuda a ver el panorama y a elegir una cobertura que acompañe (chequeos, especialistas). Valida con la aseguradora cómo lo considera al evaluar la solicitud.`,
      });
    if (pendT > 0 && declaracionVisible(p)) vacios.push(`Declaración de preexistencias: faltan ${pendT} zonas por revisar`);
  }

  // Condicionales
  if (esMayor(p))
    recs.push({
      id: "e56",
      t: `Edad ${EDAD_MAYOR}+`,
      d: "Preexistencias y tarifa pesan más en este rango: llega con ambos puntos claros y documentados.",
    });
  if (!vacio(p, "depende"))
    recs.push({
      id: "dep",
      t: "Hay dependientes",
      d: "Cotiza esquema familiar y pide la edad y condiciones de cada persona incluida.",
    });
  if (txt(p, "objecion") === "Precio")
    recs.push({
      id: "opr",
      t: "Objeción de precio",
      d: "Prepara el costo de no tenerlo (una hospitalización) y compara valor por dólar, no solo precio.",
    });
  if (txt(p, "objecion") === "Perder antigüedad o carencias")
    recs.push({
      id: "oan",
      t: "Le preocupa perder antigüedad",
      d: "Valida la continuidad antes de presentar. Si hay pérdida real, díselo y muestra qué gana a cambio.",
    });
  if (!ck && /iess/i.test(txt(p, "cobertura")))
    recs.push({
      id: "iess",
      t: "Tiene IESS",
      d: "Posiciónalo como complemento: aclara qué le cubre y dónde queda expuesto.",
    });
  if (ck && !vacio(p, "renovacion")) {
    const n = diasHasta(txt(p, "renovacion"), hoy);
    if (n < 0)
      recs.push({
        id: "ren",
        t: "Renovación ya vencida",
        d: `La fecha de renovación pasó hace ${-n} días: confirma en qué estado está su póliza hoy.`,
      });
    else if (n <= 45)
      recs.push({
        id: "ren",
        t: `Renovación en ${n} días`,
        d: "Ventana corta: define pronto el inicio de vigencia para empalmar bien y no dejar hueco.",
      });
    else
      recs.push({
        id: "ren",
        t: `Renovación en ${n} días`,
        d: "Hay margen para comparar con calma y elegir bien la fecha de inicio.",
      });
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
  const precio = num(p, "precio");
  const costo: string[] = [];

  if (tipoDe(p) === "cambio") {
    const sc: Record<Origen, number> = { producto: 0, uso: 0, contratacion: 0 };
    const sg: Record<Origen, string[]> = { producto: [], uso: [], contratacion: [] };
    const add = (t: Origen, n: number, s: string) => {
      sc[t] += n;
      sg[t].push(s);
    };
    const v = (k: string) => txt(p, k);
    const has = (m: Parameters<typeof tieneMotivo>[1]) => tieneMotivo(p, m);

    if (v("uso") === "Lo usa seguido y le falla") add("producto", 2, "lo usa seguido y le falla");
    if (has("red")) add("producto", 1, "su queja incluye la red de médicos");
    if (has("atencion")) add("producto", 1, "su queja incluye la atención y el servicio");
    if (has("precio")) {
      add("producto", 1, "su queja incluye el precio o las alzas");
      if (v("pre_expl") === "No") add("contratacion", 1, "nadie le explicó cómo se reajusta la prima");
    }
    if (has("reembolsos")) {
      add("producto", 1, "su queja incluye los reembolsos");
      if (v("reem_porque") === "Falta de documentos" || v("reem_proceso") === "No" || v("reem_proceso") === "Más o menos")
        add("uso", 2, "los reembolsos se traban por documentos o por no conocer el proceso");
      if (v("reem_porque") === "Exclusión o no cobertura")
        add("contratacion", 1, "le rechazan reembolsos por exclusiones que no tenía claras");
      if (v("reem_porque") === "Sin explicación clara" || v("reem_dias") === "Más de 60 días" || v("reem_dias") === "30 a 60 días")
        add("producto", 1, "los reembolsos tardan mucho o no se explican");
    }
    if (has("deducibles")) {
      if (v("ded_sorpresa") === "No" || v("ded_sorpresa") === "No recuerda")
        add("contratacion", 2, "no sabía de los deducibles o copagos al contratar");
      if (v("ded_tope") === "Una vez" || v("ded_tope") === "Varias veces")
        add("contratacion", 1, "se le han agotado topes: el plan puede estar corto para su uso");
      else add("producto", 1, "su queja incluye deducibles y copagos");
    }
    if (has("cobertura")) {
      const cp = v("cob_porque");
      if (cp === "Exclusión de la póliza" || cp === "Preexistencia" || cp === "Período de carencia")
        add("contratacion", 2, `lo que no le cubrieron caía en ${cp.toLowerCase()} y no lo tenía claro`);
      else if (cp === "Tope o límite agotado") add("contratacion", 1, "se le agotó un tope: plan corto para su necesidad");
      else if (cp === "Nunca supo si estaba cubierto") add("uso", 1, "no sabía qué estaba cubierto");
      else add("producto", 1, "su queja incluye la cobertura");
    }
    if (has("atencion") && (v("ate_asesor") === "Responde poco" || v("ate_asesor") === "No tengo uno"))
      add("contratacion", 1, "no tiene un asesor que lo acompañe");
    if (v("uso") === "Casi no lo usa") add("uso", 2, "casi no lo usa");
    if (v("conoce") === "No" || v("conoce") === "Más o menos")
      add("uso", 1, "no domina su cobertura ni su proceso de reembolso");
    if (v("contrato") === "Por precio") add("contratacion", 2, "lo eligió por precio");
    if (v("contrato") === "No recuerda") add("contratacion", 2, "no recuerda con qué criterio lo eligió");
    if (v("contrato") === "Por su empresa") add("contratacion", 1, "lo recibió por su empresa, sin elegirlo");
    if (v("declaro") === "No" || v("declaro") === "No estoy seguro")
      add("contratacion", 1, "no tiene claro qué declaró al contratar");
    if (v("conoce") === "No") add("contratacion", 1, "no conoce lo que contrató");

    // Orden estable: en empate gana el primero de producto → uso → contratación.
    const ord = (Object.keys(sc) as Origen[]).sort((a, b) => sc[b] - sc[a]);
    const [top, sec] = ord;
    let causa: Causa;
    if (sc[top] === 0) {
      causa = {
        tipo: "indeterminada",
        explicacion:
          "Aún no hay datos para distinguir si el problema es del producto, del uso o de cómo se contrató. Completa cómo lo usa, cómo lo eligió y qué le falla.",
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
        razon:
          "Completa el motivo de inconformidad, cómo lo usa y cómo lo contrató. Sin eso, cualquier recomendación sería una suposición.",
      };
    } else if ((t === "uso" || t === "contratacion") && sc.producto === 0) {
      veredicto = {
        nivel: "no_recomendable",
        titulo: "Aún no conviene cambiar",
        razon: `Con lo que hay en la ficha, el problema apunta más a ${t === "uso" ? "cómo lo está usando" : "cómo se contrató"} que al producto. Cambiar de aseguradora sin corregir eso puede repetir el mismo problema. Aclara esto primero con la persona.`,
      };
    } else if (t === "mixta") {
      veredicto = {
        nivel: "condiciones",
        titulo: "Antes de cambiar, corrige lo que no es del producto",
        razon:
          "Hay señales del producto, pero también del uso y de la contratación. Cambiar sin corregir esas dos puede repetir el problema. Si cambia, que sea con continuidad y preexistencias confirmadas por escrito.",
      };
    } else if (t === "producto") {
      veredicto = {
        nivel: "condiciones",
        titulo: "Cambio viable si se validan continuidad y preexistencias",
        razon:
          "Hay señales de que el producto no le responde. El cambio tiene sentido solo si SaludSA confirma por escrito que no pierde antigüedad, carencias cumplidas ni cobertura de condiciones actuales.",
      };
    } else if (t === "uso" || t === "contratacion") {
      veredicto = {
        nivel: "condiciones",
        titulo: "Antes de cambiar, aclara " + (t === "uso" ? "cómo lo usa" : "cómo se contrató"),
        razon: `El problema apunta sobre todo a ${t === "uso" ? "el uso" : "la contratación"}, con algo de producto. Cambiar sin corregirlo puede repetir el problema. Si cambia, que sea con continuidad y preexistencias confirmadas por escrito.`,
      };
    } else {
      veredicto = {
        nivel: "condiciones",
        titulo: "Aún hay que definir el origen del problema",
        razon:
          "No es claro si la queja viene del producto, del uso o de la contratación. Define eso antes de proponer un cambio.",
      };
    }

    const actual = num(p, "primaActual");
    const limite = has("precio") ? num(p, "pre_limite") : null;
    const superaLimite = limite !== null && precio !== null && precio > limite;
    costo.push(
      "Si no se ajusta: sigue con lo que hoy le falla" +
        (!vacio(p, "grieta") ? ` (${txt(p, "grieta")})` : "") +
        ", y el costo se acumula cada mes.",
    );
    if (!vacio(p, "noPerder")) costo.push(`En riesgo si cambia sin validar: ${txt(p, "noPerder")}.`);
    else
      costo.push(
        `Si cambia solo por precio, podría perder antigüedad, carencias ya cumplidas o cobertura de condiciones actuales (${VALIDAR}).`,
      );
    if (precio !== null && actual !== null && precio > 0 && actual > 0) {
      const d = precio - actual;
      if (d > 0)
        costo.push(
          `La propuesta cuesta ${usd(d)} más al mes (${usd(d * 12)} al año): que el argumento sea lo que deja de perder, no el precio.`,
        );
      else if (d < 0)
        costo.push(
          `La propuesta cuesta ${usd(-d)} menos al mes, pero el ahorro no debe ser la razón principal: primero que no pierda cobertura.`,
        );
    }
    if (has("deducibles") && !vacio(p, "ded_anual"))
      costo.push(`En deducibles y copagos pagó ${usdCampo(p, "ded_anual")} el último año: compáralo con la propuesta, no solo la prima.`);
    if (has("cobertura") && !vacio(p, "cob_monto"))
      costo.push(`De su bolsillo ya pagó ${usdCampo(p, "cob_monto")} por algo que esperaba cubierto.`);
    if (has("precio") && !vacio(p, "pre_alza"))
      costo.push(`Su última alza fue de ${txt(p, "pre_alza")}%: si se repite, el costo se acumula año tras año.`);
    if (superaLimite) costo.push(`La propuesta supera el máximo que dijo poder pagar (${usd(limite)} al mes).`);
    if (!vacio(p, "costoEvento"))
      costo.push(`Su propia estimación de un evento grave: ${txt(p, "costoEvento")}. Eso queda expuesto si el seguro no responde.`);
    if (!vacio(p, "renovacion")) {
      const n = diasHasta(txt(p, "renovacion"), hoy);
      if (n >= 0 && n <= 45) costo.push(`Renueva en ${n} días: decidir tarde puede obligarlo a renovar sin ajustar nada.`);
    }

    const nocambiar = [
      "Su problema es más de uso o de contratación que del producto.",
      "SaludSA no confirma por escrito continuidad de antigüedad y carencias, y hay una condición o tratamiento en curso.",
      "La diferencia de precio es el único argumento a favor del cambio.",
      "No se puede empalmar la vigencia sin quedar un tiempo sin cobertura.",
    ];
    if (has("cobertura") && v("cob_pendiente") === "Sí")
      nocambiar.unshift("Tiene un procedimiento o tratamiento pendiente y SaludSA no ha confirmado que quede cubierto.");
    if (superaLimite) nocambiar.push("La propuesta supera lo máximo que puede pagar al mes.");

    return { veredicto, causa, puntaje: sc, costo, nocambiar };
  }

  // Nuevo prospecto
  let veredicto: Veredicto;
  if (nDatos < 3) {
    veredicto = {
      nivel: "falta_informacion",
      titulo: "Aún no hay base para opinar",
      razon: "Completa quién depende de la persona, qué cobertura tiene y con qué criterio piensa elegir.",
    };
  } else if (txt(p, "criterio") === "Precio") {
    veredicto = {
      nivel: "condiciones",
      titulo: "Viable, pero elige por cobertura y no solo por precio",
      razon:
        "Contratar hoy tiene menor costo de oportunidad que esperar. El riesgo es elegir un plan barato que no responda cuando lo necesite: en la práctica, eso también es no tener seguro.",
    };
  } else {
    veredicto = {
      nivel: "viable",
      titulo: "Contratar es viable y conviene no postergarlo",
      razon:
        "Con lo que hay en la ficha, tener el seguro correcto hoy cuesta menos que asumir un evento sin respaldo. Falta validar preexistencias y carencias con SaludSA.",
    };
  }
  costo.push(
    `Cada año que espera, la tarifa de entrada suele subir con la edad y una condición nueva puede quedar como preexistencia (${VALIDAR}).`,
  );
  const ncc = preResumen(p).reduce((a, x) => a + x.con.reduce((b, zz) => b + zz.items.length, 0), 0);
  if (ncc > 0) {
    if (veredicto.nivel === "viable")
      veredicto = {
        nivel: "condiciones",
        titulo: "Viable, con preexistencias por validar",
        razon: `Hay ${ncc} condiciones declaradas: el plan puede aceptarlas con exclusiones o periodos de espera. Valida con la aseguradora antes de prometer cobertura; declarar todo con transparencia sigue siendo mejor que esperar.`,
      };
    costo.push(`Declarar todo desde el inicio evita problemas de cobertura más adelante (${VALIDAR}).`);
  }
  if (!vacio(p, "costoEvento"))
    costo.push(`Su propia estimación de un evento grave: ${txt(p, "costoEvento")}. Sin seguro, lo asume directamente.`);
  else costo.push("Un evento grave sin cobertura lo asume la persona directamente, sin respaldo.");
  if (!vacio(p, "depende")) costo.push(`También quedan expuestos quienes dependen de él o ella: ${txt(p, "depende")}.`);
  if (txt(p, "criterio") === "Precio")
    costo.push("Elegir solo por precio puede salir más caro: un plan que no responde cuando se usa cuesta lo mismo que no tener plan.");
  return { veredicto, causa: null, puntaje: null, costo, nocambiar: [] };
}

/** Fila del comparativo: [concepto, hoy, propuesta SaludSA]. */
export type FilaComparativo = [string, string, string];

export function comparativo(p: Prospecto): FilaComparativo[] {
  const precio = num(p, "precio");
  const actual = num(p, "primaActual");
  const j = (a: string[]) => a.filter(Boolean).join(" · ");
  const v = (k: string) => txt(p, k);
  const rows: FilaComparativo[] = [
    ["Prima mensual", actual === null ? "" : usd(actual), precio === null ? "Definir con la cotización" : usd(precio)],
    ["Plan", v("aseguradora"), "SaludSA · " + (v("plan") || "por definir")],
    ["Lo que le falla y cómo lo resuelve la propuesta", v("grieta"), v("gana") || "Por definir"],
  ];
  if (tieneMotivo(p, "precio"))
    rows.push([
      "Precio y alzas",
      j([v("pre_alza") ? `Última alza ${v("pre_alza")}%` : "", v("pre_freq"), v("pre_limite") ? `Máximo que puede pagar ${usdCampo(p, "pre_limite")}` : ""]),
      "Validar esquema de reajustes con la aseguradora",
    ]);
  if (tieneMotivo(p, "deducibles"))
    rows.push([
      "Deducibles y copagos",
      j([
        v("ded_monto") ? `Deducible ${usdCampo(p, "ded_monto")}` : "",
        v("ded_copago") ? `Copago ${v("ded_copago")}` : "",
        v("ded_anual") ? `Pagó ${usdCampo(p, "ded_anual")} el último año` : "",
      ]),
      "Validar deducible, copago y topes con la aseguradora",
    ]);
  if (tieneMotivo(p, "cobertura"))
    rows.push([
      "Cobertura que le faltó",
      j([v("cob_que"), v("cob_porque"), v("cob_monto") ? `Pagó ${usdCampo(p, "cob_monto")}` : ""]),
      "Validar si quedaría cubierta y desde cuándo",
    ]);
  if (tieneMotivo(p, "reembolsos"))
    rows.push([
      "Reembolsos",
      j([
        v("reem_dias") ? "Tarda " + v("reem_dias").toLowerCase() : "",
        v("reem_rech") ? "Rechazos: " + v("reem_rech").toLowerCase() : "",
        v("reem_porque"),
      ]),
      "Validar tiempos, documentos y proceso",
    ]);
  if (tieneMotivo(p, "red")) rows.push(["Red de médicos y clínicas", v("red_falta"), "Validar red, incluido su médico de confianza"]);
  if (tieneMotivo(p, "atencion"))
    rows.push(["Atención y servicio", j([v("ate_canal"), v("ate_frec"), v("ate_asesor")]), "Validar canales y acompañamiento"]);
  rows.push(["Exclusiones, carencias y preexistencias", v("exclus"), "Validar con la aseguradora"]);
  rows.push(["Antigüedad y continuidad", v("tiempoCon") ? `${v("tiempoCon")} con su aseguradora` : "", "Validar si la aseguradora la reconoce"]);
  rows.push(["Vigencia", v("renovacion") ? "Renueva el " + fmtFecha(v("renovacion")) : "", "Definir inicio para empalmar sin hueco"]);
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
    ? bloque("Comparativo (borrador)", comparativo(p).map((r) => `${r[0]}: hoy ${r[1] || "—"} | SaludSA ${r[2]}`))
    : "";
  return (
    `Análisis para la propuesta · ${txt(p, "nombre") || "Prospecto"} (${TIPOS[tipoDe(p)].n})\n\n` +
    ver +
    cau +
    bloque(ck ? "Costo de oportunidad: lo que está en juego" : "Costo de oportunidad: no tenerlo", v.costo) +
    (ck ? bloque("Señales para no cambiar", v.nocambiar) : "") +
    bloque("Lo que busca", v.busca) +
    bloque("Lo que quiere evitar", v.evita) +
    cmp +
    bloque("No olvides considerar", v.local.recs.map((r) => `${r.t}: ${r.d}`)) +
    bloque("Información que falta", v.local.vacios)
  ).trimEnd();
}
