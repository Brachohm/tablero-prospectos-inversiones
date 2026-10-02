/** Proyección del plan en tres escenarios (rendimientos supuestos, no garantizados). */
import { AVISO_PROYECCION, ESCENARIOS_L, type Escenarios } from "../config/proyeccion";
import { usd } from "../domain/fechas";
import type { Proyeccion as ProyeccionT } from "../domain/proyeccion";

const CLAVES = Object.keys(ESCENARIOS_L) as (keyof Escenarios)[];

export function Proyeccion({ x }: { x: ProyeccionT }) {
  return (
    <section className="proyeccion" aria-label="Proyección del plan">
      <p className="sub2">📈 Proyección a {x.anios} años</p>
      <p className="an-note">
        Aporta en total <b>{usd(x.final.aportado)}</b>
        {x.mensual > 0 ? ` (${usd(x.mensual)} al mes)` : ""}
        {x.unico > 0 ? ` (aporte único de ${usd(x.unico)})` : ""}.
      </p>
      <div className="proy-esc">
        {CLAVES.map((k) => (
          <div key={k} className={"proy-c proy-" + k}>
            <small>
              {ESCENARIOS_L[k]} · {x.tasas[k]}% anual
            </small>
            <b>{usd(Math.round(x.final[k]))}</b>
            {x.alcanza && <span>{x.alcanza[k] ? "✓ alcanza la meta" : "no alcanza la meta"}</span>}
          </div>
        ))}
      </div>
      {x.puntos.length > 1 && (
        <div className="proy-scroll">
        <table className="proy-tabla">
          <caption className="sr-only">Valor estimado por año</caption>
          <thead>
            <tr>
              <th scope="col">Año</th>
              <th scope="col">Aportado</th>
              {CLAVES.map((k) => (
                <th key={k} scope="col" aria-label={ESCENARIOS_L[k]}>
                  {ESCENARIOS_L[k].slice(0, 4)}.
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {x.puntos.map((pt) => (
              <tr key={pt.anio}>
                <th scope="row">{pt.anio}</th>
                <td>{usd(Math.round(pt.aportado))}</td>
                {CLAVES.map((k) => (
                  <td key={k}>{usd(Math.round(pt[k]))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {x.meta && <p className="an-note">Su meta: {usd(x.meta)}.</p>}
      <p className="an-note">{AVISO_PROYECCION}</p>
    </section>
  );
}
