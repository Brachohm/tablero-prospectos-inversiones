/** Objetivo del mes: tu propósito, los aportes cerrados y tus objetivos (1 a 4) con su beneficio. */
import type { CSSProperties } from "react";
import { usd } from "../domain/fechas";
import { nombreMes, objetivoMes, type Objetivo as ObjetivoT } from "../domain/objetivos";
import type { Prospecto } from "../domain/tipos";
import { useAjustesPerfil } from "./hooks";
import { ir } from "./router";

export function Objetivo({ items, hoy }: { items: readonly Prospecto[]; hoy: string }) {
  const { ajustes, perfil } = useAjustesPerfil();
  const o = objetivoMes(items, hoy, ajustes?.objetivos);
  const proposito = perfil.proposito?.trim();
  const siguiente = o.escalones.find((e) => !e.logrado);
  return (
    <section className="objetivo" aria-labelledby="t-objetivo">
      <h2 id="t-objetivo">
        <span aria-hidden="true">🎯</span> Objetivo de {nombreMes(o.mes)}
        <small>{o.diasRestantes === 0 ? "último día" : `${o.diasRestantes} ${o.diasRestantes === 1 ? "día" : "días"} restantes`}</small>
      </h2>
      <p className="obj-cifra">
        <b>{usd(o.prima)}</b> de {usd(o.meta)} en aportes cerrados
        <span>
          {o.cierres} {o.cierres === 1 ? "contrato cerrado" : "contratos cerrados"}
          {o.comision > 0 && ` · comisión estimada ${usd(o.comision)}`}
        </span>
      </p>
      {proposito ? (
        <p className="proposito" aria-label="Mi propósito">
          <small>Mi propósito</small>
          {proposito}
        </p>
      ) : (
        <button type="button" className="enlace proposito-vacio" onClick={() => ir({ v: "ajustes", sec: "perfil" })}>
          ✍️ Escribe tu propósito: el para qué de tu trabajo
        </button>
      )}
      <BarraObjetivo o={o} simulado={o.prima + o.enPrecierre} />
      {o.enPrecierre > 0 && (
        <p className="obj-sim-nota">
          <i aria-hidden="true" /> En pre-cierre: {usd(o.enPrecierre)}. Si se cierran, llegas a {usd(o.prima + o.enPrecierre)}.
        </p>
      )}
      <ul className="obj-escalones">
        {o.escalones.map((e) => (
          <li key={e.prima} className={e.logrado ? "on" : ""}>
            <span className="obj-ic" aria-hidden="true">
              {e.logrado ? "🔓" : "🔒"}
            </span>
            <span>
              <b>
                {usd(e.prima)}
                {e.detalle ? ` → ${e.detalle}` : ""}
              </b>
              <small>
                {e.logrado
                  ? "¡Desbloqueado este mes!"
                  : `Te faltan ${usd(e.falta)}` +
                    (e.clientes !== null ? ` · ≈ ${e.clientes} ${e.clientes === 1 ? "cliente" : "clientes"}` : "")}
              </small>
            </span>
          </li>
        ))}
      </ul>
      <p className="an-note">
        {o.promedio !== null
          ? `Estimado con tu aporte promedio de ${usd(o.promedio)} (${o.base === "cierres" ? "tus cierres" : "tus propuestas"}).`
          : 'Pon el aporte en el pre-cierre de tus fichas para estimar cuántos clientes te faltan.'}
        {siguiente && o.enJuego > 0 && ` Tienes ${usd(o.enJuego)} en propuestas abiertas.`}
      </p>
    </section>
  );
}

/** Barra del objetivo: lo cerrado y, rayado, lo que se sumaría (simulación del pre-cierre). */
export function BarraObjetivo({ o, simulado, etiqueta = "Aportes cerrados" }: { o: ObjetivoT; simulado?: number; etiqueta?: string }) {
  const tope = Math.max(o.meta, ...o.escalones.map((e) => e.prima));
  const ancho = Math.min(100, (o.prima / tope) * 100);
  const sim = simulado !== undefined && simulado > o.prima ? Math.min(100, (simulado / tope) * 100) : 0;
  return (
    <div
      className="obj-barra"
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={tope}
      aria-valuenow={o.prima}
      aria-valuetext={`${usd(o.prima)} de ${usd(o.meta)}` + (sim ? ` (con la simulación: ${usd(simulado!)})` : "")}
    >
      {sim > 0 && <b className="obj-sim" style={{ width: sim + "%" }} aria-hidden="true" />}
      <i style={{ width: ancho + "%" }} />
      {o.escalones.map((e) => (
        <span
          key={e.prima}
          className={"obj-marca" + (e.logrado ? " on" : "") + (simulado !== undefined && simulado >= e.prima && !e.logrado ? " sim" : "")}
          style={{ "--x": (e.prima / tope) * 100 + "%" } as CSSProperties}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
