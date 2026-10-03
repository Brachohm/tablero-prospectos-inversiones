/** Resúmenes calculados dentro de la ficha: metas, flujo del mes y perfil de riesgo. */
import { ahorroMetaDe, APORTE_COMODO_PCT, capacidadDe, fondoEmergenciaDe, proyeccionAhorroDe, DEUDA_ALTA_PCT, metaRetiroDe, metasDe, pesoDeudas, puntajePerfil } from "../domain/finanzas";
import { usd } from "../domain/fechas";
import { txt } from "../domain/ficha";
import type { Prospecto } from "../domain/tipos";
import type { ProyeccionAhorro as ProyeccionAhorroT } from "../domain/finanzas";

export function ResumenMetas({ p }: { p: Prospecto }) {
  const a = ahorroMetaDe(p);
  const pa = proyeccionAhorroDe(p);
  const r = !a && txt(p, "meta") === "Retiro o jubilación" ? metaRetiroDe(p) : null;
  const metas = metasDe(p);
  if (!a && !r && metas.length < 2) {
    if (txt(p, "metaMonto") && txt(p, "edadRetiro") && !txt(p, "edad"))
      return <p className="an-note">Escribe su edad en Datos del prospecto para calcular cuánto ahorrar.</p>;
    return null;
  }
  return (
    <div className="an-status resumen-fin" aria-label="Resumen de metas">
      {pa ? (
        <ProyeccionAhorro x={pa} />
      ) : a && (
        <p>
          🎯 Para contar con <b>{usd(a.monto)}</b> a los {a.edadRetiro} años le quedan <b>{a.anios} años</b> trabajando: necesita
          ahorrar cerca de <b>{usd(a.anual)} al año</b>, es decir <b>{usd(a.mensual)} al mes</b>. Sin contar rendimiento: con
          rendimiento el aporte puede ser menor. Escribe el rendimiento estimado para proyectarlo con interés compuesto.
        </p>
      )}
      {r && (
        <p>
          🎯 Meta de retiro estimada: <b>{usd(r.monto)}</b> ({usd(r.renta)} al mes durante {r.anios} años
          {r.faltan !== null ? `; faltan ${r.faltan} años para retirarse` : ""}). Sin contar rendimiento ni la pensión del IESS.
        </p>
      )}
      {metas.length > 1 && (
        <ol>
          {metas.map((m) => (
            <li key={m.prioridad}>
              {m.meta}
              {m.monto ? ` · ${usd(m.monto)}` : ""}
              {m.plazo ? ` · ${m.plazo.toLowerCase()}` : ""}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

const NIVEL: Record<string, string> = {
  comodo: "✅ El aporte es cómodo para su flujo.",
  exigente: `⚠️ El aporte pasa del ${APORTE_COMODO_PCT} % de lo que le sobra: puede ser exigente sostenerlo.`,
  no_alcanza: "⛔ Con estos números el aporte no le alcanza: revisa el monto o sus gastos.",
  sin_aporte: "",
};

function FondoEmergencia({ p }: { p: Prospecto }) {
  const fe = fondoEmergenciaDe(p);
  return (
    <p className="an-status resumen-fin" aria-label="Fondo de emergencia recomendado">
      🛟 <b>Recomendación:</b> un fondo de emergencia de 3 a 6 meses de{" "}
      {fe ? (
        <>
          {fe.base === "gastos" ? "sus gastos" : "su ingreso"}: entre <b>{usd(fe.min)}</b> y <b>{usd(fe.max)}</b>
        </>
      ) : (
        "sus gastos"
      )}
      , en una cuenta de fácil acceso y aparte del plan.
    </p>
  );
}

export function ResumenFlujo({ p }: { p: Prospecto }) {
  const c = capacidadDe(p);
  if (!c)
    return (
      <>
        <p className="an-note">Con el ingreso y los gastos calculo su capacidad de ahorro.</p>
        <FondoEmergencia p={p} />
      </>
    );
  return (
    <>
    <FondoEmergencia p={p} />
    <div className="an-status resumen-fin" aria-label="Capacidad de ahorro">
      <p>
        💵 Le quedan <b>{usd(c.sobrante)}</b> al mes
        {c.estimado ? " (con el punto medio de su rango de ingreso)" : ""}. Un aporte cómodo sería de hasta{" "}
        <b>{usd(c.comodo)}</b>.
      </p>
      {c.aporte !== null && c.nivel !== "sin_aporte" && (
        <p>
          Aporte de {usd(c.aporte)}
          {c.pctDelSobrante !== null ? ` = ${c.pctDelSobrante} % de lo que le sobra` : ""}. {NIVEL[c.nivel]}
        </p>
      )}
      {(pesoDeudas(p) ?? 0) > DEUDA_ALTA_PCT && (
        <p>💳 Las cuotas de deudas se llevan el {pesoDeudas(p)} % de su ingreso: conviene ordenarlas antes de un aporte grande.</p>
      )}
    </div>
    </>
  );
}

export function ResumenPerfil({ p }: { p: Prospecto }) {
  const s = puntajePerfil(p);
  return (
    <div className="an-status resumen-fin" aria-label="Perfil sugerido">
      {s.sugerido ? (
        <>
          <p>
            🧭 Perfil sugerido: <b>{s.sugerido}</b> (puntaje {s.promedio} de 3, con {s.respondidas} de {s.total} respuestas).
          </p>
          {s.diferencia && (
            <p>
              ⚠️ Se describe {s.declarado.toLowerCase()}, pero sus respuestas apuntan a {s.sugerido.toLowerCase()}: la
              estrategia usa el más prudente.
            </p>
          )}
        </>
      ) : (
        <p>
          Responde al menos 4 preguntas (incluye el plazo de la meta y si su ingreso es estable) para sugerir su perfil
          ({s.respondidas} de {s.total}).
        </p>
      )}
    </div>
  );
}

function ProyeccionAhorro({ x }: { x: ProyeccionAhorroT }) {
  return (
    <div aria-label="Proyección del ahorro">
      <p>
        🎯 Meta: <b>{usd(x.monto)}</b> a los {x.edadRetiro} años ({x.anios} años trabajando), con un rendimiento estimado de{" "}
        {x.rend}% anual.
      </p>
      {x.ahorroHoy > 0 && (
        <p>
          Su ahorro de hoy ({usd(x.ahorroHoy)}) podría llegar a <b>{usd(x.ahorroFuturo)}</b>.
        </p>
      )}
      {x.falta > 0 ? (
        <p>
          Para cubrir lo que falta ({usd(x.falta)}) necesita ahorrar cerca de <b>{usd(x.anual)} al año</b>, es decir{" "}
          <b>{usd(x.mensual)} al mes</b>.
        </p>
      ) : (
        <p>✅ Con su ahorro de hoy y ese rendimiento ya llegaría a la meta.</p>
      )}
      {x.aporte !== null && x.finalConAporte !== null && (
        <p>
          Con el aporte que plantea ({usd(x.aporte)} al mes) llegaría a <b>{usd(x.finalConAporte)}</b>
          {x.finalConAporte >= x.monto ? " ✅" : ""}.
        </p>
      )}
      <div className="proy-scroll">
        <table className="proy-tabla">
          <caption className="sr-only">Saldo estimado por año</caption>
          <thead>
            <tr>
              <th scope="col">Año</th>
              <th scope="col">Edad</th>
              <th scope="col">Con el aporte necesario</th>
              {x.aporte !== null && <th scope="col">Con su aporte</th>}
            </tr>
          </thead>
          <tbody>
            {x.puntos.map((pt) => (
              <tr key={pt.anio}>
                <th scope="row">{pt.anio}</th>
                <td>{pt.edad}</td>
                <td>{usd(pt.saldo)}</td>
                {x.aporte !== null && <td>{usd(pt.conAporte ?? 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="an-note">
        Interés compuesto anual con un rendimiento supuesto, antes de costos: no es una promesa ni está garantizado.
      </p>
    </div>
  );
}
