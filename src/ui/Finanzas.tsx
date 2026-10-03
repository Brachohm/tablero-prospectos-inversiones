/** Resúmenes calculados dentro de la ficha: metas, flujo del mes y perfil de riesgo. */
import { ahorroMetaDe, APORTE_COMODO_PCT, capacidadDe, DEUDA_ALTA_PCT, metaRetiroDe, metasDe, pesoDeudas, puntajePerfil } from "../domain/finanzas";
import { usd } from "../domain/fechas";
import { txt } from "../domain/ficha";
import type { Prospecto } from "../domain/tipos";

export function ResumenMetas({ p }: { p: Prospecto }) {
  const a = ahorroMetaDe(p);
  const r = !a && txt(p, "meta") === "Retiro o jubilación" ? metaRetiroDe(p) : null;
  const metas = metasDe(p);
  if (!a && !r && metas.length < 2) {
    if (txt(p, "metaMonto") && txt(p, "edadRetiro") && !txt(p, "edad"))
      return <p className="an-note">Escribe su edad en Datos del prospecto para calcular cuánto ahorrar.</p>;
    return null;
  }
  return (
    <div className="an-status resumen-fin" aria-label="Resumen de metas">
      {a && (
        <p>
          🎯 Para contar con <b>{usd(a.monto)}</b> a los {a.edadRetiro} años le quedan <b>{a.anios} años</b> trabajando: necesita
          ahorrar cerca de <b>{usd(a.anual)} al año</b>, es decir <b>{usd(a.mensual)} al mes</b>. Sin contar rendimiento: con
          rendimiento el aporte puede ser menor.
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

export function ResumenFlujo({ p }: { p: Prospecto }) {
  const c = capacidadDe(p);
  if (!c) return <p className="an-note">Con el ingreso y los gastos calculo su capacidad de ahorro.</p>;
  return (
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
