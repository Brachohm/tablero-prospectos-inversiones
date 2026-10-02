/**
 * Camino al cierre en la ficha: etapa automática, reuniones (dos por
 * cliente), los tres referidos, el pre-cierre con su simulación y los
 * documentos del cierre.
 */
import { FormReunion } from "./Reunion";
import { TituloPlegable } from "./comunes";
import { usePlegado } from "./plegado";
import { lugarFrase } from "../domain/reunion";
import { useId } from "react";
import { TIPOS_PLAN } from "../config/ficha";
import { comisionDe } from "../domain/comisiones";
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
  const { planes } = useBiblioteca();
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
  const com = comisionDe(p, ajustes?.comisiones);

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
      <div className="two">
        <div className="f">
          <label htmlFor={base + "tipoPlan"}>
            <span>Tipo de plan</span>
          </label>
          <select id={base + "tipoPlan"} value={txt(p, "tipoPlan")} onChange={(e) => actualizar((x) => ({ ...x, tipoPlan: e.target.value }))}>
            <option value="">Elegir…</option>
            {TIPOS_PLAN.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor={base + "plazo"}>
            <span>Plazo (años)</span>
          </label>
          <input id={base + "plazo"} inputMode="numeric" value={txt(p, "plazo")} onChange={(e) => actualizar((x) => ({ ...x, plazo: e.target.value }))} />
        </div>
      </div>
      {com ? (
        <p className="an-status">
          💼 Comisión estimada: <b>{usd(com.monto)}</b> ({com.pct}% sobre {usd(com.base)})
        </p>
      ) : (
        !ajustes?.comisiones?.length && (
          <p className="an-note">💼 Escribe tu tabla de comisiones en Configuración → Perfil para ver la comisión estimada.</p>
        )
      )}
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
                <label htmlFor={base + x.id + "m"}>
                  <span>{txt(p, "tipoPlan") === "Contribución única" ? "Aporte único (USD)" : "Aporte mensual (USD)"}</span>
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
            <span>¿Qué gana frente a su inversión actual?</span>
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


/**
 * Valor mensual por recomendación: cada plan recomendado con su valor (el de
 * sus documentos o el que escribas). Al sumarlo, ese valor va al producto y a
 * la inversión de la propuesta.
 */
