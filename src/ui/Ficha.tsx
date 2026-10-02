/** Ficha de un prospecto: consentimiento, misiones, cliente, análisis y acciones. */
import { Fragment, useCallback, useMemo, useState } from "react";
import { DOCS_CIERRE, ETAPA_CERRADO, ETAPA_INICIAL, ETAPA_PERDIDO, ETAPA_PRECIERRE, TIPOS } from "../config/ficha";
import { XP_CIERRE } from "../config/juego";
import { CAMPO, campoActivo, crearProspecto, etapaDe, MOTIVO_BY, reunionesDe, tieneConsentimiento, tipoDe, txt, vendido } from "../domain/ficha";
import type { Campo as CampoT, Mision, Prospecto, Tipo } from "../domain/tipos";
import { fichaPct, fichaXp, misionesDe, misionStats } from "../domain/xp";
import { conEtapa, objetivoMes } from "../domain/objetivos";
import { hoyISO } from "../domain/fechas";
import { store, useFicha } from "../store/store";
import { PlanRecomendado } from "./Recomendacion";
import { Analisis } from "./Analisis";
import { useAviso } from "./hooks";
import { Campo, Motivos, type Cambiar } from "./Campo";
import { Cliente } from "./Cliente";
import { Anillo, BotonConfirmar, TituloPlegable } from "./comunes";
import { PlegadoContext, usePlegado } from "./plegado";
import { BotonesContacto } from "./Contacto";
import { Escaner } from "./Escaner";
import {
  cortoReunion,
  idDocCierre,
  irAPrecierre,
  marcarReunionHecha,
  momentoReferidos,
  numeroReunion,
  requiereCasoEspecial,
  prepararVenta,
  errorVenta,
  faltaCierre,
} from "../domain/cierre";
import { reunionDe } from "../domain/mensajes";
import { riesgosDe, riesgosPrincipales } from "../domain/ocupacion";
import { estadoSeguimiento } from "../domain/seguimiento";
import { EtapaAuto, type SiguienteFase, PanelAgendar, PreCierre, Referidos } from "./Cierre";
import { Historial } from "./Historial";
import { Mensajes } from "./Mensajes";
import { Recordatorio } from "./Reunion";
import { Invitacion, SeguimientoAuto } from "./Envio";
import { ComparacionPlan } from "./Coberturas";
import { PostReunion } from "./PostReunion";
import { CadenaReferido } from "./Cadena";
import { cadenaCompleta, esReferido, marcarPaso } from "../domain/referidos";
import { registrarContactoRapido } from "../domain/crm";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { datosParaFicha } from "../domain/contactos";
import { ir, volver } from "./router";

/** Ficha nueva: vive solo en memoria hasta que se registra el consentimiento. */
export function FichaNueva({ tipo, refId, contactoId }: { tipo: Tipo; refId?: string; contactoId?: string }) {
  const contacto = useBiblioteca().contactos.find((c) => c.id === contactoId);
  const [borrador] = useState<Prospecto>(() => {
    const p = crearProspecto(tipo);
    const ref = refId ? store.get(refId) : undefined;
    if (ref) {
      p.referidoPor = ref.id;
      p.origen = "Referido";
      p.referidor = txt(ref, "nombre");
    }
    return p;
  });
  const referente = refId ? store.get(refId) : undefined;
  const aceptar = () => {
    // Desde el Centro de Gestión ("Pasar a reunión"): empieza en la primera reunión.
    const p = {
      ...borrador,
      ...(contacto ? { ...datosParaFicha(contacto), etapa: "Primera reunión" } : {}),
      consentimiento: { ts: Date.now() },
    };
    store.agregar(p);
    if (contacto) void biblioteca.guardar("contactos", { ...contacto, fichaId: p.id });
    ir({ v: "ficha", id: p.id }, { reemplazar: true });
  };
  return (
    <div className="wrap page-top">
      <Barra p={contacto ? { ...borrador, nombre: contacto.nombre } : borrador} />
      {contacto && (
        <p className="an-note" style={{ marginTop: 10 }}>
          Desde tus contactos: se copian su nombre, edad, celular, correo y género al registrar el consentimiento.
        </p>
      )}
      {referente && (
        <p className="an-note" style={{ marginTop: 10 }}>
          Referido por <b>{txt(referente, "nombre") || "un cliente"}</b>.
        </p>
      )}
      <Consentimiento p={borrador} aceptar={aceptar} />
    </div>
  );
}

