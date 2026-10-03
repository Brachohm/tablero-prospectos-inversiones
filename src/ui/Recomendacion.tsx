/**
 * Plan recomendado: lo que necesita (leído de la ficha) frente a lo que dicen
 * los PDF de la Biblioteca de cada plan. Cada razón cita el documento y la
 * página; lo que no aparece queda "por confirmar".
 */
import { useMemo } from "react";
import { VALIDAR } from "../config/saludsa";
import { productosDe, tieneProducto, totalMensual, valorRecomendado } from "../domain/cierre";
import { usePlanEnPropuesta } from "./usarPlan";
import { fmtUSD } from "../domain/oferta";
import { fichaPlan, nombreCategoria } from "../domain/bondades";
import { necesidadesDe, presupuestoDe, recomendar, type Recomendacion, type RevisionNecesidad } from "../domain/recomendar";
import type { Prospecto } from "../domain/tipos";
import { useBiblioteca } from "../store/biblioteca";
import { ir } from "./router";

const ICONO = { cubre: "✅", falta: "❌", "?": "❔" } as const;

function Revision({ r }: { r: RevisionNecesidad }) {
  return (
    <li className={`rec-${r.veredicto === "?" ? "pend" : r.veredicto}`}>
      <span aria-hidden="true">{ICONO[r.veredicto]}</span>
      <div>
        <b>{r.n.l}</b>
        {r.ev ? (
          <>
            <span> — {r.ev.t}</span>
            <small>{r.ev.fuente}</small>
          </>
        ) : (
          <small>Por confirmar: no lo encontré en sus documentos ({VALIDAR}).</small>
        )}
        {r.avisos.map((a) => (
          <small key={a.t} className="rec-ojo">
            Ojo: {a.t} · {a.fuente}
          </small>
        ))}
      </div>
    </li>
  );
}

function Tarjeta({
  r,
  mejor,
  usado,
  usar,
  quitar,
}: {
  r: Recomendacion;
  mejor: boolean;
  usado: boolean;
  usar: (r: Recomendacion) => void;
  quitar: (r: Recomendacion) => void;
}) {
  const pl = r.item.plan;
  const ficha = useMemo(() => fichaPlan(r.item), [r.item]);
  return (
    <article className={"rec-plan" + (mejor ? " mejor" : "")} aria-label={pl.nombre}>
      <div className="rec-cab">
        {mejor && <span className="tag">Mejor opción</span>}
        <h3>{pl.nombre}</h3>
        <div className="rec-ajuste" aria-label={`Ajuste a sus necesidades: ${r.ajuste}%`}>
          <b>{r.ajuste}%</b>
          <small>de lo que necesita, respaldado</small>
          <div className="rec-barra">
            <i style={{ width: `${r.ajuste}%` }} />
          </div>
        </div>
      </div>
      <p className="rec-precio">
        {r.precio !== null ? `Aporte mínimo: ${fmtUSD(r.precio)} al mes` : "Aporte mínimo: no está en sus documentos"}
        {r.fueraPresupuesto && <span className="falta"> · pide más de lo que puede aportar</span>}
      </p>
      {r.item.virtual && (
        <p className="an-note">Leído de: {r.item.docs.map((d) => d.nombre).join(", ")} (aún no está guardado en Planes).</p>
      )}
      <ul className="rec-lista">
        {r.revision.map((x) => (
          <Revision key={x.n.id} r={x} />
        ))}
      </ul>
      {ficha.destacados.length > 0 && (
        <div className="rec-destacados" aria-label={`Lo más importante de ${pl.nombre}`}>
          {ficha.destacados.map((d) => (
            <div key={d.id}>
              <small>{d.l}</small>
              <b>{d.v}</b>
            </div>
          ))}
        </div>
      )}
      {ficha.bondades.length > 0 && (
        <details className="rec-bondades">
          <summary>Bondades para el cierre ({ficha.bondades.length})</summary>
          <ul>
            {ficha.bondades.map((b) => (
              <li key={b.t}>
                <span className="tag">{nombreCategoria(b.categoria)}</span> {b.t}
                <small>{b.fuente}</small>
              </li>
            ))}
          </ul>
        </details>
      )}
      {usado ? (
        <div className="rec-usado">
          <span>✓ En la propuesta</span>
          <button type="button" className="btn ghost small" onClick={() => quitar(r)}>
            Quitar
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => usar(r)}>
          {mejor ? "Usar en la propuesta" : "Sumar a la propuesta"}
        </button>
      )}
    </article>
  );
}

