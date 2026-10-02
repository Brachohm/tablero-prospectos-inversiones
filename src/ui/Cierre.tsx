/**
 * Camino al cierre en la ficha: etapa automática, reuniones (dos por
 * cliente), los tres referidos, el pre-cierre con su simulación y los
 * documentos del cierre.
 */
import { FormReunion } from "./Reunion";
import { TituloPlegable } from "./comunes";
import { usePlegado } from "./plegado";
import { lugarFrase } from "../domain/reunion";
import { useId, useMemo } from "react";
import { VALIDAR } from "../config/saludsa";
import { consejoModalidad, medicoDe, recomendar, type Recomendacion } from "../domain/recomendar";
import { usePlanEnPropuesta } from "./usarPlan";
import { ROLES_PERSONA } from "../config/zonas";
import { estadoIdentificacion } from "../domain/identificacion";
import { etiquetaPersona, personasDe } from "../domain/pre";
import { editarPersona, MAX_PERSONAS, quitarPersona, setNumeroPersonas, type CampoPersona } from "../domain/pre-ops";
import {
  DOCS_CIERRE,
  ETAPA_CERRADO,
  ETAPA_PERDIDO,
  ETAPA_PRECIERRE,
  ETAPA_VENTA,
  ETAPAS,
  MAX_MB_DOC_CIERRE,
  REFERIDOS_PEDIR,
  REUNIONES_NORMALES,
} from "../config/ficha";
import { RELACIONES } from "../config/referidos";
import {
  contactoDeReferido,
  cortoReunion,
  docsCierreListos,
  errorDocCierre,
  errorVenta,
  idDocCierre,
  momentoReferidos,
  nombreReunion,
  numeroReunion,
  productosDe,
  referidoListo,
  referidosDe,
  referidosListos,
  requiereCasoEspecial,
  simularCierre,
  totalMensual,
  conProductos,
  nuevoProducto,
  fijarValorRec,
  tieneProducto,
  valorRecomendado,
} from "../domain/cierre";
import { claves } from "../domain/importar";
import { fmtFecha, hoyISO, usd } from "../domain/fechas";
import { etapaDe, reunionesDe, tipoDe, txt } from "../domain/ficha";
import { reunionDe } from "../domain/mensajes";
import type { ProductoCierre, Prospecto, ReferidoPedido } from "../domain/tipos";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { useFichas } from "../store/store";
import { useAjustesPerfil, useAviso } from "./hooks";
import { BarraObjetivo } from "./Objetivo";

type Actualizar = (fn: (p: Prospecto) => Prospecto) => void;

/** Etapas por las que avanza la ficha (Perdido aparte). */
const CAMINO = ETAPAS.filter((e) => e !== ETAPA_PERDIDO);

export interface SiguienteFase {
  /** Etapa a la que lleva. */
  a: string;
  nota?: string;
  hacer: () => void;
}