function Consentimiento({ p, aceptar }: { p: Prospecto; aceptar?: () => void }) {
  if (tieneConsentimiento(p))
    return (
      <p className="an-note" style={{ marginTop: 10 }}>
        ✓ Consentimiento registrado el{" "}
        {new Date(p.consentimiento!.ts).toLocaleString("es-EC", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
        · Si la persona lo retira, elimina la ficha.
      </p>
    );
  return (
    <section className="consent" aria-label="Consentimiento">
      <h2>Antes de empezar</h2>
      <p>
        Esta ficha guarda datos personales y financieros de la persona y de su familia. Pídele permiso
        para registrarlos y úsalos solo para asesorarla.
      </p>
      <label className="ck">
        <input type="checkbox" checked={false} onChange={(e) => e.target.checked && aceptar?.()} />
        <span>
          La persona aceptó que registre sus datos para asesorarla
          <small>Se guarda la fecha y hora de hoy.</small>
        </span>
      </label>
    </section>
  );
}

function Barra({ p }: { p: Prospecto }) {
  const t = TIPOS[tipoDe(p)];
  const pct = fichaPct(p);
  return (
    <div className="top">
      <button className="back" onClick={() => volver()} aria-label="Volver">
        ←
      </button>
      <div className="who">
        <b>{txt(p, "nombre") || t.n}</b>
        <small>
          {t.ic} {t.n} · {fichaXp(p)} XP
        </small>
      </div>
      <BotonesContacto p={p} />
      <Anillo pct={pct} label={`Ficha completa al ${pct}%`} />
    </div>
  );
}

type IdAccion =
  | "agendar"
  | "hecha"
  | "post"
  | "mensajes"
  | "recordatorio"
  | "seguimiento"
  | "invitacion"
  | "cadena"
  | "contacto"
  | "comparar"
  | "recomendar"
  | "analizar"
  | "notas"
  | "contratar"
  | "perdido"
  | "reactivar";

/** Íconos de "+ acciones" (solo decoración: no van en los mensajes). */
const ICONO_ACCION: Record<IdAccion, string> = {
  agendar: "📅",
  hecha: "✅",
  post: "📝",
  mensajes: "💬",
  recordatorio: "⏰",
  invitacion: "✉️",
  seguimiento: "🔁",
  cadena: "🔗",
  contacto: "📞",
  comparar: "⚖️",
  recomendar: "🧭",
  analizar: "🔍",
  notas: "🗒️",
  contratar: "🤝",
  perdido: "🚫",
  reactivar: "♻️",
};

export function Ficha({ id }: { id: string }) {
  const p = useFicha(id);
  const avisar = useAviso();
  const [abierto, setAbierto] = useState(false);
  const [panel, setPanel] = useState<IdAccion | null>(null);
  const [perdidoArmado, setPerdidoArmado] = useState(false);

  const actualizar = useCallback((fn: (p: Prospecto) => Prospecto) => store.actualizar(id, fn), [id]);

  // Secciones desplegables: se abre la de la etapa en curso (y al cambiar de etapa, la nueva).
  const etapaActual = p ? etapaDe(p) : null;
  const [abiertas, setAbiertas] = useState<ReadonlySet<string>>(() => new Set(p ? seccionesDeEtapa(p) : []));
  const [etapaVista, setEtapaVista] = useState(etapaActual);
  if (p && etapaActual !== etapaVista) {
    setEtapaVista(etapaActual);
    setAbiertas(new Set(seccionesDeEtapa(p)));
  }
  const plegado = useMemo(
    () => ({
      abierta: (sec: string) => abiertas.has(sec),
      alternar: (sec: string) =>
        setAbiertas((xs) => {
          const n = new Set(xs);
          if (n.has(sec)) n.delete(sec);
          else n.add(sec);
          return n;
        }),
    }),
    [abiertas],
  );

  const cambiar: Cambiar = useCallback(
    (k, v) => {
      const antes = store.get(id);
      const objetivos = biblioteca.getEstado().ajustes[0]?.objetivos;
      const objAntes = objetivoMes(store.getItems(), hoyISO(), objetivos);
      actualizar((x) => (k === "etapa" ? conEtapa(x, String(v), hoyISO()) : { ...x, [k]: v }));
      const nuevo = objetivoMes(store.getItems(), hoyISO(), objetivos).escalones.find(
        (e, i) => e.logrado && !objAntes.escalones[i].logrado,
      );
      if (nuevo)
        avisar(
          nuevo.detalle
            ? `¡Llegaste a $${nuevo.prima} este mes! Desbloqueaste: ${nuevo.detalle} 🎉`
            : `¡Llegaste a tu objetivo de $${nuevo.prima} este mes! 🎉`,
        );
      else if (k === "etapa" && v === ETAPA_CERRADO && antes && !vendido(antes))
        avisar(`Venta exitosa · +${XP_CIERRE} XP`);
    },
    [actualizar, avisar, id],
  );

  if (!p)
    return (
      <div className="wrap page-top">
        <div className="empty" style={{ marginTop: 20 }}>
          <b>Esta ficha ya no existe</b>
          <button className="btn small" style={{ marginTop: 12 }} onClick={() => ir({ v: "tablero", tab: "prospectos" }, { reemplazar: true })}>
            Ir al tablero
          </button>
        </div>
      </div>
    );

  const irA = (elId: string) => requestAnimationFrame(() => document.getElementById(elId)?.scrollIntoView({ block: "start" }));

  const eliminar = () => {
    store.borrar(id);
    for (const d of DOCS_CIERRE) void biblioteca.ponerArchivo(idDocCierre(id, d.id), null);
    avisar("Ficha eliminada");
    volver();
  };

  const etapa = etapaDe(p);
  const cerrado = vendido(p);
  const perdido = etapa === ETAPA_PERDIDO;
  const precierre = etapa === ETAPA_PRECIERRE;
  const n = numeroReunion(p);
  const reu = reunionDe(p, hoyISO());
  const misiones = misionesDe(p);
  const datos = misiones.find((m) => m.id === "datos")!;
  const resto = misiones.filter((m) => m.id !== "datos");
  const datosRef = { nombre: txt(p, "nombre"), referidor: txt(p, "referidor"), relacion: txt(p, "relacion"), cadena: p.cadena };
  const conCadena = txt(p, "origen") === "Referido" && esReferido(datosRef);
  const seg = estadoSeguimiento(p, hoyISO());
  const riesgos = riesgosDe(p);

  const marcarHecha = () => {
    const faltanRef = momentoReferidos(p) === "primera";
    actualizar((x) => marcarReunionHecha(x, hoyISO()));
    avisar(
      `${cortoReunion(n)} realizada` +
        (n === 1 && faltanRef ? ": pide los 3 referidos en la segunda reunión" : ": envía el informe post reunión"),
    );
    setPanel("post");
  };

  const acciones: { id: IdAccion; l: string; nota?: string; off?: boolean; clase?: string; si?: boolean }[] = [
    {
      id: "agendar",
      l: reu && reu.dias >= 0 ? `Cambiar ${cortoReunion(n)}` : requiereCasoEspecial(p) ? "Reunión extra" : `Agendar ${cortoReunion(n)}`,
      nota: requiereCasoEspecial(p) && !(reu && reu.dias >= 0) ? "caso especial" : undefined,
      si: !cerrado && !perdido,
    },
    { id: "hecha", l: `${cortoReunion(n)} realizada`, si: !cerrado && !perdido && !!txt(p, "reunion") },
    { id: "post", l: "Informe post reunión", si: reunionesDe(p).length > 0 || !!p.postReunion },
    { id: "mensajes", l: "Mensajes" },
    { id: "recordatorio", l: "Recordatorio", nota: reu && reu.dias >= 0 ? undefined : "sin reunión" },
    { id: "invitacion", l: "Invitación" },
    {
      id: "seguimiento",
      l: seg.siguiente !== null ? `Seguimiento ${seg.siguiente + 1}` : "Seguimiento 1-2-3",
      si: !cerrado && !perdido,
    },
    { id: "cadena", l: "Cadena de referido", nota: cadenaCompleta(datosRef) ? undefined : "pendiente", si: conCadena },
    { id: "contacto", l: "Registrar contacto" },
    // "Plan recomendado" y "Comparar plan actual" (tablas de coberturas) quedan fuera hasta adaptarlos a inversiones.
    { id: "recomendar", l: "Plan recomendado", si: false },
    { id: "comparar", l: "Comparar plan actual", si: false },
    { id: "analizar", l: "Analizar ficha" },
    { id: "notas", l: "Notas" },
    { id: "contratar", l: "Ya va a contratar", clase: "fuerte", si: !cerrado && !perdido && !precierre },
    { id: "perdido", l: perdidoArmado ? "Toca otra vez: no contrató" : "No contrató", clase: "del", si: !cerrado && !perdido },
    { id: "reactivar", l: "Reactivar", si: perdido },
  ];

  const vender = () => {
    const e = errorVenta(p);
    if (e) {
      avisar(e);
      return irA("precierre");
    }
    actualizar(prepararVenta);
    cambiar("etapa", ETAPA_CERRADO);
    irA("cerrado");
  };

  /** Botón de la etapa: lleva a la siguiente fase. */
  const siguiente: SiguienteFase | null = (() => {
    const abrir = (pn: IdAccion) => {
      setAbierto(true);
      setPanel(pn);
      irA("panel-accion");
    };
    switch (etapa) {
      case "Primer contacto":
        return {
          a: "Cuadrar cita",
          hacer: () => {
            actualizar((x) => ({ ...x, etapa: "Cuadrar cita" }));
            avisar("Cuadrar cita: propón día y hora para la primera reunión");
            abrir("mensajes");
          },
        };
      case "Cuadrar cita":
        return {
          a: "Primera reunión",
          hacer: () => {
            actualizar((x) => ({ ...x, etapa: "Primera reunión" }));
            avisar("Agenda la primera reunión");
            abrir("agendar");
          },
        };
      case "Primera reunión":
        return {
          a: "Segunda reunión",
          nota: "marca la primera como realizada",
          hacer: () => {
            setAbierto(true);
            marcarHecha();
          },
        };
      case "Segunda reunión":
        return {
          a: "Pre-cierre",
          nota: "ya va a contratar",
          hacer: () => {
            // Si la segunda reunión aún no se marcó, queda como realizada.
            actualizar((x) => irAPrecierre(reunionesDe(x).length === 1 ? marcarReunionHecha(x, hoyISO()) : x));
            setAbierto(false);
            setPanel(null);
            avisar("Pre-cierre: llena el producto, el deducible y el valor mensual");
            irA("precierre");
          },
        };
      case ETAPA_PRECIERRE:
        return { a: "Venta exitosa", hacer: vender };
      case "Venta exitosa": {
        const falta = faltaCierre(p);
        return {
          a: "Cerrado",
          nota: falta.length ? `falta: ${falta.join(", ").toLowerCase()}` : undefined,
          hacer: () => {
            if (falta.length) avisar(`Para pasar a Cerrados falta: ${falta.join(", ")}`);
            irA("cerrado");
          },
        };
      }
      default:
        return null;
    }
  })();

  const accionar = (a: IdAccion) => {
    if (a === "contratar") {
      actualizar(irAPrecierre);
      setAbierto(false);
      setPanel(null);
      avisar("Pre-cierre: llena el producto, el deducible y el valor mensual");
      return irA("precierre");
    }
    if (a === "hecha") return marcarHecha();
    if (a === "perdido") {
      if (!perdidoArmado) return setPerdidoArmado(true);
      setPerdidoArmado(false);
      actualizar((x) => ({ ...x, etapa: ETAPA_PERDIDO }));
      return avisar("Quedó como perdido: puedes reactivarlo desde + acciones");
    }
    if (a === "reactivar") {
      actualizar((x) => ({ ...x, etapa: ETAPA_INICIAL }));
      return avisar("Ficha reactivada");
    }
    setPanel(panel === a ? null : a);
    irA("panel-accion");
  };

  const cuerpoPanel = (() => {
    switch (panel) {
      case "agendar":
        return <PanelAgendar p={p} actualizar={actualizar} alGuardar={() => setPanel("invitacion")} />;
      case "post":
        return <PostReunion p={p} actualizar={actualizar} />;
      case "mensajes":
        return <Mensajes p={p} />;
      case "recordatorio":
        return <Recordatorio p={p} actualizar={actualizar} />;
      case "invitacion":
        return <Invitacion p={p} />;
      case "seguimiento":
        return <SeguimientoAuto p={p} />;
      case "cadena":
        return (
          <CadenaReferido
            d={datosRef}
            telefono={txt(p, "whatsapp")}
            marcar={(i, dia) => actualizar((x) => ({ ...x, cadena: marcarPaso(x.cadena, i, dia) }))}
            alEnviar={(canal, nota) => actualizar((x) => registrarContactoRapido(x, canal, hoyISO(), Date.now(), nota).ficha)}
          />
        );
      case "contacto":
        return (
          <div className="gc-panel">
            <Historial p={p} actualizar={actualizar} />
            <div className="two" style={{ marginTop: 12 }}>
              <Campo c={CAMPO.prox} p={p} cambiar={cambiar} />
              <Campo c={CAMPO.proxTxt} p={p} cambiar={cambiar} />
            </div>
          </div>
        );
      case "recomendar":
        return <PlanRecomendado p={p} actualizar={actualizar} />;
      case "comparar":
        return <ComparacionPlan p={p} actualizar={actualizar} />;
      case "analizar":
        return <Analisis p={p} actualizar={actualizar} />;
      case "notas":
        return (
          <div className="gc-panel">
            <Campo c={CAMPO.notas} p={p} cambiar={cambiar} />
          </div>
        );
      default:
        return null;
    }
  })();

  let num = 1;
  return (
    <PlegadoContext.Provider value={plegado}>
    <div className="wrap page-top">
      <Barra p={p} />
      <Consentimiento p={p} />
      <EtapaAuto p={p} siguiente={siguiente} />
      <SeccionMision m={datos} n={num++} p={p} cambiar={cambiar} actualizar={actualizar} alCompletarPre={() => {}} />
      {riesgos && (
        <p className="an-note riesgo-nota" aria-label="Riesgos de su trabajo">
          <b>Riesgos de su trabajo ({riesgos.perfil.l.toLowerCase()}):</b> {riesgosPrincipales(riesgos, 3).join(", ").toLowerCase()}. Van
          en el informe y en los argumentos.
        </p>
      )}

      <div className="acciones-ficha">
        <button
          type="button"
          className="btn mas-acciones"
          aria-expanded={abierto}
          aria-controls="lista-acciones"
          onClick={() => setAbierto(!abierto)}
        >
          {abierto ? "− acciones" : "+ acciones"}
        </button>
        {abierto && (
          <div className="lista-acciones" id="lista-acciones" role="group" aria-label="Acciones con el prospecto">
            {acciones
              .filter((a) => a.si !== false)
              .map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={"accion" + (a.clase ? " " + a.clase : "")}
                  aria-pressed={panel === a.id}
                  onClick={() => accionar(a.id)}
                >
                  <span className="accion-ic" aria-hidden="true">
                    {ICONO_ACCION[a.id]}
                  </span>
                  {a.l}
                  {a.nota && <small>{a.nota}</small>}
                </button>
              ))}
          </div>
        )}
        <div id="panel-accion">{abierto && cuerpoPanel}</div>
      </div>

      {resto.map((m) => {
        const k = num++;
        return (
          <Fragment key={m.id}>
            <SeccionMision m={m} n={k} p={p} cambiar={cambiar} actualizar={actualizar} alCompletarPre={() => irA("precierre")} />
            {m.id === "desc" && <Referidos p={p} actualizar={actualizar} n={num++} />}
          </Fragment>
        );
      })}

      {precierre && (
        <PreCierre
          p={p}
          actualizar={actualizar}
          alVender={vender}
          alVolver={() => {
            actualizar((x) => ({ ...x, etapa: "Segunda reunión" }));
            avisar("Aún no decide: vuelve a Segunda reunión (dale seguimiento)");
          }}
        />
      )}
      {cerrado && <Cliente p={p} cambiar={cambiar} actualizar={actualizar} />}

      <div className="actions">
        <button
          className="btn ghost"
          onClick={() => {
            avisar("Ficha guardada");
            volver();
          }}
        >
          Guardar y volver
        </button>
        <BotonConfirmar className="btn del" armadoTexto="Toca otra vez para eliminar" onConfirm={eliminar}>
          Eliminar
        </BotonConfirmar>
      </div>
    </div>
    </PlegadoContext.Provider>
  );
}