export function PlanRecomendado({ p, actualizar }: { p: Prospecto; actualizar: (fn: (p: Prospecto) => Prospecto) => void }) {
  const b = useBiblioteca();
  const necesidades = necesidadesDe(p);
  const { limite, porPrecio } = presupuestoDe(p);
  const recs = useMemo(() => recomendar(p, b.planes, b.docs), [p, b.planes, b.docs]);
  const [mejor, ...resto] = recs;

  const { usar: sumar, quitar } = usePlanEnPropuesta(actualizar);
  const usar = (r: Recomendacion) => sumar(r, valorRecomendado(p, r.item.plan, r.precio));
  const elegidos = productosDe(p).filter((x) => x.nombre.trim());
  const totalElegidos = totalMensual(elegidos);

  return (
    <section className="miss recomendar" aria-labelledby="t-recomendar" id="recomendar">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          🧭
        </span>
        <h2 id="t-recomendar">Plan recomendado</h2>
        {recs.length > 0 && <span className="mp">{recs.length} planes revisados</span>}
      </div>
      <p className="an-note">
        Comparo lo que necesita con lo que dicen tus documentos de la Biblioteca, plan por plan. Cada razón cita el
        documento y la página; lo que no aparece queda por confirmar.
      </p>

      <h3 className="sub2">Lo que necesita</h3>
      <div className="ideas" role="group" aria-label="Lo que necesita">
        {necesidades.map((n) => (
          <span key={n.id} className={"chip nec-" + n.peso} title={n.por}>
            {n.peso === 3 ? "★ " : ""}
            {n.l}
          </span>
        ))}
        {limite !== null && <span className="chip">Aporta hasta {fmtUSD(limite)} al mes</span>}
        {porPrecio && <span className="chip">Cuida los costos</span>}
      </div>
      <p className="an-note">★ = clave para esta persona. Mientras más completa la ficha, más fina la recomendación.</p>

      {!mejor ? (
        <p className="an-status warn">
          Aún no hay planes ni documentos de planes en tu Biblioteca.{" "}
          <button type="button" className="enlace" onClick={() => ir({ v: "biblioteca", sec: "docs" })}>
            Carga los PDF de tus planes
          </button>{" "}
          (condiciones, ficha del plan o tabla de costos, con el nombre del plan) para recomendar.
        </p>
      ) : (
        <>
          {elegidos.length > 0 && (
            <p className="an-status rec-elegidos" aria-label="Planes en la propuesta">
              En la propuesta: <b>{elegidos.map((x) => x.nombre.trim()).join(" + ")}</b>
              {totalElegidos > 0 && ` · ${fmtUSD(totalElegidos)} al mes`}
            </p>
          )}
          <Tarjeta r={mejor} mejor usado={tieneProducto(p, mejor.item.plan)} usar={usar} quitar={quitar} />
          {resto.length > 0 && (
            <details className="rec-otros">
              <summary>Otros planes ({resto.length})</summary>
              {resto.map((r) => (
                <Tarjeta key={r.item.plan.id} r={r} mejor={false} usado={tieneProducto(p, r.item.plan)} usar={usar} quitar={quitar} />
              ))}
            </details>
          )}
          <p className="an-note">Recomendación con lo que dicen tus documentos: {VALIDAR} antes de presentarla.</p>
        </>
      )}
    </section>
  );
}