export function EtapaAuto({ p, siguiente }: { p: Prospecto; siguiente?: SiguienteFase | null }) {
  const etapa = etapaDe(p);
  const i = CAMINO.indexOf(etapa as (typeof CAMINO)[number]);
  const hechas = reunionesDe(p);
  const reu = reunionDe(p, hoyISO());
  const n = numeroReunion(p);
  return (
    <section className="etapa-auto" aria-label="Etapa">
      <p className="etapa-actual">
        Etapa: <b>{etapa}</b>
        <small>avanza sola con la gestión</small>
      </p>
      {etapa !== ETAPA_PERDIDO && (
        <ol className="etapas">
          {CAMINO.map((e, k) => (
            <li key={e} className={k < i ? "ok" : k === i ? "on" : ""} aria-current={k === i ? "step" : undefined}>
              <span>{e}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="an-note">
        {hechas.length > 0 && `Reuniones hechas: ${hechas.map((h) => `${cortoReunion(h.n)} (${fmtFecha(h.fecha)})`).join(", ")}. `}
        {etapa === ETAPA_CERRADO || etapa === ETAPA_VENTA || etapa === ETAPA_PERDIDO || etapa === ETAPA_PRECIERRE
          ? ""
          : reu && reu.dias >= 0
            ? `${nombreReunion(n)}: ${reu.cuando} a las ${reu.hora}${lugarFrase(p)}.`
            : n <= REUNIONES_NORMALES
              ? `Siguiente: ${nombreReunion(n)} (agéndala en "+ acciones").`
              : "Ya hiciste las dos reuniones: cierra o da seguimiento."}
      </p>
      {siguiente && (
        <button type="button" className="btn small siguiente-fase" onClick={siguiente.hacer}>
          Pasar a {siguiente.a} →
          {siguiente.nota && <small>{siguiente.nota}</small>}
        </button>
      )}
    </section>
  );
}

/** Agendar la reunión que toca (la 3ª o más solo como caso especial, con motivo). */
export function PanelAgendar({ p, actualizar, alGuardar }: { p: Prospecto; actualizar: Actualizar; alGuardar: () => void }) {
  const avisar = useAviso();
  const n = numeroReunion(p);
  return (
    <FormReunion
      datos={p}
      titulo={nombreReunion(n)}
      especial={requiereCasoEspecial(p)}
      alGuardar={(cambios) => {
        actualizar((x) => ({ ...x, ...cambios }));
        avisar(`${cortoReunion(n)} agendada: envía la invitación o el recordatorio`);
        alGuardar();
      }}
    />
  );
}

/* ---------- Referidos ---------- */

export function Referidos({ p, actualizar, n }: { p: Prospecto; actualizar: Actualizar; n: number }) {
  const rs = referidosDe(p);
  const listos = referidosListos(p);
  const momento = momentoReferidos(p);
  const plegRef = usePlegado("referidos");
  const { contactos } = useBiblioteca();
  const fichas = useFichas();
  const avisar = useAviso();
  const base = useId();
  const nombre = txt(p, "nombre").split(/\s+/)[0] || "la persona";

  const set = (id: string, cambio: Partial<ReferidoPedido>) =>
    actualizar((x) => ({ ...x, referidos: referidosDe(x).map((r) => (r.id === id ? { ...r, ...cambio } : r)) }));

  const guardarEnBase = (r: ReferidoPedido) => {
    if (!referidoListo(r)) return avisar("Escribe el nombre y un celular válido");
    const ks = claves(r.celular, "");
    const repetido =
      contactos.find((c) => claves(c.celular, c.correo).some((k) => ks.includes(k)))?.nombre ??
      fichas.find((f) => claves(txt(f, "whatsapp"), txt(f, "correo")).some((k) => ks.includes(k)))?.nombre;
    if (repetido !== undefined) return avisar(`Ya está en tu base: ${String(repetido) || "sin nombre"}`);
    const c = contactoDeReferido(p, r);
    void biblioteca.guardar("contactos", c);
    set(r.id, { contactoId: c.id });
    avisar(`${r.nombre.trim()} quedó en tu Base de datos como referido de ${nombre}`);
  };

  return (
    <section className={"miss referidos" + (momento === "listos" ? " done" : "") + plegRef.clase} id="referidos" aria-labelledby="t-referidos">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          {momento === "listos" ? "✓" : n}
        </span>
        <TituloPlegable id="t-referidos" seccion="referidos">
          Referidos
        </TituloPlegable>
        <span className="mp">
          {listos}/{REFERIDOS_PEDIR}
        </span>
      </div>
      <p className={momento === "primera" || momento === "listos" ? "an-note" : "an-status warn"}>
        {momento === "primera" &&
          `Pide en esta primera reunión 3 personas a las que ${nombre} quiera obsequiar la asesoría.`}
        {momento === "segunda" && `No se pidieron en la primera reunión: pídelos en la segunda (${REFERIDOS_PEDIR - listos} pendientes).`}
        {momento === "tarde" && `Faltan ${REFERIDOS_PEDIR - listos} referidos: pídelos en el próximo contacto.`}
        {momento === "listos" && "Listos. Guárdalos en tu Base de datos para activar su cadena de mensajes."}
      </p>
      {rs.map((r, i) => (
        <div key={r.id} className="ref-fila">
          <p className="sub2">Referido {i + 1}</p>
          <div className="two">
            <div className="f">
              <label htmlFor={base + r.id + "n"}>
                <span>Nombre</span>
              </label>
              <input
                id={base + r.id + "n"}
                aria-label={`Nombre del referido ${i + 1}`}
                value={r.nombre}
                disabled={!!r.contactoId}
                onChange={(e) => set(r.id, { nombre: e.target.value })}
              />
            </div>
            <div className="f">
              <label htmlFor={base + r.id + "c"}>
                <span>Celular</span>
              </label>
              <input
                id={base + r.id + "c"}
                aria-label={`Celular del referido ${i + 1}`}
                type="tel"
                inputMode="tel"
                value={r.celular}
                disabled={!!r.contactoId}
                onChange={(e) => set(r.id, { celular: e.target.value })}
              />
            </div>
            <div className="f">
              <label htmlFor={base + r.id + "r"}>
                <span>Relación con {nombre}</span>
              </label>
              <select
                id={base + r.id + "r"}
                aria-label={`Relación del referido ${i + 1}`}
                value={r.relacion}
                disabled={!!r.contactoId}
                onChange={(e) => set(r.id, { relacion: e.target.value })}
              >
                <option value="">Elegir…</option>
                {RELACIONES.map((x) => (
                  <option key={x.l} value={x.l}>
                    {x.l}
                  </option>
                ))}
              </select>
            </div>
            <div className="f ref-accion">
              {r.contactoId ? (
                <p className="an-note">✓ En tu Base de datos</p>
              ) : (
                <button type="button" className="btn ghost small" disabled={!referidoListo(r)} onClick={() => guardarEnBase(r)}>
                  Guardar en Base de datos
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ---------- Pre-cierre ---------- */

export function PreCierre({
  p,
  actualizar,
  alVender,
  alVolver,
}: {
  p: Prospecto;
  actualizar: Actualizar;
  alVender: () => void;
  alVolver: () => void;
}) {
  const { planes, docs } = useBiblioteca();
  const recs = useMemo(() => recomendar(p, planes, docs), [p, planes, docs]);
  const rec = recs[0];
  const items = useFichas();
  const { ajustes } = useAjustesPerfil();
  const avisar = useAviso();
  const base = useId();
  const ps = productosDe(p);
  const plegPre = usePlegado("precierre");
  const total = totalMensual(ps);
  const hoy = hoyISO();
  const sim = simularCierre(items, p, hoy, ajustes?.objetivos);
  const meta = sim.con.escalones.find((e) => !e.logrado);

  const setPs = (fn: (ps: ProductoCierre[]) => ProductoCierre[]) => actualizar((x) => conProductos(x, fn(productosDe(x))));
  const setP = (id: string, cambio: Partial<ProductoCierre>) => setPs((xs) => xs.map((y) => (y.id === id ? { ...y, ...cambio } : y)));

  return (
    <section className={"miss precierre" + plegPre.clase} id="precierre" aria-labelledby="t-precierre">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          ✍️
        </span>
        <TituloPlegable id="t-precierre" seccion="precierre">
          Pre-cierre
        </TituloPlegable>
        <span className="mp">{total > 0 ? `${usd(total)}/mes` : "por llenar"}</span>
      </div>
      <p className="an-note">Lo que decidió el cliente. Si aplica más de un producto, agrégalo.</p>
      <MedicoCabecera p={p} actualizar={actualizar} />
      {rec && rec.ajuste > 0 && (
        <p className="an-status rec-sugerido">
          🧭 Recomendado para su caso: <b>{rec.item.plan.nombre}</b> ({rec.ajuste}% de lo que necesita, según tus
          documentos). Detalle en "+ acciones" → Plan recomendado.
        </p>
      )}
      <ValoresRecomendados p={p} recs={recs} actualizar={actualizar} />
      {ps.map((x, i) => {
        const otro = !!x.nombre && !planes.some((pl) => pl.nombre === x.nombre);
        return (
          <div key={x.id} className="producto">
            <p className="sub2">
              Producto {i + 1}
              {ps.length > 1 && (
                <button
                  type="button"
                  className="quitar"
                  aria-label={`Quitar producto ${i + 1}`}
                  onClick={() => setPs((xs) => xs.filter((y) => y.id !== x.id))}
                >
                  ×
                </button>
              )}
            </p>
            <div className="f">
              <label htmlFor={base + x.id + "p"}>
                <span>Producto seleccionado</span>
              </label>
              {planes.length > 0 ? (
                <select
                  id={base + x.id + "p"}
                  value={otro ? "__otro" : (x.planId ?? (x.nombre ? planes.find((pl) => pl.nombre === x.nombre)?.id : "") ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    const pl = planes.find((y) => y.id === v);
                    setP(x.id, v === "__otro" ? { planId: undefined, nombre: x.nombre || " " } : { planId: pl?.id, nombre: pl?.nombre ?? "" });
                  }}
                >
                  <option value="">Elegir…</option>
                  {planes.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.nombre}
                    </option>
                  ))}
                  <option value="__otro">Otro (escribirlo)</option>
                </select>
              ) : (
                <input id={base + x.id + "p"} value={x.nombre} placeholder="Nombre del plan" onChange={(e) => setP(x.id, { nombre: e.target.value })} />
              )}
              {planes.length > 0 && otro && (
                <input
                  aria-label={`Nombre del producto ${i + 1}`}
                  style={{ marginTop: 8 }}
                  value={x.nombre.trim() ? x.nombre : ""}
                  placeholder="Nombre del plan"
                  onChange={(e) => setP(x.id, { nombre: e.target.value || " " })}
                />
              )}
            </div>
            <div className="two">
              <div className="f">
                <label htmlFor={base + x.id + "d"}>
                  <span>Monto de deducible (USD)</span>
                </label>
                <input id={base + x.id + "d"} inputMode="decimal" value={x.deducible} onChange={(e) => setP(x.id, { deducible: e.target.value })} />
              </div>
              <div className="f">
                <label htmlFor={base + x.id + "m"}>
                  <span>Valor a pagar mensual (USD)</span>
                </label>
                <input id={base + x.id + "m"} inputMode="decimal" value={x.mensual} onChange={(e) => setP(x.id, { mensual: e.target.value })} />
              </div>
            </div>
          </div>
        );
      })}
      <button type="button" className="btn ghost small" onClick={() => setPs((xs) => [...xs, nuevoProducto()])}>
        + Agregar otro producto
      </button>
      {tipoDe(p) === "cambio" && (
        <div className="f" style={{ marginTop: 14 }}>
          <label htmlFor={base + "gana"}>
            <span>¿Qué gana frente a su póliza actual?</span>
          </label>
          <textarea id={base + "gana"} rows={2} value={txt(p, "gana")} onChange={(e) => actualizar((x) => ({ ...x, gana: e.target.value }))} />
        </div>
      )}

      <IdentAsegurados p={p} actualizar={actualizar} />

      <div className="simulacion" aria-label="Simulación del objetivo">
        <h3 className="sub2">Simulación en tu objetivo del mes</h3>
        <BarraObjetivo o={sim.hoy} simulado={sim.con.prima} etiqueta="Simulación del objetivo con esta venta" />
        <p className="sim-txt">
          Hoy: <b>{usd(sim.hoy.prima)}</b> ({sim.hoy.pct}%) → con esta venta: <b>{usd(sim.con.prima)}</b> ({sim.con.pct}%)
        </p>
        {sim.desbloquea.length > 0 ? (
          <p className="an-status ok">
            Con esta venta llegas a {sim.desbloquea.map((d) => usd(d.prima) + (d.detalle ? ` (${d.detalle})` : "")).join(" y ")}.
          </p>
        ) : meta ? (
          <p className="an-note">
            Después de esta venta te faltarían {usd(meta.falta)} para {usd(meta.prima)}
            {meta.clientes !== null ? ` (≈ ${meta.clientes} ${meta.clientes === 1 ? "cliente" : "clientes"})` : ""}.
          </p>
        ) : (
          <p className="an-status ok">Ya cumpliste todos tus objetivos del mes: esta venta suma de más.</p>
        )}
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn venta"
          onClick={() => {
            const e = errorVenta(p);
            if (e) return avisar(e);
            alVender();
          }}
        >
          Venta exitosa
        </button>
        <button type="button" className="btn ghost small" onClick={alVolver}>
          Aún no decide: volver a seguimiento
        </button>
      </div>
    </section>
  );
}

/* ---------- Documentos del cierre ---------- */

export function DocsCierre({ p, actualizar }: { p: Prospecto; actualizar: Actualizar }) {
  const avisar = useAviso();
  const base = useId();
  const d = p.docsCierre ?? {};
  const listos = docsCierreListos(p);

  const cargar = async (doc: string, f: File | undefined) => {
    if (!f) return;
    const e = errorDocCierre(f);
    if (e) return avisar(e);
    await biblioteca.ponerArchivo(idDocCierre(p.id, doc), f);
    actualizar((x) => ({
      ...x,
      docsCierre: { ...(x.docsCierre ?? {}), [doc]: { nombre: f.name, tipo: f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : "image/jpeg"), bytes: f.size } },
    }));
    avisar(`${DOCS_CIERRE.find((x) => x.id === doc)?.l} cargado`);
  };

  const ver = async (doc: string) => {
    const b = await biblioteca.archivo(idDocCierre(p.id, doc));
    if (!b) return avisar("No encuentro el archivo en este navegador: cárgalo otra vez");
    const url = URL.createObjectURL(b);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const quitar = async (doc: string) => {
    await biblioteca.ponerArchivo(idDocCierre(p.id, doc), null);
    actualizar((x) => {
      const resto = { ...(x.docsCierre ?? {}) };
      delete resto[doc];
      return { ...x, docsCierre: resto };
    });
  };

  return (
    <div className="docs-cierre" aria-label="Documentos del cierre">
      <p className="sub2">
        Documentos ({listos.hechos}/{listos.total}) · JPEG o PDF, hasta {MAX_MB_DOC_CIERRE} MB
      </p>
      {DOCS_CIERRE.map((x) => {
        const a = d[x.id];
        return (
          <div key={x.id} className={"doc-cierre" + (a ? " ok" : "")}>
            <div>
              <b>{x.l}</b>
              <small>{a ? `${a.nombre} · ${Math.max(1, Math.round(a.bytes / 1024))} KB` : "Pendiente"}</small>
            </div>
            {a && (
              <>
                <button type="button" className="btn ghost small" onClick={() => void ver(x.id)}>
                  Ver
                </button>
                <button type="button" className="quitar" aria-label={`Quitar ${x.l}`} onClick={() => void quitar(x.id)}>
                  ×
                </button>
              </>
            )}
            <label className="btn ghost small" htmlFor={base + x.id}>
              {a ? "Cambiar" : "Cargar"}
            </label>
            <input
              id={base + x.id}
              hidden
              type="file"
              accept="image/jpeg,application/pdf,.jpg,.jpeg,.pdf"
              aria-label={`Cargar ${x.l}`}
              onChange={(e) => {
                void cargar(x.id, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        );
      })}
      <p className="an-note">
        Los archivos quedan solo en este navegador (no van en la copia de seguridad): guarda también los originales.
      </p>
    </div>
  );
}

/* ---------- Identificación de los asegurados (pre-cierre) ---------- */

function IdentAsegurados({ p, actualizar }: { p: Prospecto; actualizar: Actualizar }) {
  const base = useId();
  const hoy = hoyISO();
  const pers = personasDe(p);
  const completos = pers.filter((x) => estadoIdentificacion(x, hoy).completo).length;
  const set = (pid: string, campo: CampoPersona, v: string) => actualizar((x) => editarPersona(x, pid, campo, v));
  return (
    <section className="ident" aria-labelledby={base + "t"}>
      <h3 className="sub2" id={base + "t"}>
        Identificación de los asegurados ({completos}/{pers.length})
      </h3>
      <p className="an-note">Número de cédula o pasaporte y las fechas del documento de cada persona a asegurar.</p>
      {pers.map((per, i) => {
        const est = estadoIdentificacion(per, hoy);
        const nombre = etiquetaPersona(per, i);
        const id = (k: string) => base + per.id + k;
        return (
          <div key={per.id} className={"ident-p" + (est.completo && !est.avisos.length ? " ok" : "")} aria-label={`Identificación de ${nombre}`}>
            <p className="sub2">
              {i === 0 ? "Titular" : per.rol}: {nombre}
              {i > 0 && (
                <button
                  type="button"
                  className="quitar"
                  aria-label={`Quitar a ${nombre}`}
                  onClick={() => actualizar((x) => quitarPersona(x, per.id))}
                >
                  ×
                </button>
              )}
            </p>
            {i > 0 && (
              <div className="two">
                <div className="f">
                  <label htmlFor={id("n")}>
                    <span>Nombre</span>
                  </label>
                  <input id={id("n")} value={per.nombre} onChange={(e) => set(per.id, "nombre", e.target.value)} />
                </div>
                <div className="f">
                  <label htmlFor={id("r")}>
                    <span>Parentesco</span>
                  </label>
                  <select id={id("r")} value={per.rol} onChange={(e) => set(per.id, "rol", e.target.value)}>
                    {ROLES_PERSONA.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="f">
              <label htmlFor={id("i")}>
                <span>Número de identificación</span>
              </label>
              <input
                id={id("i")}
                aria-label={`Número de identificación de ${nombre}`}
                value={per.ident ?? ""}
                placeholder="Cédula o pasaporte"
                autoComplete="off"
                onChange={(e) => set(per.id, "ident", e.target.value.toUpperCase())}
              />
            </div>
            <div className="two">
              <div className="f">
                <label htmlFor={id("e")}>
                  <span>Fecha de emisión</span>
                </label>
                <input
                  id={id("e")}
                  type="date"
                  aria-label={`Fecha de emisión del documento de ${nombre}`}
                  value={per.identEmision ?? ""}
                  onChange={(e) => set(per.id, "identEmision", e.target.value)}
                />
              </div>
              <div className="f">
                <label htmlFor={id("x")}>
                  <span>Fecha de expiración</span>
                </label>
                <input
                  id={id("x")}
                  type="date"
                  aria-label={`Fecha de expiración del documento de ${nombre}`}
                  value={per.identExpira ?? ""}
                  onChange={(e) => set(per.id, "identExpira", e.target.value)}
                />
              </div>
            </div>
            {est.avisos.map((a) => (
              <p key={a} className="an-status warn">
                {a}
              </p>
            ))}
          </div>
        );
      })}
      {pers.length < MAX_PERSONAS && (
        <button type="button" className="btn ghost small" onClick={() => actualizar((x) => setNumeroPersonas(x, personasDe(x).length + 1))}>
          + Agregar asegurado
        </button>
      )}
    </section>
  );
}

/** Médico de cabecera: solo si tiene, se despliega; si no, se sigue con el pre-cierre. */
function MedicoCabecera({ p, actualizar }: { p: Prospecto; actualizar: Actualizar }) {
  const base = useId();
  const m = medicoDe(p);
  const tiene = txt(p, "medicoCabecera");
  const set = (k: string, v: string) => actualizar((x) => ({ ...x, [k]: v }));
  const campo = (k: string, l: string, ph: string) => (
    <div className="f">
      <label htmlFor={base + k}>
        <span>{l}</span>
      </label>
      <input id={base + k} value={txt(p, k)} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
  return (
    <div className="medico-cabecera">
      <p className="sub2">¿Tiene médico de cabecera?</p>
      <div className="ideas" role="group" aria-label="¿Tiene médico de cabecera?">
        {["Sí", "No"].map((o) => (
          <button key={o} type="button" className="chip" aria-pressed={tiene === o} onClick={() => set("medicoCabecera", tiene === o ? "" : o)}>
            {o}
          </button>
        ))}
      </div>
      {m.tiene && (
        <>
          <div className="two" style={{ marginTop: 10 }}>
            {campo("medicoNombre", "Nombre del médico", "Dr. / Dra.")}
            {campo("medicoEspecialidad", "Especialidad", "Medicina general, pediatría…")}
          </div>
          {campo("medicoLugar", "Consultorio o clínica donde lo atiende", "Clínica, centro médico…")}
          <p className="sub2" style={{ marginTop: 10 }}>
            ¿Tiene problema en atenderse con la red de convenio?
          </p>
          <div className="ideas" role="group" aria-label="¿Tiene problema en atenderse con la red de convenio?">
            {/* redConvenio = "Sí": acepta atenderse en la red de convenio. */}
            {[
              ["Sí", "No tiene problema"],
              ["No", "Prefiere seguir con su médico"],
            ].map(([v, l]) => (
              <button key={v} type="button" className="chip" aria-pressed={txt(p, "redConvenio") === v} onClick={() => set("redConvenio", v)}>
                {l}
              </button>
            ))}
          </div>
          <p className="an-status medico-consejo">🩺 {consejoModalidad(m)}</p>
          {m.aceptaRed && <p className="an-note">Verifica que su médico esté en la red de convenio ({VALIDAR}).</p>}
        </>
      )}
      {tiene === "No" && <p className="an-note">Sin médico de cabecera: continúa con el producto.</p>}
    </div>
  );
}

/** Cuántas recomendaciones se muestran con su valor mensual (más las que ya están en la propuesta). */
const MAX_VALORES_REC = 3;

/**
 * Valor mensual por recomendación: cada plan recomendado con su valor (el de
 * sus documentos o el que escribas). Al sumarlo, ese valor va al producto y a
 * la inversión de la propuesta.
 */
function ValoresRecomendados({ p, recs, actualizar }: { p: Prospecto; recs: Recomendacion[]; actualizar: Actualizar }) {
  const base = useId();
  const { usar, quitar } = usePlanEnPropuesta(actualizar);
  const filas = recs.filter((r, i) => i < MAX_VALORES_REC || tieneProducto(p, r.item.plan));
  if (!filas.length) return null;
  return (
    <div className="valores-rec" role="group" aria-label="Valor mensual por recomendación">
      <p className="sub2">Valor mensual por recomendación</p>
      <p className="an-note">Escribe el valor de cada plan recomendado: es la inversión que va en el informe.</p>
      {filas.map((r, i) => {
        const pl = r.item.plan;
        const valor = valorRecomendado(p, pl, r.precio);
        const en = tieneProducto(p, pl);
        const id = base + i;
        return (
          <div key={pl.id} className={"valor-rec" + (en ? " en" : "")}>
            <div className="valor-rec-plan">
              <b>{pl.nombre}</b>
              <small>
                {i === 0 ? "Mejor opción · " : ""}
                {r.ajuste}% de lo que necesita{r.noApta ? " · red cerrada" : ""}
              </small>
            </div>
            <div className="f">
              <label htmlFor={id}>
                <span>Valor mensual (USD)</span>
              </label>
              <input
                id={id}
                inputMode="decimal"
                value={valor}
                placeholder={r.precio === null ? "No está en sus documentos" : ""}
                onChange={(e) => actualizar((x) => fijarValorRec(x, pl, e.target.value))}
              />
            </div>
            {en ? (
              <button type="button" className="btn ghost small" onClick={() => quitar(r)}>
                ✓ En la propuesta · Quitar
              </button>
            ) : (
              <button type="button" className="btn small" onClick={() => usar(r, valor)}>
                Sumar a la propuesta
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