/** Secciones que se abren solas en cada etapa (las demás quedan plegadas). */
function seccionesDeEtapa(p: Prospecto): string[] {
  switch (etapaDe(p)) {
    case "Primer contacto":
    case "Cuadrar cita":
      return ["datos"];
    case "Primera reunión":
      return ["desc"];
    case "Segunda reunión":
      return momentoReferidos(p) === "listos" ? [] : ["referidos"];
    case ETAPA_PRECIERRE:
      return ["pre", "precierre"];
    case "Venta exitosa":
    case ETAPA_CERRADO:
      return ["cerrado"];
    default:
      return [];
  }
}

function SeccionMision({
  m,
  n,
  p,
  cambiar,
  actualizar,
  alCompletarPre,
}: {
  m: Mision;
  n: number;
  p: Prospecto;
  cambiar: Cambiar;
  actualizar: (fn: (p: Prospecto) => Prospecto) => void;
  alCompletarPre: () => void;
}) {
  const s = misionStats(m, p);
  const done = s.pct === 100;
  const plegado = usePlegado(m.id);
  const activos = m.campos.filter((c) => campoActivo(c, p));
  let cuerpo;
  if (m.custom) {
    cuerpo = <Escaner p={p} actualizar={actualizar} alCompletar={alCompletarPre} />;
  } else {
    cuerpo = <Campos lista={activos} p={p} cambiar={cambiar} actualizar={actualizar} />;
  }
  return (
    <section className={"miss" + (done ? " done" : "") + plegado.clase} id={"mision-" + m.id} aria-labelledby={"t-" + m.id}>
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          {done ? "✓" : n}
        </span>
        <TituloPlegable id={"t-" + m.id} seccion={m.id}>
          {m.titulo}
        </TituloPlegable>
        <span className="mp">{s.xp} XP</span>
      </div>
      <div className="mbar" role="progressbar" aria-label={`Avance de ${m.titulo}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.pct}>
        <i style={{ width: s.pct + "%" }} />
      </div>
      {cuerpo}
    </section>
  );
}

/** Campos en orden; los que dependen de un motivo se agrupan en un bloque con su nombre. */
function Campos({
  lista,
  p,
  cambiar,
  actualizar,
}: {
  lista: CampoT[];
  p: Prospecto;
  cambiar: Cambiar;
  actualizar: (fn: (p: Prospecto) => Prospecto) => void;
}) {
  const bloques: { motivo?: string; campos: CampoT[] }[] = [];
  for (const c of lista) {
    const ult = bloques[bloques.length - 1];
    if (ult && ult.motivo === c.motivo) ult.campos.push(c);
    else bloques.push({ motivo: c.motivo, campos: [c] });
  }
  const render = (c: CampoT) => {
    if (c.t === "motivos") return <Motivos key={c.k} c={c} p={p} cambiar={cambiar} />;
    if (c.t === "contactos") return <Historial key={c.k} p={p} actualizar={actualizar} />;
    return <Campo key={c.k} c={c} p={p} cambiar={cambiar} />;
  };
  return (
    <>
      {bloques.map((b, i) =>
        b.motivo ? (
          <div className="mblock" key={b.motivo + i}>
            <h4>
              <span aria-hidden="true">{MOTIVO_BY[b.motivo].ic}</span> {MOTIVO_BY[b.motivo].l}
            </h4>
            {b.campos.map(render)}
          </div>
        ) : (
          b.campos.map(render)
        ),
      )}
    </>
  );
}
