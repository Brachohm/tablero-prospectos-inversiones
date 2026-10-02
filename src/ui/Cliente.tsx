/** Sección "Cerrado": plan contratado, emisión, renovación, documentos, posventa y referidos. */
import { CAMPOS_CLIENTE, POSVENTA } from "../config/crm";
import { posventaHecha, referidosDe, renovacionCliente } from "../domain/crm";
import { fmtFecha, hoyISO } from "../domain/fechas";
import { etapaDe, txt } from "../domain/ficha";
import type { Prospecto } from "../domain/tipos";
import { useFichas } from "../store/store";
import { useAviso } from "./hooks";
import { Campo, type Cambiar } from "./Campo";
import { ir } from "./router";
import { DocsCierre } from "./Cierre";
import { TituloPlegable } from "./comunes";
import { usePlegado } from "./plegado";
import { faltaCierre } from "../domain/cierre";

export function Cliente({ p, cambiar, actualizar }: { p: Prospecto; cambiar: Cambiar; actualizar: (fn: (p: Prospecto) => Prospecto) => void }) {
  const items = useFichas();
  const avisar = useAviso();
  const ren = renovacionCliente(p, hoyISO());
  const pv = posventaHecha(p);
  const refs = referidosDe(items, p.id);
  const falta = faltaCierre(p);
  const pleg = usePlegado("cerrado");
  return (
    <section className={"miss cli" + (pv.hechos === pv.total ? " done" : "") + pleg.clase} id="cerrado" aria-labelledby="t-cerrado">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          🤝
        </span>
        <TituloPlegable id="t-cerrado" seccion="cerrado">
          Cerrado
        </TituloPlegable>
        <span className="mp">
          Posventa {pv.hechos}/{pv.total}
        </span>
      </div>
      {falta.length > 0 ? (
        <p className="an-status warn">
          Venta exitosa. Para pasar a Cerrados falta: {falta.join(", ")}.
        </p>
      ) : (
        <p className="an-status ok">Cierre completo: está en Cerrados.</p>
      )}
      <div className="two">
        {CAMPOS_CLIENTE.map((c) => (
          <Campo key={c.k} c={c} p={p} cambiar={cambiar} />
        ))}
      </div>
      {ren && (
        <p className="an-note" style={{ marginTop: -4, marginBottom: 12 }}>
          Próxima renovación: <b>{fmtFecha(ren.fecha)}</b>
          {ren.estimada && " (estimada a un año de la emisión; confírmala con la póliza)"}
        </p>
      )}
      <DocsCierre p={p} actualizar={actualizar} />
      <p className="sub2">Acompañamiento después de la venta</p>
      <div className="checks">
        {POSVENTA.map((x) => {
          const on = p[x.k] === true;
          return (
            <label key={x.k} className={"ck" + (on ? " on" : "")}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => {
                  cambiar(x.k, e.target.checked);
                  if (e.target.checked) avisar("Posventa ✓");
                }}
              />
              <span>{x.l}</span>
            </label>
          );
        })}
      </div>
      <p className="sub2">Referidos</p>
      {refs.length > 0 ? (
        <ul className="refs">
          {refs.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => ir({ v: "ficha", id: r.id })}>
                {txt(r, "nombre") || "Sin nombre"} · {etapaDe(r)}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="an-note" style={{ marginBottom: 10 }}>
          Aún no te ha referido a nadie.
        </p>
      )}
      <div className="actions" style={{ marginTop: 0 }}>
        <button type="button" className="btn ghost small" onClick={() => ir({ v: "nueva", tipo: "nuevo", ref: p.id })}>
          + Referido que quiere contratar
        </button>
        <button type="button" className="btn ghost small" onClick={() => ir({ v: "nueva", tipo: "cambio", ref: p.id })}>
          + Referido que quiere cambiarse
        </button>
      </div>
    </section>
  );
}
